import type { ApiRequest, ApiResponse } from '../_lib/http.js';
import { readServerConfig } from '../_lib/config.js';

/**
 * GET /api/razorpay/health
 *
 * Public "can players pay right now?" probe used before any credentials are
 * typed, so the registration form can warn early. Reveals only whether the
 * gateway is configured — never a key, mode or any player data.
 */
export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ configured: false });
    return;
  }

  const result = readServerConfig();
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ configured: result.ok });
}
