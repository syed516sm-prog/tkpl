import type { SupabaseBackend } from '../lib/supabaseBackend';

export interface RecordedCall {
  kind: 'rpc' | 'upload' | 'select' | 'update' | 'signed-url';
  name: string;
  payload: Record<string, unknown>;
}

export interface FakeSupabaseOptions {
  rpc?: (fn: string, args: Record<string, unknown>) => { data: unknown; error: unknown };
  uploadError?: { message: string } | null;
  adminUserRow?: Record<string, unknown> | null;
  authError?: { message: string } | null;
}

/**
 * A tiny in-memory stand-in for the parts of the Supabase client the data
 * layer touches: `storage.from().upload()`, `rpc()` and chainable
 * `from().select()/update()`. Every call is recorded in order so a test can
 * prove the upload happens before the RPC.
 */
export function createFakeSupabase(options: FakeSupabaseOptions = {}) {
  const calls: RecordedCall[] = [];

  const client: SupabaseBackend = {
    async rpc(fn, args) {
      calls.push({ kind: 'rpc', name: fn, payload: { ...(args ?? {}) } });
      const result = options.rpc?.(fn, args ?? {}) ?? { data: null, error: null };
      return result;
    },
    storage: {
      from(bucket: string) {
        return {
          async upload(path: string, body: Blob | File, uploadOptions?: Record<string, unknown>) {
            calls.push({
              kind: 'upload',
              name: bucket,
              payload: { path, body, ...(uploadOptions ?? {}) },
            });
            if (options.uploadError) return { data: null, error: options.uploadError };
            return { data: { path }, error: null };
          },
          async createSignedUrl(path: string, expiresIn: number) {
            calls.push({ kind: 'signed-url', name: bucket, payload: { path, expiresIn } });
            return { data: { signedUrl: `https://signed.example/${path}` }, error: null };
          },
        };
      },
    },
    auth: {
      async signInWithPassword({ email }) {
        if (options.authError) {
          return { data: null, error: options.authError };
        }
        return {
          data: {
            user: { id: (options.adminUserRow?.user_id as string) || 'usr-fake-123', email },
            session: {},
          },
          error: null,
        };
      },
      async signOut() {
        return { error: null };
      },
      async getSession() {
        return { data: { session: null }, error: null };
      },
    },
    from(table: string) {
      const chain = {
        select(columns?: string) {
          calls.push({ kind: 'select', name: table, payload: { columns: columns ?? '*' } });
          return chain;
        },
        update(values: Record<string, unknown>) {
          calls.push({ kind: 'update', name: table, payload: values });
          return chain;
        },
        eq() {
          return chain;
        },
        order() {
          return chain;
        },
        limit() {
          return chain;
        },
        maybeSingle() {
          if (table === 'admin_users') {
            return Promise.resolve({ data: options.adminUserRow ?? null, error: null });
          }
          return Promise.resolve({ data: null, error: null });
        },
      };
      // Thenable so `await supabase.from(...).select(...).order(...)` resolves.
      (chain as unknown as Record<string, unknown>).then = (
        resolve: (value: { data: unknown[]; error: null }) => void
      ) => resolve({ data: [], error: null });
      return chain;
    },
  };

  return { client, calls };
}
