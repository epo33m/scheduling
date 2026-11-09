import { SHIFT_TYPE_CATALOG } from '@repo/types';
import { E2E_EMAILS, E2E_EMAIL_LIST, E2E_PASSWORD } from '../lib/e2e-fixtures';
import { addDays, runningMondayIso, targetMondayIso } from './weeks';

/**
 * Seed through the local Supabase surface (PostgREST + GoTrue admin) instead of
 * Prisma: the web package has no Prisma client, and service-role writes bypass
 * RLS the same way the api's own reads do. Rows are deleted and recreated on
 * every run, so the suite is deterministic against the dev database.
 */
const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54421';

/** The fixed service-role key of `supabase start`; local-only, open-source. */
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const ADMIN_HEADERS = {
  apikey: SERVICE_ROLE_KEY,
  authorization: `Bearer ${SERVICE_ROLE_KEY}`,
};

// Fixed ids so assignments and weeks can reference each other without reading
// generated ones back.
const EMPLOYEE_IDS = {
  manager: 'e2e00000-0000-4000-8000-000000000001',
  kitchenA: 'e2e00000-0000-4000-8000-000000000002',
  kitchenB: 'e2e00000-0000-4000-8000-000000000003',
  bar: 'e2e00000-0000-4000-8000-000000000004',
} as const;

const RUNNING_WEEK_ID = 'e2e10000-0000-4000-8000-000000000001';
const TARGET_WEEK_ID = 'e2e10000-0000-4000-8000-000000000002';

async function rest(
  table: string,
  query: string,
  method: string,
  body?: unknown,
  headers?: Record<string, string>,
): Promise<unknown> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`,
    {
      method,
      headers: {
        ...ADMIN_HEADERS,
        'content-type': 'application/json',
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `seed ${method} ${table} failed (${response.status}): ${text}`,
    );
  }

  return response.json().catch(() => null);
}

function upsert(
  table: string,
  onConflict: string,
  rows: Record<string, unknown>[],
): Promise<unknown> {
  return rest(table, `on_conflict=${onConflict}`, 'POST', rows, {
    prefer: 'resolution=merge-duplicates,return=minimal',
  });
}

async function gotrue(
  path: string,
  method: string,
  body?: unknown,
): Promise<any> {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method,
    headers: { ...ADMIN_HEADERS, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `gotrue ${method} /${path} failed (${response.status}): ${text}`,
    );
  }

  return response.json();
}

/** The staff the cycle runs on, in the shape the suite reads and asserts. */
const STAFF = [
  { key: 'kitchenA', name: 'Kiki', position: 'kitchen' },
  { key: 'kitchenB', name: 'Dila', position: 'kitchen' },
  { key: 'bar', name: 'Rian', position: 'bar' },
] as const;

async function resetAuthUsers(): Promise<void> {
  const { users } = await gotrue('admin/users?page=1&per_page=200', 'GET');
  for (const user of users ?? []) {
    if (E2E_EMAIL_LIST.includes(user.email)) {
      await gotrue(`admin/users/${user.id}`, 'DELETE');
    }
  }

  for (const email of E2E_EMAIL_LIST) {
    await gotrue('admin/users', 'POST', {
      email,
      password: E2E_PASSWORD,
      email_confirm: true,
    });
  }
}

/**
 * Drop everything the last run (or a manual click-through) left on the two
 * fixture Mondays and the week after, then rebuild: the running week published
 * with a full seven-day pattern, and the minggu target as an empty draft whose
 * window is still open.
 */
export async function seedE2e(now = new Date()): Promise<void> {
  const target = targetMondayIso(now);
  const running = runningMondayIso(now);
  const afterTarget = addDays(target, 7);
  const stamp = now.toISOString();

  await resetAuthUsers();

  // Deletes: cascades take the request and assignment rows with them.
  const weekDates = [running, target, afterTarget]
    .map((d) => `"${d}"`)
    .join(',');
  await rest('schedule_week', `start_date=in.(${weekDates})`, 'DELETE');
  const emails = E2E_EMAIL_LIST.map((e) => `"${e}"`).join(',');
  await rest('employee', `email=in.(${emails})`, 'DELETE');

  await upsert(
    'shift_type',
    'code',
    SHIFT_TYPE_CATALOG.map((shift, index) => ({
      // id has no database default, so an insert-first row carries a fixed one.
      id: `e2e30000-0000-4000-8000-00000000000${index + 1}`,
      code: shift.code,
      start_time: shift.startTime,
      end_time: shift.endTime,
      // The `positions` field of the model lives in a `posisi_berlaku` column.
      posisi_berlaku: shift.positions,
      created_at: stamp,
      updated_at: stamp,
    })),
  );

  await rest('employee', '', 'POST', [
    {
      id: EMPLOYEE_IDS.manager,
      name: 'Maya',
      email: E2E_EMAILS.manager,
      position: 'bar',
      role: 'manager',
      status: 'tetap',
      is_active: true,
      created_at: stamp,
      updated_at: stamp,
    },
    ...STAFF.map((staff) => ({
      id: EMPLOYEE_IDS[staff.key],
      name: staff.name,
      email: E2E_EMAILS[staff.key],
      position: staff.position,
      role: 'staff',
      status: 'tetap',
      is_active: true,
      created_at: stamp,
      updated_at: stamp,
    })),
  ]);

  await rest('schedule_week', '', 'POST', [
    {
      id: RUNNING_WEEK_ID,
      start_date: running,
      status: 'published',
      // The window for a week that is already running closed long ago.
      request_deadline: `${addDays(running, -1)}T04:00:00.000Z`,
      published_at: `${addDays(running, -1)}T04:30:00.000Z`,
      published_by: EMPLOYEE_IDS.manager,
      created_at: stamp,
      updated_at: stamp,
    },
    {
      id: TARGET_WEEK_ID,
      start_date: target,
      status: 'draft',
      // The real deadline is Sunday 12.00 WITA before the target (ADR 0002),
      // but a run that starts Sunday afternoon would already be locked out.
      // A day ahead of *now* keeps the jendela request open every week day.
      request_deadline: new Date(now.getTime() + 24 * 3_600_000).toISOString(),
      // PostgREST needs the same key set on every row of the array.
      published_at: null,
      published_by: null,
      created_at: stamp,
      updated_at: stamp,
    },
  ]);

  // Running week: Senin–Kamis PAGI, Jumat–Minggu SORE for every staff member.
  // Seven eight-hour shifts each, so totals are 56 jam before anything moves.
  const assignments: Record<string, unknown>[] = [];
  for (const staff of STAFF) {
    for (let day = 0; day < 7; day += 1) {
      assignments.push({
        id: `e2e20000-0000-4000-8000-${String(
          STAFF.indexOf(staff) * 10 + day + 1,
        ).padStart(4, '0')}00000000`,
        week_id: RUNNING_WEEK_ID,
        employee_id: EMPLOYEE_IDS[staff.key],
        tanggal: addDays(running, day),
        shift_code: day <= 3 ? 'PAGI' : 'SORE',
        source: 'manual',
        created_at: stamp,
        updated_at: stamp,
      });
    }
  }
  await rest('shift_assignment', '', 'POST', assignments);
}
