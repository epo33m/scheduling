import { addDays, targetMondayIso } from '@repo/weeks';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/**
 * The minggu target the manager composes: the next Monday strictly after the
 * WITA today (ADR 0004). The rule lives once in `@repo/weeks`, shared with the
 * e2e fixture; this only gives it back in the `@db.Date` shape (midnight UTC)
 * every date in this api is held as.
 */
export function nextMonday(now: Date): Date {
  return new Date(`${targetMondayIso(now)}T00:00:00.000Z`);
}

/** The shared whole-day shift, re-exported so schedule callers keep one home. */
export { addDays };

/**
 * The two weeks a staff member reads (F6/F7): the minggu target and the
 * running week one before it, as midnight-UTC stamps to match a stored
 * `start_date` against. Older published weeks fall outside these bounds and
 * leave the staff screen for good.
 */
export function publishedWeekBounds(now: Date): {
  running: number;
  target: number;
} {
  const target = nextMonday(now).getTime();
  return { running: target - 7 * DAY_MS, target };
}

/**
 * The instant a week's jendela request closes: Minggu 12.00 WITA of the week
 * before it opens (ADR 0002). WITA is UTC+8, so that is 04.00 UTC on the Sunday
 * one day before the Monday `startDate` — what `now > request_deadline` is
 * compared against.
 */
export function requestDeadlineFor(startDate: Date): Date {
  return new Date(startDate.getTime() - DAY_MS + 4 * HOUR_MS);
}

/**
 * Senin–Kamis: the cafe is quiet, so a libur is allowed, a lone kitchen becomes
 * middle, and one bar per shift is enough. Jumat–Minggu is busy and everyone
 * works (PRD §Aturan bisnis). The one place the schedule module asks which kind
 * of day it is holding.
 */
export function isQuietDay(tanggal: string): boolean {
  const weekday = new Date(`${tanggal}T00:00:00.000Z`).getUTCDay();
  return weekday >= 1 && weekday <= 4;
}
