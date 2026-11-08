import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { safeNext } from '../safe-next';
import { sessionCookieOptions, sessionMaxAge, supabaseConfig } from './config';

/** Routes that must answer before anyone is signed in. */
function isOpenRoute(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/auth/');
}

/**
 * Every page requires a session (PRD §Privasi). This runs on each request to
 * refresh the access token through Supabase, and sends anyone without a session
 * to /login carrying the path they asked for, so login can return them there.
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  const { url, anonKey } = supabaseConfig();
  const { pathname, search } = request.nextUrl;

  if (isOpenRoute(pathname)) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anonKey, {
    cookieOptions: sessionCookieOptions,
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, {
            ...options,
            maxAge: sessionMaxAge(options),
          });
        }

        // A response that writes auth cookies must never be cached, or one
        // visitor's session could be served to the next.
        for (const [header, headerValue] of Object.entries(headers ?? {})) {
          response.headers.set(header, headerValue);
        }
      },
    },
  });

  // getUser() verifies the token with Supabase and refreshes it when needed;
  // getSession() would trust whatever the cookie holds.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    return response;
  }

  const login = request.nextUrl.clone();
  login.pathname = '/login';
  login.search = '';
  login.searchParams.set('next', safeNext(`${pathname}${search}`));

  const redirect = NextResponse.redirect(login);
  for (const cookie of response.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}
