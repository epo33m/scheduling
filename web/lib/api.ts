import type {
  DraftAssignment,
  DraftSchedule,
  ManagedEmployee,
  OffRequestView,
  PublishedSchedule,
  RequestDecisionResult,
  RequestsDashboard,
  SessionEmployee,
  ShiftCode,
  ShiftRequestView,
  StaffRequests,
  WeekAlias,
} from '@repo/types';
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

/**
 * Who the signed-in account is, and with which role. `GET /auth/me` is also
 * the whitelist check: a 403 here means the email has no active `employee` row.
 * The root route reads this to decide which screen to hand the visitor to.
 */
export function getMe(): Promise<SessionEmployee> {
  return authorizedFetch('/auth/me', { method: 'GET' }).then(
    (r) => r.json() as Promise<SessionEmployee>,
  );
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

/** The staff request screen's whole read: the open window and current picks. */
export function getRequests(): Promise<StaffRequests> {
  return authorizedFetch('/requests', { method: 'GET' }).then(
    (r) => r.json() as Promise<StaffRequests>,
  );
}

/** Capture or replace the single request libur for the open window. */
export function setOffRequest(tanggal: string): Promise<OffRequestView> {
  return authorizedFetch('/requests/off', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tanggal }),
  }).then((r) => r.json() as Promise<OffRequestView>);
}

export function cancelOffRequest(): Promise<void> {
  return authorizedFetch('/requests/off', { method: 'DELETE' }).then(
    () => undefined,
  );
}

/** Capture or replace a per-day request shift (pagi/sore) for the open window. */
export function setShiftRequest(
  tanggal: string,
  shiftCode: string,
): Promise<ShiftRequestView> {
  return authorizedFetch('/requests/shift', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ tanggal, shiftCode }),
  }).then((r) => r.json() as Promise<ShiftRequestView>);
}

export function cancelShiftRequest(tanggal: string): Promise<void> {
  return authorizedFetch(
    `/requests/shift?tanggal=${encodeURIComponent(tanggal)}`,
    { method: 'DELETE' },
  ).then(() => undefined);
}

/**
 * The manager dashboard read (F4): every request of the minggu target, the
 * ids the system marks bentrok, and the staff who have not requested. Manager
 * only; a staff caller gets the "khusus manager" refusal.
 */
export function getRequestsDashboard(): Promise<RequestsDashboard> {
  return authorizedFetch('/dashboard/requests', { method: 'GET' }).then(
    (r) => r.json() as Promise<RequestsDashboard>,
  );
}

/** The manager's approve/reject on one request (libur or shift). */
export function decideRequest(
  kind: 'off' | 'shift',
  id: string,
  decision: 'approve' | 'reject',
): Promise<RequestDecisionResult> {
  return authorizedFetch(`/dashboard/requests/${kind}/${id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ decision }),
  }).then((r) => r.json() as Promise<RequestDecisionResult>);
}

/**
 * The draft of one minggu (F5): every staff member, every day. The `week`
 * alias picks the running or target minggu (issue #20); it defaults to the
 * target so a caller that has not adopted the toggle still sees next week.
 * Manager only, which is what keeps the draft invisible to staff before
 * publish.
 */
export function getDraft(week: WeekAlias = 'target'): Promise<DraftSchedule> {
  return authorizedFetch(`/schedule/draft?week=${week}`, {
    method: 'GET',
  }).then((r) => r.json() as Promise<DraftSchedule>);
}

/** "Buat draft dari minggu lalu": runs alur 4.1–4.4 and replaces the draft. */
export function generateDraft(week: WeekAlias): Promise<DraftSchedule> {
  return authorizedFetch(`/schedule/draft?week=${week}`, {
    method: 'POST',
  }).then((r) => r.json() as Promise<DraftSchedule>);
}

/**
 * Publish (F6): the week becomes staff-visible and the request window of the
 * following week opens. The api answers with the week as it now stands, which
 * is also what carries the share link's deadline. A still-draft running week
 * can be published late through the same call (issue #20).
 */
export function publishSchedule(week: WeekAlias): Promise<DraftSchedule> {
  return authorizedFetch(`/schedule/publish?week=${week}`, {
    method: 'POST',
  }).then((r) => r.json() as Promise<DraftSchedule>);
}

/**
 * The staff schedule read (F7): the running week and the published minggu
 * target, narrowed by the api to the caller's own days. The share link lands
 * on this.
 */
export function getPublishedSchedule(): Promise<PublishedSchedule> {
  return authorizedFetch('/schedule/published', { method: 'GET' }).then(
    (r) => r.json() as Promise<PublishedSchedule>,
  );
}

/** The manager's edit of one draft cell; `shiftCode` null writes libur. */
export function saveAssignment(
  employeeId: string,
  tanggal: string,
  shiftCode: ShiftCode | null,
  week: WeekAlias,
): Promise<DraftAssignment> {
  return authorizedFetch(`/schedule/draft/assignment?week=${week}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ employeeId, tanggal, shiftCode }),
  }).then((r) => r.json() as Promise<DraftAssignment>);
}
