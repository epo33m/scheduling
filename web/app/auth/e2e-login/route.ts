import { NextResponse, type NextRequest } from 'next/server';
import { E2E_PASSWORD } from '@/lib/e2e-fixtures';
import { employeeGate } from '@/lib/employee-gate';
import { safeNext } from '@/lib/safe-next';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Password login for the Playwright suite: real GoTrue, real session cookie,
 * no Google round-trip. Inert unless the server runs with E2E=1; the flag is
 * server-only, so a normal dev or production build 404s here like any unknown
 * route. It runs the same employee whitelist gate as the OAuth callback, so a
 * cookie is only handed on for an account the api actually recognises.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (process.env.E2E !== '1') {
    return NextResponse.json({ message: 'Not found' }, { status: 404 });
  }

  const { searchParams, origin } = request.nextUrl;
  const email = searchParams.get('email');
  const next = safeNext(searchParams.get('next'));

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email ?? '',
    password: E2E_PASSWORD,
  });

  if (error) {
    const url = new URL('/login', origin);
    url.searchParams.set('error', 'gagal');
    return NextResponse.redirect(url);
  }

  const refusal = await employeeGate(data.session?.access_token);

  if (refusal) {
    // 'local' drops the session before the request, so a rejected account
    // never keeps a live cookie, matching the OAuth callback.
    await supabase.auth.signOut({ scope: 'local' });
    const url = new URL('/login', origin);
    url.searchParams.set('error', refusal);
    return NextResponse.redirect(url);
  }

  return NextResponse.redirect(new URL(next, origin));
}
