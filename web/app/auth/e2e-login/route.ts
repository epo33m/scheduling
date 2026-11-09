import { NextResponse, type NextRequest } from 'next/server';
import { E2E_PASSWORD } from '@/lib/e2e-fixtures';
import { safeNext } from '@/lib/safe-next';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Password login for the Playwright suite: real GoTrue, real session cookie,
 * no Google round-trip. Inert unless the server runs with E2E=1; the flag is
 * server-only, so a normal dev or production build 404s here like any unknown
 * route. The whitelist check the OAuth callback runs is skipped on purpose:
 * every account this suite signs in as is seeded as an employee first, and the
 * api still re-checks the token on every request it serves.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (process.env.E2E !== '1') {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  const { searchParams, origin } = request.nextUrl;
  const email = searchParams.get('email');
  const next = safeNext(searchParams.get('next'));

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email ?? '',
    password: E2E_PASSWORD,
  });

  if (error) {
    const url = new URL('/login', origin);
    url.searchParams.set('error', 'gagal');
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL(next, origin));
}
