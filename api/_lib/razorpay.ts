import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Razorpay helpers built on plain `fetch` (Node 18+ on Vercel), so no SDK is
 * added to package.json.
 */

const RAZORPAY_BASE = 'https://api.razorpay.com/v1';

export function basicAuthHeader(keyId: string, keySecret: string): string {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`;
}

/**
 * HMAC_SHA256(order_id + '|' + payment_id, key_secret), compared with a
 * constant-time equality so a wrong signature cannot be brute-forced by timing.
 */
export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  const { orderId, paymentId, signature, keySecret } = params;
  if (!orderId || !paymentId || !signature || !keySecret) return false;

  const expected = createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(signature.trim().toLowerCase(), 'utf8');
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

/**
 * Validates a Razorpay webhook signature against the configured webhook secret.
 */
export function verifyRazorpayWebhookSignature(params: {
  rawBody: string;
  signature: string;
  webhookSecret: string;
}): boolean {
  const { rawBody, signature, webhookSecret } = params;
  if (!rawBody || !signature || !webhookSecret) return false;

  const expected = createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'utf8');
  const actualBuf = Buffer.from(signature.trim().toLowerCase(), 'utf8');
  if (expectedBuf.length !== actualBuf.length) return false;
  return timingSafeEqual(expectedBuf, actualBuf);
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
  receipt?: string;
}

export interface RazorpayPayment {
  id: string;
  order_id: string | null;
  amount: number;
  currency: string;
  status: string;
  captured?: boolean;
  method?: string;
}

export class RazorpayRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'RazorpayRequestError';
    this.status = status;
  }
}

async function razorpayFetch<T>(
  path: string,
  init: { keyId: string; keySecret: string; method?: string; body?: unknown; fetchImpl?: typeof fetch }
): Promise<T> {
  const doFetch = init.fetchImpl ?? fetch;
  let response: Response;
  try {
    response = await doFetch(`${RAZORPAY_BASE}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Authorization: basicAuthHeader(init.keyId, init.keySecret),
        'Content-Type': 'application/json',
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new RazorpayRequestError('Razorpay is unreachable.', 0);
  }

  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const description =
      (payload as { error?: { description?: string } } | null)?.error?.description ??
      `Razorpay returned ${response.status}.`;
    throw new RazorpayRequestError(description, response.status);
  }
  return payload as T;
}

export async function createOrder(params: {
  keyId: string;
  keySecret: string;
  amountPaise: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
  fetchImpl?: typeof fetch;
}): Promise<RazorpayOrder> {
  return razorpayFetch<RazorpayOrder>('/orders', {
    keyId: params.keyId,
    keySecret: params.keySecret,
    method: 'POST',
    body: {
      amount: params.amountPaise,
      currency: params.currency,
      receipt: params.receipt,
      notes: params.notes,
    },
    fetchImpl: params.fetchImpl,
  });
}

export async function fetchPayment(params: {
  keyId: string;
  keySecret: string;
  paymentId: string;
  fetchImpl?: typeof fetch;
}): Promise<RazorpayPayment> {
  return razorpayFetch<RazorpayPayment>(`/payments/${encodeURIComponent(params.paymentId)}`, {
    keyId: params.keyId,
    keySecret: params.keySecret,
    fetchImpl: params.fetchImpl,
  });
}

export async function fetchOrder(params: {
  keyId: string;
  keySecret: string;
  orderId: string;
  fetchImpl?: typeof fetch;
}): Promise<RazorpayOrder> {
  return razorpayFetch<RazorpayOrder>(`/orders/${encodeURIComponent(params.orderId)}`, {
    keyId: params.keyId,
    keySecret: params.keySecret,
    fetchImpl: params.fetchImpl,
  });
}

export async function fetchOrderPayments(params: {
  keyId: string;
  keySecret: string;
  orderId: string;
  fetchImpl?: typeof fetch;
}): Promise<RazorpayPayment[]> {
  const result = await razorpayFetch<{ entity: string; count: number; items: RazorpayPayment[] }>(
    `/orders/${encodeURIComponent(params.orderId)}/payments`,
    {
      keyId: params.keyId,
      keySecret: params.keySecret,
      fetchImpl: params.fetchImpl,
    }
  );
  return Array.isArray(result?.items) ? result.items : [];
}
