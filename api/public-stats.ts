import type { ApiRequest, ApiResponse } from './_lib/http.js';
import { readServerConfig } from './_lib/config.js';
import { errorMessage, supabaseAdmin } from './_lib/supabaseAdmin.js';

export interface PublicStatsDeps {
  env?: Record<string, string | undefined>;
  supabaseClient?: any;
}

/**
 * GET /api/public-stats
 *
 * Publicly accessible tournament counter that returns aggregated player and
 * confirmed entry numbers without exposing any personal player information.
 */
export function createPublicStatsHandler(deps: PublicStatsDeps = {}) {
  return async function handler(req: ApiRequest, res: ApiResponse) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      res.status(405).json({ error: 'METHOD_NOT_ALLOWED', message: 'Only GET is allowed.' });
      return;
    }

    const result = readServerConfig(deps.env);
    if (!deps.supabaseClient && !result.ok) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(503).json({
        error: 'CONFIG_MISSING',
        message: 'Server configuration is missing.',
        registered_count: 0,
        confirmed_count: 0,
        auction_eligible_count: 0,
      });
      return;
    }

    const supabase =
      deps.supabaseClient ??
      (result.ok ? supabaseAdmin(result.config.supabaseUrl, result.config.supabaseServiceRoleKey) : null);

    if (!supabase) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(503).json({
        error: 'CONFIG_MISSING',
        message: 'Server configuration is missing.',
        registered_count: 0,
        confirmed_count: 0,
        auction_eligible_count: 0,
      });
      return;
    }

    try {
      // 1. First try the dedicated get_public_stats RPC
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_public_stats');
      if (!rpcError && rpcData && typeof rpcData === 'object') {
        const row = rpcData as Record<string, unknown>;
        const registered = Number(row.registered_count ?? 0);
        const confirmed = Number(row.confirmed_count ?? row.auction_eligible_count ?? registered);
        const eligible = Number(row.auction_eligible_count ?? confirmed);

        res.setHeader('Cache-Control', 'public, max-age=10, s-maxage=15, stale-while-revalidate=30');
        res.status(200).json({
          registered_count: registered,
          confirmed_count: confirmed,
          auction_eligible_count: eligible,
        });
        return;
      }

      // 2. Direct count fallback using the service-role client
      const [playersRes, paymentsRes] = await Promise.all([
        supabase.from('players').select('id, auction_status'),
        supabase.from('payments').select('id').eq('status', 'verified'),
      ]);

      const registered = Array.isArray(playersRes.data) ? playersRes.data.length : 0;
      const eligible = Array.isArray(playersRes.data)
        ? playersRes.data.filter((p: any) => p?.auction_status === 'eligible').length
        : 0;
      const confirmed = Array.isArray(paymentsRes.data) ? paymentsRes.data.length : eligible;

      res.setHeader('Cache-Control', 'public, max-age=10, s-maxage=15, stale-while-revalidate=30');
      res.status(200).json({
        registered_count: registered,
        confirmed_count: confirmed,
        auction_eligible_count: eligible,
      });
    } catch (err) {
      res.setHeader('Cache-Control', 'no-store');
      res.status(500).json({
        error: 'SERVER_ERROR',
        message: errorMessage(err),
        registered_count: 0,
        confirmed_count: 0,
        auction_eligible_count: 0,
      });
    }
  };
}

export default createPublicStatsHandler();
