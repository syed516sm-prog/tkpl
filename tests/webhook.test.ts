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
});
