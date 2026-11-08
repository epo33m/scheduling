import type { EmployeeStatus } from '@repo/types';

/**
 * WITA has no daylight saving, but naming the zone (rather than hard-coding a
 * +08:00 offset) keeps this honest if the rule is ever read from another
 * locale: everything the app counts as "today" is today in Makassar.
 */
const WITA_TIME_ZONE = 'Asia/Makassar';

const witaDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: WITA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** The `YYYY-MM-DD` calendar day an instant falls on in WITA. */
export function witaDate(now: Date): string {
  return witaDay.format(now);
}

/**
 * The probation rule from ADR 0003: a probation row turns tetap once its
 * `probation_end_date` has passed. The date is inclusive, so the flip happens
 * on the first WITA day *after* it, never on the end date itself. Returns
 * `tetap` when the stored status must move, or null when it stays as written.
 *
 * A probation row with no end date cannot advance: there is nothing to compare
 * against, so it is left on probation rather than silently promoted.
 */
export function advanceProbation(
  status: EmployeeStatus,
  probationEndDate: Date | null,
  now: Date,
): EmployeeStatus | null {
  if (status !== 'probation' || !probationEndDate) {
    return null;
  }

  // A @db.Date column reads back as midnight UTC, so the UTC date parts are
  // the calendar date the manager chose.
  const endDate = probationEndDate.toISOString().slice(0, 10);

  return witaDate(now) > endDate ? 'tetap' : null;
}
