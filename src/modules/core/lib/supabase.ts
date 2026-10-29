import { createSupabaseBackend, type SupabaseBackend } from './supabaseBackend';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your-project-id') &&
    supabaseAnonKey !== 'your-public-anon-key-here'
);

export const supabaseClient: SupabaseBackend | null = isSupabaseConfigured
  ? createSupabaseBackend(supabaseUrl!, supabaseAnonKey!)
  : null;

/**
 * The configured Supabase client. Throws a readable error when the keys are
 * missing so a half-configured deployment fails loudly instead of silently
 * falling back to sample data.
 */
export function getSupabase(): SupabaseBackend {
  if (!supabaseClient) {
    throw new Error(
      'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your environment, or use the app in local demo mode.'
    );
  }
  return supabaseClient;
}
