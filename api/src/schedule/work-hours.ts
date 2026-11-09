/** `HH:MM` local WITA wall-clock, the shape `shift_type` columns hold. */
function minutesOf(clock: string): number {
  const [hours, minutes] = clock.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Gross shift duration in hours: start to end of one shift_type row, with no
 * break deduction (PRD F7). Both clocks sit on the same WITA day, so the
 * difference of two `HH:MM` values is the whole shift.
 */
export function shiftDurationHours(startTime: string, endTime: string): number {
  return (minutesOf(endTime) - minutesOf(startTime)) / 60;
}
