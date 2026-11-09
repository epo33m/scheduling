const DAY_MS = 86_400_000;

/** `iso` (`YYYY-MM-DD`) shifted by whole days, same shape out. */
export function addDays(iso: string, days: number): string {
  return new Date(new Date(`${iso}T00:00:00.000Z`).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** Today's calendar day in WITA (UTC+8), `YYYY-MM-DD`. */
export function witaCalendarDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * The minggu target: the next Monday strictly after the WITA today (ADR 0004).
 * Between 00.00 and 08.00 WITA the UTC date is still the day before, so "today"
 * is read in WITA, not UTC. `YYYY-MM-DD` out, the calendar-day shape.
 */
export function targetMondayIso(now = new Date()): string {
  const today = witaCalendarDate(now);
  const daysToMonday =
    (8 - new Date(`${today}T00:00:00.000Z`).getUTCDay()) % 7 || 7;
  return addDays(today, daysToMonday);
}

/** The Monday the staff are living through: the week before the target. */
export function runningMondayIso(now = new Date()): string {
  return addDays(targetMondayIso(now), -7);
}
