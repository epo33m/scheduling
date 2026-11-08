/**
 * Supabase settings the api works with. The project URL doubles as the JWT
 * issuer (`<url>/auth/v1`) and as the base for the JWKS the access tokens are
 * signed against, so both helpers derive from the same value.
 */
export function supabaseUrl(): string {
  const url = process.env.SUPABASE_URL;
  if (!url) {
    throw new Error('SUPABASE_URL belum diset');
  }
  return url.replace(/\/+$/, '');
}

export function supabaseIssuer(): string {
  return `${supabaseUrl()}/auth/v1`;
}

export function supabaseJwksUrl(): URL {
  return new URL(`${supabaseUrl()}/auth/v1/.well-known/jwks.json`);
}
