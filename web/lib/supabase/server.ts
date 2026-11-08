import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { sessionCookieOptions, sessionMaxAge, supabaseConfig } from './config';

/**
 * For server components and route handlers. Always build a new client per
 * request: it reads the caller's cookies, so sharing one would hand a session
 * to the next request.
 */
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const { url, anonKey } = supabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookieOptions: sessionCookieOptions,
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, {
              ...options,
              maxAge: sessionMaxAge(options),
            });
          }
        } catch {
          // Server components cannot write cookies. Middleware refreshes the
          // session on the next request, so a failed write here is harmless.
        }
      },
    },
  });
}
