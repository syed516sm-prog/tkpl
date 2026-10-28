/**
 * Server-only environment. None of these may be VITE_-prefixed: they must never
 * reach the browser bundle.
 */
export interface ServerConfig {
  razorpayKeyId: string;
  razorpayKeySecret: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

export type ConfigResult =
  | { ok: true; config: ServerConfig }
  | { ok: false; missing: string[] };

export function readServerConfig(env: Record<string, string | undefined> = process.env): ConfigResult {
  const required = {
    RAZORPAY_KEY_ID: env.RAZORPAY_KEY_ID?.trim(),
    RAZORPAY_KEY_SECRET: env.RAZORPAY_KEY_SECRET?.trim(),
    SUPABASE_URL: env.SUPABASE_URL?.trim(),
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  };
  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) return { ok: false, missing };

  return {
    ok: true,
    config: {
      razorpayKeyId: required.RAZORPAY_KEY_ID!,
      razorpayKeySecret: required.RAZORPAY_KEY_SECRET!,
      supabaseUrl: required.SUPABASE_URL!,
      supabaseServiceRoleKey: required.SUPABASE_SERVICE_ROLE_KEY!,
    },
  };
}

/** Test keys start with `rzp_test_`; live keys start with `rzp_live_`. */
export function razorpayKeyMode(keyId: string): 'test' | 'live' | 'unknown' {
  if (keyId.startsWith('rzp_test_')) return 'test';
  if (keyId.startsWith('rzp_live_')) return 'live';
  return 'unknown';
}
