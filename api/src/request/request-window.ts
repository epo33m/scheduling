/**
 * The request window is not a stored status: it is `request_deadline` read
 * against the clock (ADR 0002). A week's window is open while `now` has not
 * passed that instant, and locks the moment it does — no cron flips anything.
 *
 * Both arguments are UTC instants. The WITA wall clock (Minggu 12.00) is baked
 * into the stored `request_deadline` when the week is created (F5/F6), so this
 * comparison stays a plain instant check.
 */
export function isWindowOpen(requestDeadline: Date, now: Date): boolean {
  return now.getTime() <= requestDeadline.getTime();
}

/**
 * The minggu target a staff request belongs to: the nearest future window still
 * open. When several weeks are queued the one closing first is the live window
 * (the following weeks open later); once every deadline has passed there is no
 * open window and requests are refused.
 */
export function resolveOpenWindow<T extends { requestDeadline: Date }>(
  weeks: T[],
  now: Date,
): T | null {
  let open: T | null = null;

  for (const week of weeks) {
    if (!isWindowOpen(week.requestDeadline, now)) {
      continue;
    }
    if (!open || week.requestDeadline < open.requestDeadline) {
      open = week;
    }
  }

  return open;
}

/**
 * The most recent minggu target by start date: what a staff member or the
 * dashboard still shows once every window has closed and no newer one is
 * open yet.
 */
export function mostRecentWeek<T extends { startDate: Date }>(
  weeks: T[],
): T | null {
  return weeks.reduce<T | null>(
    (latest, week) =>
      !latest || week.startDate > latest.startDate ? week : latest,
    null,
  );
}
