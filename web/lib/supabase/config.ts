/**
 * The session lives in a cookie for 30 days (PRD F1), so a staff member who
 * installs the PWA is not asked to sign in again every week.
 */
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Both values are public: the anon key only lets the browser talk to Supabase
 * Auth, and Supabase checks every table read against RLS, which denies all.
 */
export function supabaseConfig(): SupabaseConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY belum diset',
    );
  }

  return { url, anonKey };
}

export const sessionCookieOptions = {
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: SESSION_MAX_AGE_SECONDS,
};

/**
 * `@supabase/ssr` overwrites `cookieOptions.maxAge` with its own 400-day
 * default on every write, so the 30-day limit has to be re-applied on each
 * cookie it hands back. A maxAge of zero is the client deleting a cookie and
 * stays zero.
 */
export function sessionMaxAge(options?: { maxAge?: number }): number {
  return options?.maxAge === 0 ? 0 : SESSION_MAX_AGE_SECONDS;
}
