import type { LoginError } from '@/lib/login-error';

/**
 * Returns why the api refused this account, or null when it is on the list.
 * Only a 403 counts: an api that is unreachable must not lock anyone out,
 * because every later request is checked there anyway.
 */
export async function employeeGate(
  accessToken: string | undefined,
): Promise<LoginError | null> {
  const apiUrl = process.env.API_URL;

  // Failing open here would leave the deployment with no whitelist at all, so
  // a missing API_URL is an error rather than a free pass.
  if (!apiUrl) {
    throw new Error('API_URL belum diset');
  }

  if (!accessToken) {
    return 'gagal';
  }

  const response = await fetch(`${apiUrl}/auth/me`, {
    headers: { authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  }).catch(() => null);

  if (response?.status !== 403) {
    return null;
  }

  const body: unknown = await response.json().catch(() => null);
  const message =
    typeof body === 'object' && body !== null && 'message' in body
      ? body.message
      : undefined;

  return message === 'Akun tidak aktif' ? 'tidak-aktif' : 'belum-terdaftar';
}
