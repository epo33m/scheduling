const DAY_MS = 86_400_000;

/** `iso` (`YYYY-MM-DD`) shifted by whole days, same shape out. */
export function addDays(iso: string, days: number): string {
  return new Date(new Date(`${iso}T00:00:00.000Z`).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** Today's calendar day in WITA, `YYYY-MM-DD`. */
export function witaToday(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/**
 * The minggu target: the next Monday strictly after today (ADR 0004). The api
 * recomputes this per request; the seed and the spec both derive their rows
 * from the same formula, so they always match while a run stays inside one
 * WITA day.
 */
export function targetMondayIso(now = new Date()): string {
  const daysToMonday =
    (8 - new Date(`${witaToday(now)}T00:00:00.000Z`).getUTCDay()) % 7 || 7;
  return addDays(witaToday(now), daysToMonday);
}

/** The Monday the staff are living through: the week before the target. */
export function runningMondayIso(now = new Date()): string {
  return addDays(targetMondayIso(now), -7);
}
