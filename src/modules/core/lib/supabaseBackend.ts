import { createClient } from '@supabase/supabase-js';

type Result<T = any> = PromiseLike<{ data: T; error: unknown }> & Promise<{ data: T; error: unknown }>;

export interface SupabaseAuth {
  signInWithPassword(credentials: { email: string; password: string }): Promise<{
    data: { user: { id: string; email?: string } | null; session: unknown } | null;
    error: { message: string } | null;
  }>;
  signOut(): Promise<{ error: { message: string } | null }>;
  getSession(): Promise<{
    data: { session: { user: { id: string; email?: string } } | null };
    error: unknown;
  }>;
}

/**
 * The schema is intentionally untyped (no generated `Database` types), so the
 * client surface used by the app is spelled out here instead of every
 * `.rpc()` / `.update()` payload resolving to `never`.
 */
export interface SupabaseBackend {
  rpc: (fn: string, args?: Record<string, unknown>) => Result;
  from: (table: string) => any;
  storage: {
    from(bucket: string): {
      upload(path: string, body: Blob | File, options?: Record<string, unknown>): Result;
      createSignedUrl(path: string, expiresIn: number): Result<{ signedUrl: string } | null>;
    };
  };
  auth?: SupabaseAuth;
}

interface SupabaseEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

export interface SupabaseConfig {
  configured: boolean;
  url: string | null;
  anonKey: string | null;
}

/**
 * Pure, side-effect-free reader for the public Supabase keys.
 *
 * `supabase.ts` evaluates `import.meta.env` at import time, which cannot be
 * stubbed in tests. This module takes the environment as an argument, so the
 * data layer under test can be driven by a fake client.
 */
export function readSupabaseConfig(env: SupabaseEnv): SupabaseConfig {
  const url = env.VITE_SUPABASE_URL?.trim() || null;
  const anonKey = env.VITE_SUPABASE_ANON_KEY?.trim() || null;
  const configured = Boolean(
    url &&
      anonKey &&
      !url.includes('your-project-id') &&
      anonKey !== 'your-public-anon-key-here'
  );
  return { configured, url: configured ? url : null, anonKey: configured ? anonKey : null };
}

export function createSupabaseBackend(url: string, anonKey: string): SupabaseBackend {
  const client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return {
    rpc: client.rpc.bind(client),
    from: client.from.bind(client),
    storage: client.storage,
    auth: client.auth,
  } as unknown as SupabaseBackend;
}
