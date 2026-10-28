import { createClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client for the payment functions. Bypasses RLS, so it
 * may only be constructed server-side and every query must be scoped by an
 * RPC that checks the player's own three credentials.
 */
export function supabaseAdmin(url: string, serviceRoleKey: string) {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function errorMessage(error: unknown): string {
  if (!error) return 'Unknown error.';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message);
  return 'Unknown error.';
}

/** Postgres error codes we care about (Supabase surfaces them as `code`). */
export function errorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error && (error as { code?: unknown }).code) {
    return String((error as { code: unknown }).code);
  }
  return undefined;
}
