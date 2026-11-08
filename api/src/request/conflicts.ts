import type { EmployeePosition, RequestStatus, ShiftCode } from '@repo/types';

/**
 * Bentrok detection (F4): which requests cannot all be granted at once, so the
 * dashboard can mark them and leave the choice to the manager (PRD §Bentrok
 * request). Pure facts in, request ids out — no Prisma, no clock beyond the
 * weekday baked into the calendar dates.
 */

/** A request libur reduced to what conflict detection reads. */
export interface OffFact {
  id: string;
  position: EmployeePosition;
  /** `YYYY-MM-DD` inside the minggu target. */
  tanggal: string;
  status: RequestStatus;
}

/** A request shift reduced to what conflict detection reads. */
export interface ShiftFact {
  id: string;
  position: EmployeePosition;
  tanggal: string;
  /** Only PAGI/SORE are ever requested; MIDDLE is manager-assigned. */
  shiftCode: ShiftCode;
  status: RequestStatus;
}

export interface ConflictInput {
  offRequests: OffFact[];
  shiftRequests: ShiftFact[];
  /** Active non-probation staff per position: the people behind the slots. */
  staffByPosition: Record<EmployeePosition, number>;
}

export interface ConflictResult {
  offRequestIds: string[];
  shiftRequestIds: string[];
}

/** Jumat–Minggu are the busy days (PRD §Aturan bisnis). */
function isBusyDay(tanggal: string): boolean {
  const weekday = new Date(`${tanggal}T00:00:00.000Z`).getUTCDay();
  return weekday === 0 || weekday >= 5;
}

/** Requests still worth deciding: everything not already refused. */
function live<T extends { status: RequestStatus }>(items: T[]): T[] {
  return items.filter((item) => item.status !== 'rejected');
}

/**
 * The smallest number of people a shift of this position must have on this
 * day: bar 2 per shift on busy days, otherwise 1 per shift everywhere.
 */
function minPerShift(position: EmployeePosition, tanggal: string): number {
  return position === 'bar' && isBusyDay(tanggal) ? 2 : 1;
}

/**
 * Requests for one (position, day, shift) that exceed the slots left after
 * reserving the other shift's minimum. Days off count against the slots only
 * once the manager has approved them: pending decisions are not facts yet, and
 * the dashboard recomputes after each one. A day with fewer than two people
 * left working cannot hold a conflict: one person's request cannot clash with
 * another's, and a lone kitchen worker becomes MIDDLE anyway (step 4.4).
 */
function conflictingShiftIds(
  shiftRequests: ShiftFact[],
  offRequests: OffFact[],
  staffByPosition: Record<EmployeePosition, number>,
): string[] {
  const flagged = new Set<string>();
  const approvedOff = offRequests.filter((off) => off.status === 'approved');

  const groups = new Map<
    string,
    { position: EmployeePosition; tanggal: string; items: ShiftFact[] }
  >();
  for (const request of live(shiftRequests)) {
    const key = `${request.position}|${request.tanggal}|${request.shiftCode}`;
    const group = groups.get(key);
    if (group) {
      group.items.push(request);
    } else {
      groups.set(key, {
        position: request.position,
        tanggal: request.tanggal,
        items: [request],
      });
    }
  }

  for (const group of groups.values()) {
    const offToday = approvedOff.filter(
      (off) => off.position === group.position && off.tanggal === group.tanggal,
    ).length;
    const working = staffByPosition[group.position] - offToday;
    if (working < 2) continue;

    const capacity = working - minPerShift(group.position, group.tanggal);
    if (group.items.length > capacity) {
      for (const request of group.items) {
        flagged.add(request.id);
      }
    }
  }

  return [...flagged];
}

/**
 * Libur per day is capped at one bar and one kitchen (PRD §Aturan bisnis), so
 * two live requests from the same position for the same day cannot both be
 * granted: flag the whole pair and let the manager pick.
 */
function conflictingOffIds(offRequests: OffFact[]): string[] {
  const flagged = new Set<string>();
  const seen = new Map<string, string>();

  for (const request of live(offRequests)) {
    const key = `${request.position}|${request.tanggal}`;
    const first = seen.get(key);
    if (first) {
      flagged.add(first);
      flagged.add(request.id);
    } else {
      seen.set(key, request.id);
    }
  }

  return [...flagged];
}

export function detectConflicts(input: ConflictInput): ConflictResult {
  return {
    offRequestIds: conflictingOffIds(input.offRequests),
    shiftRequestIds: conflictingShiftIds(
      input.shiftRequests,
      input.offRequests,
      input.staffByPosition,
    ),
  };
}
