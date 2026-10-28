// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// The verify handler asks Supabase for the order it stored before it validates
// the signature (docs: sign with the server-side order id). Stub it here.
vi.mock('@supabase/supabase-js', () => {
  const rpc = vi.fn(async (fn: string, args?: Record<string, unknown>) => {
    if (fn === 'razorpay_order_for_payment') {
      // Mirrors the DB: only orders this server stored are known.
      if (args?.p_order_id !== 'order_FIXTURE0001') return { data: null, error: null };
      return { data: { order_id: 'order_FIXTURE0001', registration_no: 'TKPL-2026-0106', status: 'pending' }, error: null };
    }
    if (fn === 'verify_razorpay_payment') {
      return { data: { registration_no: 'TKPL-2026-0106', receipt_no: 'TKPL-RCPT-2026-0001' }, error: null };
    }
    if (fn === 'get_receipt') {
      return { data: { receipt_no: 'TKPL-RCPT-2026-0001', registration_no: 'TKPL-2026-0106' }, error: null };
    }
    return { data: null, error: null };
  });
  const from = () => {
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.maybeSingle = async () => ({
      data: { registration_no: 'TKPL-2026-0106', phone: '9885012345', date_of_birth: '2001-05-12' },
      error: null,
    });
    return chain;
  };
  return { createClient: () => ({ rpc, from, auth: {} }) };
});
import { createHmac } from 'node:crypto';
import { verifyRazorpaySignature } from '../api/_lib/razorpay';
import { createVerifyPaymentHandler } from '../api/razorpay/verify-payment';

/** Fixture credentials only — never a real Razorpay key. */
const FIXTURE_KEY_ID = 'rzp_test_FAKEkeyId0001';
const FIXTURE_SECRET = 'fixture_secret_do_not_use_in_production';

const ORDER_ID = 'order_FIXTURE0001';
const PAYMENT_ID = 'pay_FIXTURE0001';

const ENV = {
  RAZORPAY_KEY_ID: FIXTURE_KEY_ID,
  RAZORPAY_KEY_SECRET: FIXTURE_SECRET,
  SUPABASE_URL: 'https://fixture.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'fixture-service-role-key',
};

function sign(orderId: string, paymentId: string, secret = FIXTURE_SECRET): string {
  return createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

// The handler rejects on any Supabase error, so upstream must answer like
// Razorpay would for a captured payment on the right order.
const upstreamFetch = vi.fn(async (input: RequestInfo | URL) => {
  const url = String(input);
  if (url.endsWith(`/orders/${ORDER_ID}`)) {
    return new Response(
      JSON.stringify({ id: ORDER_ID, amount: 39900, currency: 'INR', status: 'paid' }),
      { status: 200 }
    );
  }
  if (url.endsWith(`/payments/${PAYMENT_ID}`)) {
    return new Response(
      JSON.stringify({
        id: PAYMENT_ID,
        order_id: ORDER_ID,
        amount: 39900,
        currency: 'INR',
        status: 'captured',
        method: 'upi',
      }),
      { status: 200 }
    );
  }
  return new Response(JSON.stringify({ error: { description: 'not found' } }), { status: 404 });
});

function createResponse() {
  let statusCode = 200;
  let body: unknown = null;
  const headers: Record<string, string | string[]> = {};
  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    setHeader(name: string, value: string | string[]) {
      headers[name] = value;
      return res;
    },
    json(payload: unknown) {
      body = payload;
    },
    end() {
      // no-op
    },
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body as Record<string, unknown> | null;
    },
    get headers() {
      return headers;
    },
  };
  return res;
}

describe('Razorpay HMAC verification', () => {
  it('accepts a valid signature', () => {
    expect(
      verifyRazorpaySignature({
        orderId: ORDER_ID,
        paymentId: PAYMENT_ID,
        signature: sign(ORDER_ID, PAYMENT_ID),
        keySecret: FIXTURE_SECRET,
      })
    ).toBe(true);
  });

  it('rejects a tampered signature', () => {
    const good = sign(ORDER_ID, PAYMENT_ID);
    const tampered = `${good.slice(0, -1)}${good.endsWith('0') ? '1' : '0'}`;
    expect(
      verifyRazorpaySignature({
        orderId: ORDER_ID,
        paymentId: PAYMENT_ID,
        signature: tampered,
        keySecret: FIXTURE_SECRET,
      })
    ).toBe(false);
  });

  it('rejects a signature made with the wrong secret', () => {
    expect(
      verifyRazorpaySignature({
        orderId: ORDER_ID,
        paymentId: PAYMENT_ID,
        signature: sign(ORDER_ID, PAYMENT_ID, 'some_other_secret'),
        keySecret: FIXTURE_SECRET,
      })
    ).toBe(false);
  });

  it('rejects when the order or payment id was swapped after signing', () => {
    const signature = sign(ORDER_ID, PAYMENT_ID);
    expect(
      verifyRazorpaySignature({
        orderId: 'order_SWAPPED',
        paymentId: PAYMENT_ID,
        signature,
        keySecret: FIXTURE_SECRET,
      })
    ).toBe(false);
    expect(
      verifyRazorpaySignature({
        orderId: ORDER_ID,
        paymentId: 'pay_SWAPPED',
        signature,
        keySecret: FIXTURE_SECRET,
      })
    ).toBe(false);
  });

  it('rejects malformed and empty input without throwing', () => {
    expect(
      verifyRazorpaySignature({
        orderId: ORDER_ID,
        paymentId: PAYMENT_ID,
        signature: 'short',
        keySecret: FIXTURE_SECRET,
      })
    ).toBe(false);
    expect(
      verifyRazorpaySignature({ orderId: '', paymentId: '', signature: '', keySecret: '' })
    ).toBe(false);
  });
});

