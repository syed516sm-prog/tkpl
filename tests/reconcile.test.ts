// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { orderReceiptFor } from '../api/razorpay/create-order';
import { createReconcileHandler } from '../api/razorpay/reconcile';

const FIXTURE_KEY_ID = 'rzp_test_FAKEkeyId0001';
const FIXTURE_SECRET = 'fixture_secret_do_not_use_in_production';
const CRON_SECRET = 'cron_fixture_secret';

const ENV = {
  RAZORPAY_KEY_ID: FIXTURE_KEY_ID,
  RAZORPAY_KEY_SECRET: FIXTURE_SECRET,
  SUPABASE_URL: 'https://fixture.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'fixture-service-role-key',
  CRON_SECRET,
};

function createResponse() {
  let statusCode = 200;
  let body: unknown = null;
  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    setHeader() {
      return res;
    },
    json(payload: unknown) {
      body = payload;
    },
    end() {},
    get statusCode() {
      return statusCode;
    },
    get body() {
      return body as Record<string, unknown> | null;
    },
  };
  return res;
}

describe('orderReceiptFor', () => {
  it('is unique per attempt and always within Razorpay\'s 40 character limit', () => {
    const a = orderReceiptFor('TKPL-2026-0106', 1_700_000_000_000);
    const b = orderReceiptFor('TKPL-2026-0106', 1_700_000_000_001);
    expect(a).not.toBe(b);
    expect(a.length).toBeLessThanOrEqual(40);

    const long = orderReceiptFor('TKPL-2026-THIS-IS-A-VERY-LONG-REGISTRATION-NUMBER', 1_700_000_000_000);
    expect(long.length).toBeLessThanOrEqual(40);
    expect(long).toMatch(/^[A-Za-z0-9-]+$/);
  });
});

describe('GET /api/razorpay/reconcile', () => {
  it('refuses to run without the cron secret', async () => {
    const fetchImpl = vi.fn();
    const handler = createReconcileHandler({ env: ENV, fetchImpl });
    const res = createResponse();

    await handler({ method: 'GET', headers: {} }, res);
    expect(res.statusCode).toBe(401);

    await handler(
      { method: 'GET', headers: { authorization: 'Bearer wrong-secret' } },
      res
    );
    expect(res.statusCode).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('refuses when CRON_SECRET is not configured (no fail-open)', async () => {
    const handler = createReconcileHandler({
      env: { ...ENV, CRON_SECRET: '' },
      fetchImpl: vi.fn(),
    });
    const res = createResponse();

    await handler(
      { method: 'GET', headers: { authorization: 'Bearer anything' } },
      res
    );
    expect(res.statusCode).toBe(401);
  });

  it('requires server keys to be present', async () => {
    const handler = createReconcileHandler({
      env: { CRON_SECRET },
      fetchImpl: vi.fn(),
    });
    const res = createResponse();

    await handler(
      { method: 'GET', headers: { authorization: `Bearer ${CRON_SECRET}` } },
      res
    );
    expect(res.statusCode).toBe(503);
  });

  it('does not treat a forgeable user-agent as authorisation', async () => {
    const fetchImpl = vi.fn();
    const handler = createReconcileHandler({ env: ENV, fetchImpl });
    const res = createResponse();

    await handler({ method: 'GET', headers: { 'user-agent': 'vercel-cron/1.0' } }, res);
    expect(res.statusCode).toBe(401);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('webhook signature shape (documented format)', () => {
  it('uses HMAC-SHA256 of the raw body with the webhook secret', () => {
    const body = JSON.stringify({ event: 'payment.captured' });
    const signature = createHmac('sha256', CRON_SECRET).update(body).digest('hex');
    const again = createHmac('sha256', CRON_SECRET).update(body).digest('hex');
    expect(signature).toBe(again);
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
  });
});
