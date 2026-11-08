import type { ManagedEmployee } from '@repo/types';
import { createServerSupabaseClient } from './supabase/server';

/**
 * Server-side calls to the NestJS api. The web never reads a table directly
 * (RLS denies it): every request carries the signed-in user's Supabase access
 * token and the api decides what that employee may do. A failure here always
 * carries a message safe to show the manager.
 */

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function authorizedFetch(
  path: string,
  init: RequestInit,
): Promise<Response> {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    throw new ApiError(500, 'API_URL belum diset di server web.');
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new ApiError(401, 'Sesi login hilang. Masuk lagi.');
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      ...init.headers,
      authorization: `Bearer ${session.access_token}`,
    },
  }).catch(() => null);

  if (!response) {
    throw new ApiError(0, 'Tidak bisa menghubungi server. Coba lagi.');
  }

  if (!response.ok) {
    throw new ApiError(response.status, await refusalMessage(response));
  }

  return response;
}

/** Prefer the api's own message; fall back when a failure is not JSON. */
async function refusalMessage(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null);
  const message =
    typeof body === 'object' && body !== null && 'message' in body
      ? body.message
      : undefined;

  if (typeof message === 'string' && message) {
    return message;
  }
  if (response.status === 403) {
    return 'Halaman ini khusus manager.';
  }
  return 'Terjadi kesalahan di server.';
}

export function listEmployees(): Promise<ManagedEmployee[]> {
  return authorizedFetch('/employees', { method: 'GET' }).then(
    (r) => r.json() as Promise<ManagedEmployee[]>,
  );
}

export function createEmployee(
  input: Record<string, unknown>,
): Promise<ManagedEmployee> {
  return authorizedFetch('/employees', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  }).then((r) => r.json() as Promise<ManagedEmployee>);
}

export function setEmployeeActive(
  id: string,
  isActive: boolean,
): Promise<ManagedEmployee> {
  return authorizedFetch(
    `/employees/${id}/${isActive ? 'reactivate' : 'deactivate'}`,
    {
      method: 'PATCH',
    },
  ).then((r) => r.json() as Promise<ManagedEmployee>);
}
