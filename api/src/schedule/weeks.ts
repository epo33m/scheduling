import { witaDate } from '../employee/probation';

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/**
 * The minggu target the manager composes: the next Monday strictly after today
 * (ADR 0004). On a Sunday that is tomorrow — the schedule for next week is
 * written on the Sunday of the running one — and on any other day it is the
 * Monday of the coming week. The date is a `@db.Date` calendar day, held as
 * midnight UTC the way every other date in this api is.
 *
 * "Today" is the WITA calendar day, not the UTC one: between 00.00 and 08.00
 * WITA the UTC date is still yesterday, which would resolve the target to the
 * week already running instead of the one being composed.
 */
export function nextMonday(now: Date): Date {
  const today = new Date(`${witaDate(now)}T00:00:00.000Z`);
  const daysToMonday = (8 - today.getUTCDay()) % 7 || 7;
  return new Date(today.getTime() + daysToMonday * DAY_MS);
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
