// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createHmac } from 'node:crypto';

vi.mock('@supabase/supabase-js', () => {
  const rpc = vi.fn(async (fn: string) => {
    if (fn === 'verify_razorpay_payment') {
      return { data: { registration_no: 'TKPL-2026-0101', receipt_no: 'TKPL-RCPT-2026-0001' }, error: null };
    }
    return { data: null, error: null };
  });
  const from = () => {
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.update = () => chain;
    chain.eq = () => chain;
    return chain;
  };
  return { createClient: () => ({ rpc, from, auth: {} }) };
});

import { verifyRazorpayWebhookSignature } from '../api/_lib/razorpay';
import { createWebhookHandler } from '../api/razorpay/webhook';
import type { ApiRequest, ApiResponse } from '../api/_lib/http';

function createMockRes() {
  const res: any = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key: string, value: string) {
      res.headers[key.toLowerCase()] = value;
      return res;
    },
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(payload: unknown) {
      res.body = payload;
      return res;
    },
  };
  return res as ApiResponse & { statusCode: number; body: any };
}

describe('Razorpay Webhook signature verification', () => {
  const secret = 'webhook_test_secret_123';
  const body = JSON.stringify({ event: 'payment.captured', payload: {} });

  it('verifies a valid webhook HMAC signature', () => {
    const signature = createHmac('sha256', secret).update(body).digest('hex');
    expect(verifyRazorpayWebhookSignature({ rawBody: body, signature, webhookSecret: secret })).toBe(true);
  });

  it('rejects an invalid webhook HMAC signature', () => {
    const badSignature = 'invalid_hex_signature';
    expect(verifyRazorpayWebhookSignature({ rawBody: body, signature: badSignature, webhookSecret: secret })).toBe(false);
  });

  it('fails closed with 503 if RAZORPAY_WEBHOOK_SECRET is not configured', async () => {
    const handler = createWebhookHandler({
      env: {
        RAZORPAY_KEY_ID: 'rzp_test_123',
        RAZORPAY_KEY_SECRET: 'secret_123',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'srv_key',
        // RAZORPAY_WEBHOOK_SECRET is omitted
      },
    });

    const req = {
      method: 'POST',
      headers: { 'x-razorpay-signature': 'some_sig' },
      body: { event: 'payment.captured' },
    } as unknown as ApiRequest;

    const res = createMockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(503);
    expect(res.body.error).toBe('SERVER_MISCONFIGURED');
  });

  it('rejects with 400 if signature header is missing', async () => {
    const handler = createWebhookHandler({
      env: {
        RAZORPAY_KEY_ID: 'rzp_test_123',
        RAZORPAY_KEY_SECRET: 'secret_123',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'srv_key',
        RAZORPAY_WEBHOOK_SECRET: secret,
      },
    });

    const req = {
      method: 'POST',
      headers: {},
      body,
    } as unknown as ApiRequest;

    const res = createMockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('INVALID_SIGNATURE');
  });

  it('rejects with 400 if signature is invalid', async () => {
    const handler = createWebhookHandler({
      env: {
        RAZORPAY_KEY_ID: 'rzp_test_123',
        RAZORPAY_KEY_SECRET: 'secret_123',
        SUPABASE_URL: 'https://example.supabase.co',
        SUPABASE_SERVICE_ROLE_KEY: 'srv_key',
        RAZORPAY_WEBHOOK_SECRET: secret,
      },
    });

    const req = {
      method: 'POST',
      headers: { 'x-razorpay-signature': 'invalid_sig' },
      body,
    } as unknown as ApiRequest;

    const res = createMockRes();
    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('INVALID_SIGNATURE');
  });
});