describe('POST /api/razorpay/verify-payment', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', upstreamFetch);
    upstreamFetch.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('verifies a captured payment, returning the receipt for the player', async () => {
    const handler = createVerifyPaymentHandler({ env: ENV, fetchImpl: upstreamFetch });
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: {},
        body: {
          razorpay_order_id: ORDER_ID,
          razorpay_payment_id: PAYMENT_ID,
          razorpay_signature: sign(ORDER_ID, PAYMENT_ID),
        },
      },
      res
    );

    expect(res.statusCode).toBe(200);
    const receipt = res.body?.receipt as Record<string, unknown> | undefined;
    expect(receipt?.receipt_no).toBe('TKPL-RCPT-2026-0001');

    // Docs step 6: status is checked against the Razorpay APIs, not the browser.
    const urls = upstreamFetch.mock.calls.map(([input]) => String(input));
    expect(urls.some((url) => url.endsWith(`/orders/${ORDER_ID}`))).toBe(true);
    expect(urls.some((url) => url.endsWith(`/payments/${PAYMENT_ID}`))).toBe(true);
  });

  it('refuses an order id this server never issued', async () => {
    const handler = createVerifyPaymentHandler({ env: ENV, fetchImpl: upstreamFetch });
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: {},
        body: {
          razorpay_order_id: 'order_NOT_OURS',
          razorpay_payment_id: PAYMENT_ID,
          razorpay_signature: sign('order_NOT_OURS', PAYMENT_ID),
        },
      },
      res
    );

    expect(res.statusCode).toBe(404);
    expect(res.body?.error).toBe('NOT_FOUND');
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('rejects a tampered signature with 400 and never calls Razorpay', async () => {
    const handler = createVerifyPaymentHandler({ env: ENV, fetchImpl: upstreamFetch });
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: {},
        body: {
          razorpay_order_id: ORDER_ID,
          razorpay_payment_id: PAYMENT_ID,
          razorpay_signature: 'f'.repeat(64),
        },
      },
      res
    );

    expect(res.statusCode).toBe(400);
    expect(res.body?.error).toBe('SIGNATURE_MISMATCH');
    expect(upstreamFetch).not.toHaveBeenCalled();
  });

  it('returns 503 when the server keys are missing', async () => {
    const handler = createVerifyPaymentHandler({ env: {}, fetchImpl: upstreamFetch });
    const res = createResponse();

    await handler({ method: 'POST', headers: {}, body: {} }, res);

    expect(res.statusCode).toBe(503);
    expect(res.body?.error).toBe('SERVER_MISCONFIGURED');
  });

  it('rejects a valid signature when the payment is not captured', async () => {
    const notCaptured = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith(`/orders/${ORDER_ID}`)) {
        return new Response(
          JSON.stringify({ id: ORDER_ID, amount: 39900, currency: 'INR', status: 'created' }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          id: PAYMENT_ID,
          order_id: ORDER_ID,
          amount: 39900,
          currency: 'INR',
          status: 'authorized',
        }),
        { status: 200 }
      );
    });

    const handler = createVerifyPaymentHandler({ env: ENV, fetchImpl: notCaptured });
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: {},
        body: {
          razorpay_order_id: ORDER_ID,
          razorpay_payment_id: PAYMENT_ID,
          razorpay_signature: sign(ORDER_ID, PAYMENT_ID),
        },
      },
      res
    );

    expect(res.statusCode).toBe(409);
    expect(res.body?.error).toBe('PAYMENT_NOT_CAPTURED');
  });

  it('rejects a captured payment whose amount does not match the order', async () => {
    const wrongAmount = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith(`/orders/${ORDER_ID}`)) {
        return new Response(
          JSON.stringify({ id: ORDER_ID, amount: 39900, currency: 'INR', status: 'paid' }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          id: PAYMENT_ID,
          order_id: ORDER_ID,
          amount: 100,
          currency: 'INR',
          status: 'captured',
        }),
        { status: 200 }
      );
    });

    const handler = createVerifyPaymentHandler({ env: ENV, fetchImpl: wrongAmount });
    const res = createResponse();

    await handler(
      {
        method: 'POST',
        headers: {},
        body: {
          razorpay_order_id: ORDER_ID,
          razorpay_payment_id: PAYMENT_ID,
          razorpay_signature: sign(ORDER_ID, PAYMENT_ID),
        },
      },
      res
    );

    expect(res.statusCode).toBe(409);
    expect(res.body?.error).toBe('AMOUNT_MISMATCH');
  });
});
