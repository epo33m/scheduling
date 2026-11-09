import { NextResponse, type NextRequest } from 'next/server';
import type { LoginError } from '@/lib/login-error';
import { employeeGate } from '@/lib/employee-gate';
import { safeNext } from '@/lib/safe-next';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Google sends the browser back here with a one-time code, and exchanging it is
 * the second half of the PKCE flow.
 *
 * A session is not enough on its own: Supabase Auth lets any Google account in,
 * so this also asks the api whether that email has an `employee` row. A 403
 * means it does not, and the only useful thing to do then is sign out and say
 * so instead of dropping the person on a page that will stay empty.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = safeNext(searchParams.get('next'));

  // A failure still carries `next`: someone who cancelled at Google and tries
  // again has to land on the page they opened, not on the home page.
  const fail = (error: LoginError): NextResponse => {
    const url = new URL('/login', origin);
    url.searchParams.set('error', error);

    if (next !== '/') {
      url.searchParams.set('next', next);
    }

    return NextResponse.redirect(url);
  };

  if (!code) {
    return fail('gagal');
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return fail('gagal');
  }

  const refusal = await employeeGate(data.session?.access_token);

  if (refusal) {
    // 'local' drops the session before the request, so an Auth outage cannot
    // leave a rejected account holding a live cookie.
    await supabase.auth.signOut({ scope: 'local' });
    return fail(refusal);
  }

  return NextResponse.redirect(new URL(next, origin));
}
