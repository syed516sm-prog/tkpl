import type { ReceiptPayload, SafeStatusLookupResult } from '../types/tkpl';

export interface CreateOrderResponse {
  order_id: string;
  amount_paise: number;
  currency: string;
  key_id: string;
  prefill: { name: string; contact: string };
  /** Earlier, unpaid orders for this player that the new order superseded. */
  replaced_order_ids?: string[];
}

export interface VerifyPaymentResponse {
  receipt: ReceiptPayload;
  receipt_no: string;
  registration_no: string;
}

export interface PaymentApiError {
  error: string;
  message: string;
  details?: unknown;
}

export interface GatewayHealth {
  configured: boolean;
}

/** Is online payment live on this deployment? Reveals nothing else. */
export async function fetchPaymentGatewayHealth(): Promise<GatewayHealth> {
  try {
    const response = await fetch('/api/razorpay/health');
    if (!response.ok) throw new Error('health check failed');
    const payload = (await response.json()) as Partial<GatewayHealth>;
    return { configured: payload.configured === true };
  } catch {
    return { configured: false };
  }
}

export class PaymentRequestError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.name = 'PaymentRequestError';
    this.code = code;
    this.status = status;
  }
}

/** Human copy for every error the payment API can return. */
export const PAYMENT_ERROR_MESSAGES: Record<string, string> = {
  ALREADY_PAID:
    'This registration fee is already paid. Open Check Status to view or download your receipt.',
  NOT_FOUND:
    'We could not match that Registration Number, Mobile Number and Date of Birth. Please re-check them.',
  SIGNATURE_MISMATCH:
    'We could not confirm this payment. Your money is safe with Razorpay — retry, or contact the organizers with your payment id.',
  PAYMENT_NOT_CAPTURED:
    'Your slot is held. Razorpay has not captured the payment yet — wait a few seconds and press Pay again; the receipt will follow automatically.',
  PAYMENT_NOT_FOUND: 'Razorpay does not recognise this payment id. Please retry the payment.',
  AMOUNT_MISMATCH:
    'The amount Razorpay captured does not match the ₹399 registration fee, so the receipt cannot be issued. Contact the organizers with your Razorpay payment id.',
  RECEIPT_NOT_READY:
    'The payment is recorded but the receipt is still being generated. Retry confirmation in a moment.',
  SERVER_MISCONFIGURED:
    'Online payments are not configured on the server yet. Contact the organizers (Sultan Sports / NR Sports).',
  DEPENDENCY_UNAVAILABLE:
    'The payment service or database did not respond. Your money is safe — press Retry confirmation.',
  RAZORPAY_UNAVAILABLE: 'Razorpay is not reachable right now. Please retry in a minute.',
  INVALID_REQUEST: 'The payment request was rejected. Reload the page and try again.',
};

/**
 * Copy for Razorpay's checkout failure reasons (see the Cards/UPI error tables).
 * Returns null for codes we have no specific advice for.
 */
const RAZORPAY_REASON_HINTS: Record<string, string> = {
  payment_timed_out: 'The payment window timed out. Pay again whenever you are ready.',
  payment_cancelled: 'The payment was cancelled before it finished. Pay again whenever you are ready.',
  authentication_failed: 'The bank verification (OTP) did not complete. Retry and enter the OTP carefully.',
  insufficient_funds: 'The bank account did not have enough balance. Try another card, UPI or bank account.',
  incorrect_cvv: 'The CVV entered was incorrect. Try again with the 3-digit code on the card back.',
  card_declined: 'The bank declined the card. Try another card or pay by UPI.',
  payment_failed: 'The bank declined the payment. Try another card or pay by UPI.',
  payment_risk_check_failed: 'The bank blocked the payment as a risk check. Try another card or pay by UPI.',
  card_expired: 'The card has expired. Use a different card.',
  card_not_enrolled: 'The card is not enabled for online payments. Enable it in the bank app or use another method.',
  card_disabled_for_online_payments:
    'The card is not enabled for online payments. Enable it in the bank app or use another method.',
  transaction_limit_exceeded: 'The daily transaction limit on this card was reached. Try another card.',
  gateway_technical_error: 'A bank or gateway hiccup interrupted the payment. Nothing was deducted — pay again.',
  bank_technical_error: 'Your bank had a temporary problem. Nothing was deducted — pay again or use another bank.',
  order_already_paid: 'This order already has a successful payment. Open Check Status to view the receipt.',
  bad_request_error: 'Razorpay rejected the request. Reload the page and pay again.',
};

/** The failure copy shown under the Pay button after a Razorpay modal failure. */
export function razorpayFailureMessage(code: string | undefined, description: string): string {
  const key = (code ?? '').toLowerCase();
  const hint = RAZORPAY_REASON_HINTS[key];
  const detail = description.trim();
  const base = hint ?? (detail ? `Razorpay reported: ${detail}.` : 'The payment did not go through.');
  return `${base} Your registration is saved — press Pay again to retry, no form filling needed.`;
}

export function friendlyPaymentError(
  code: string | undefined,
  fallback = 'Something went wrong while starting the payment. Please retry.'
): string {
  if (!code) return fallback;
  return PAYMENT_ERROR_MESSAGES[code] ?? fallback;
}

/** The player-facing "complete your payment" prompt. */
export function buildPayPrompt(registrationNo: string, fee: string): string {
  return `Your registration is saved as ${registrationNo}. Complete the ${fee} payment to confirm your slot.`;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new PaymentRequestError(
      'DEPENDENCY_UNAVAILABLE',
      PAYMENT_ERROR_MESSAGES.DEPENDENCY_UNAVAILABLE,
      0
    );
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const errorBody = (payload ?? {}) as Partial<PaymentApiError>;
    const code = typeof errorBody.error === 'string' ? errorBody.error : 'INVALID_REQUEST';
    const message =
      typeof errorBody.message === 'string' && errorBody.message
        ? errorBody.message
        : friendlyPaymentError(code);
    throw new PaymentRequestError(code, message, response.status);
  }

  return payload as T;
}

export async function createRazorpayOrder(params: {
  registration_no: string;
  phone: string;
  date_of_birth: string;
}): Promise<CreateOrderResponse> {
  return postJson<CreateOrderResponse>('/api/razorpay/create-order', params);
}

export async function verifyRazorpayPayment(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<VerifyPaymentResponse> {
  return postJson<VerifyPaymentResponse>('/api/razorpay/verify-payment', params);
}

/**
 * Reuses the status lookup to decide which action the player gets: pay,
 * retry confirmation, or open the receipt.
 */
export function nextPaymentAction(status: SafeStatusLookupResult['payment_status']): 
  | 'pay'
  | 'receipt'
  | 'blocked' {
  if (status === 'verified') return 'receipt';
  if (status === 'refunded') return 'blocked';
  return 'pay';
}
