// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createPublicStatsHandler } from '../api/public-stats';
import type { ApiRequest, ApiResponse } from '../api/_lib/http';

function createMockResponse() {
  const state = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: null as any,
  };

  const res: ApiResponse = {
    status(code: number) {
      state.statusCode = code;
      return res;
    },
    setHeader(name: string, value: string | string[]) {
      state.headers[name] = Array.isArray(value) ? value.join(', ') : value;
      return res;
    },
    json(payload: unknown) {
      state.body = payload;
    },
    end() {},
  };

  return { res, state };
}

describe('GET /api/public-stats handler', () => {
  it('rejects non-GET requests with 405 Method Not Allowed', async () => {
    const handler = createPublicStatsHandler();
    const { res, state } = createMockResponse();
    const req: ApiRequest = { method: 'POST', headers: {} };

    await handler(req, res);
    expect(state.statusCode).toBe(405);
    expect(state.headers['Allow']).toBe('GET');
  });

  it('returns stats successfully from RPC if available', async () => {
    const mockSupabase = {
      rpc: async (fn: string) => {
        if (fn === 'get_public_stats') {
          return {
            data: {
              registered_count: 3,
              confirmed_count: 2,
              auction_eligible_count: 2,
            },
            error: null,
          };
        }
        return { data: null, error: new Error('Unknown RPC') };
      },
    };

    const handler = createPublicStatsHandler({ supabaseClient: mockSupabase });
    const { res, state } = createMockResponse();
    const req: ApiRequest = { method: 'GET', headers: {} };

    await handler(req, res);
    expect(state.statusCode).toBe(200);
    expect(state.body).toEqual({
      registered_count: 3,
      confirmed_count: 2,
      auction_eligible_count: 2,
    });
  });

  it('falls back to direct table counts if RPC returns null or error', async () => {
    const mockSupabase = {
      rpc: async () => ({ data: null, error: new Error('RPC not found') }),
      from: (table: string) => ({
        select: (cols: string) => {
          if (table === 'players') {
            return Promise.resolve({
              data: [
                { id: '1', auction_status: 'eligible' },
                { id: '2', auction_status: 'not_reviewed' },
              ],
              error: null,
            });
          }
          if (table === 'payments') {
            return {
              eq: (field: string, val: string) =>
                Promise.resolve({
                  data: [{ id: 'pay_1' }],
                  error: null,
                }),
            };
          }
          return Promise.resolve({ data: [], error: null });
        },
      }),
    };

    const handler = createPublicStatsHandler({ supabaseClient: mockSupabase });
    const { res, state } = createMockResponse();
    const req: ApiRequest = { method: 'GET', headers: {} };

    await handler(req, res);
    expect(state.statusCode).toBe(200);
    expect(state.body).toEqual({
      registered_count: 2,
      confirmed_count: 1,
      auction_eligible_count: 1,
    });
  });
});
