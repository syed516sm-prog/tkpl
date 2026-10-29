// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { createGetReceiptHandler } from '../api/razorpay/get-receipt';
import type { ApiRequest, ApiResponse } from '../api/_lib/http';

const mockPlayer = {
  id: 'plr_123',
  registration_no: 'TKPL-2026-0101',
  full_name: 'Syed Mansoor',
  locality: 'Kadapa',
  role: 'all_rounder',
  photo_path: 'registrations/photo123.jpg',
  created_at: '2026-10-29T11:15:17.000Z',
};

const mockPayment = {
  amount_paise: 39900,
  currency: 'INR',
  receipt_no: 'TKPL-RCPT-2026-0001',
  paid_at: '2026-10-29T11:16:04.000Z',
  razorpay_payment_id: 'pay_123',
  razorpay_handler: 'upi',
  razorpay_mode: 'live',
  status: 'verified',
};

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: () => ({
      from: (table: string) => {
        const chain: Record<string, unknown> = {};
        chain.select = () => chain;
        chain.eq = (field: string, val: unknown) => {
          (chain as any)[`eq_${field}`] = val;
          return chain;
        };
        chain.not = () => chain;
        chain.order = () => chain;
        chain.maybeSingle = async () => {
          if (table === 'players') {
            if ((chain as any).eq_registration_no === 'TKPL-2026-0101') {
              return { data: mockPlayer, error: null };
            }
            return { data: null, error: null };
          }
          if (table === 'payments') {
            if ((chain as any).eq_player_id === 'plr_123') {
              return { data: mockPayment, error: null };
            }
            return { data: null, error: null };
          }
          return { data: null, error: null };
        };
        return chain;
      },
      storage: {
        from: () => ({
          getPublicUrl: (path: string) => ({
            data: { publicUrl: `https://fixture.supabase.co/storage/v1/object/public/player-photos/${path}` },
          }),
        }),
      },
    }),
  };
});

const ENV = {
  RAZORPAY_KEY_ID: 'rzp_test_fixture',
  RAZORPAY_KEY_SECRET: 'fixture_secret',
  SUPABASE_URL: 'https://fixture.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'fixture-service-role-key',
};

function createMockRes(): { res: ApiResponse; getStatus: () => number; getBody: () => any } {
  let statusCode = 200;
  let responseBody: any = null;
  const res = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(body: any) {
      responseBody = body;
      return res;
    },
    setHeader: vi.fn(),
  } as unknown as ApiResponse;

  return {
    res,
    getStatus: () => statusCode,
    getBody: () => responseBody,
  };
}

describe('POST /api/razorpay/get-receipt', () => {
  const handler = createGetReceiptHandler({ env: ENV });

  it('rejects non-POST method with 405', async () => {
    const { res, getStatus } = createMockRes();
    const req = { method: 'GET', body: null } as ApiRequest;
    await handler(req, res);
    expect(getStatus()).toBe(405);
  });

  it('rejects incomplete credentials with 400', async () => {
    const { res, getStatus, getBody } = createMockRes();
    const req = {
      method: 'POST',
      body: { registration_no: 'TKPL-2026-0101', phone: '' },
    } as ApiRequest;
    await handler(req, res);
    expect(getStatus()).toBe(400);
    expect(getBody()?.error).toBe('INVALID_REQUEST');
  });

  it('rejects unknown player registration with 404', async () => {
    const { res, getStatus, getBody } = createMockRes();
    const req = {
      method: 'POST',
      body: { registration_no: 'TKPL-UNKNOWN', phone: '9160714500', date_of_birth: '1993-05-19' },
    } as ApiRequest;
    await handler(req, res);
    expect(getStatus()).toBe(404);
    expect(getBody()?.error).toBe('NOT_FOUND');
  });

  it('returns 200 with full receipt and resolved photo URL for verified player', async () => {
    const { res, getStatus, getBody } = createMockRes();
    const req = {
      method: 'POST',
      body: { registration_no: 'TKPL-2026-0101', phone: '9160714500', date_of_birth: '1993-05-19' },
    } as ApiRequest;
    await handler(req, res);
    expect(getStatus()).toBe(200);
    const receipt = getBody()?.receipt;
    expect(receipt).toBeDefined();
    expect(receipt.receipt_no).toBe('TKPL-RCPT-2026-0001');
    expect(receipt.registration_no).toBe('TKPL-2026-0101');
    expect(receipt.full_name).toBe('Syed Mansoor');
    expect(receipt.photo_url).toBe(
      'https://fixture.supabase.co/storage/v1/object/public/player-photos/registrations/photo123.jpg'
    );
  });
});
