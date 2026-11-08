'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sessionCookieOptions, supabaseConfig } from './config';

/**
 * The browser client signs in through the PKCE redirect flow: it stores the
 * code verifier in a cookie and hands the whole page to Google. The popup flow
 * breaks in an installed PWA on iPhone, which is why the PRD rules it out.
 */
export function createBrowserSupabaseClient(): SupabaseClient {
  const { url, anonKey } = supabaseConfig();

  return createBrowserClient(url, anonKey, {
    cookieOptions: sessionCookieOptions,
  });
}
