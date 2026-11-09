import type {
  AssignmentSource,
  EmployeePosition,
  ShiftCode,
} from '@repo/types';
import { isQuietDay } from './weeks';

/**
 * The draft compiler (F5): reproduces alur utama 4.1–4.4 on pure data, so the
 * rules are exhaustively unit-tested without Prisma or HTTP. It takes last
 * week's assignments, the staff on the roster, and the requests the manager has
 * already approved, and returns the whole week — one row per staff per day,
 * with a shift or libur.
 *
 * Deterministic by construction: same input, same output, ordered by day then
 * employee id. The caller owns the write; this file never touches a database.
 */

const DAY_MS = 86_400_000;

/**
 * The day shifts, in the order a tie is broken: "the shift the staff member
 * holds most often" has no answer when pagi and sore count the same, so the
 * catalog order decides instead of leaving the draft dependent on input order.
 */
const DAY_SHIFTS: readonly ShiftCode[] = ['PAGI', 'SORE'];

const DAYS_PER_WEEK = 7;

export interface CompileStaff {
  id: string;
  name: string;
  position: EmployeePosition;
}

/** One cell of last week's schedule: a shift, or null for libur. */
export interface PreviousAssignment {
  employeeId: string;
  /** `YYYY-MM-DD`. */
  tanggal: string;
  shiftCode: ShiftCode | null;
}

/** An approved request libur (alur 4.2). */
export interface OffFact {
  employeeId: string;
  tanggal: string;
}

/** An approved request shift (alur 4.3). */
export interface ShiftFact {
  employeeId: string;
  tanggal: string;
  shiftCode: ShiftCode;
}

export interface CompileInput {
  /** Monday of the minggu target, `YYYY-MM-DD`. */
  weekStartDate: string;
  staff: CompileStaff[];
  previousWeek: PreviousAssignment[];
  offRequests: OffFact[];
  shiftRequests: ShiftFact[];
}

export interface CompiledAssignment {
  employeeId: string;
  employeeName: string;
  position: EmployeePosition;
  tanggal: string;
  shiftCode: ShiftCode | null;
  source: AssignmentSource;
}

function addDays(iso: string, days: number): string {
  return new Date(new Date(`${iso}T00:00:00.000Z`).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** Cell key: one staff member on one day. */
function cellKey(employeeId: string, tanggal: string): string {
  return `${employeeId}|${tanggal}`;
}

/**
 * A day the staff member is genuinely libur: an approved request emptied it.
 * An unfilled day (no history, no request) is not a libur yet, just undecided,
 * so it never promotes a colleague to middle.
 */
function isLibur(row: CompiledAssignment): boolean {
  return row.shiftCode === null && row.source === 'request';
}

/**
 * The shift the staff member held most often last week, among pagi and sore.
 * Middle is skipped: it exists only because a kitchen peer was off (4.4), so it
 * is never a pattern to fall back on. A staff member with no history has no
 * most frequent shift — their days stay libur for the manager to fill.
 */
function mostFrequentShift(history: PreviousAssignment[]): ShiftCode | null {
  const counts = new Map<ShiftCode, number>();
  for (const row of history) {
    if (row.shiftCode !== 'PAGI' && row.shiftCode !== 'SORE') {
      continue;
    }
    counts.set(row.shiftCode, (counts.get(row.shiftCode) ?? 0) + 1);
  }

  let best: ShiftCode | null = null;
  let bestCount = 0;
  for (const code of DAY_SHIFTS) {
    const count = counts.get(code) ?? 0;
    if (count > bestCount) {
      best = code;
      bestCount = count;
    }
  }
  return best;
}

export function compileDraft(input: CompileInput): CompiledAssignment[] {
  const days = Array.from({ length: DAYS_PER_WEEK }, (_, offset) =>
    addDays(input.weekStartDate, offset),
  );

  const copiedShifts = new Map(
    input.previousWeek.map((row) => [
      cellKey(row.employeeId, row.tanggal),
      row.shiftCode,
    ]),
  );
  const approvedOff = new Set(
    input.offRequests.map((off) => cellKey(off.employeeId, off.tanggal)),
  );
  const approvedShift = new Map(
    input.shiftRequests.map((request) => [
      cellKey(request.employeeId, request.tanggal),
      request.shiftCode,
    ]),
  );

  const rows = new Map<string, CompiledAssignment>();

  for (const staff of input.staff) {
    const fallback = mostFrequentShift(
      input.previousWeek.filter((row) => row.employeeId === staff.id),
    );

    for (const tanggal of days) {
      const key = cellKey(staff.id, tanggal);

      // 4.1: copy the same weekday from last week, minus its libur. An empty
      // day takes the most frequent shift instead.
      const copied = copiedShifts.get(cellKey(staff.id, addDays(tanggal, -7)));
      let shiftCode =
        copied === 'PAGI' || copied === 'SORE' ? copied : fallback;
      let source: AssignmentSource = 'copy';

      // 4.2 / 4.3: the manager's approved requests win over the copy, and a
      // day off wins over a shift request for the same day.
      if (approvedOff.has(key)) {
        shiftCode = null;
        source = 'request';
      } else if (approvedShift.has(key)) {
        shiftCode = approvedShift.get(key) ?? shiftCode;
        source = 'request';
      }

      rows.set(key, {
        employeeId: staff.id,
        employeeName: staff.name,
        position: staff.position,
        tanggal,
        shiftCode,
        source,
      });
    }
  }

  // 4.4: a kitchen staff member becomes middle on a day a kitchen colleague is
  // libur, provided they are the only one working that day — the requested
  // shift they held is voided, since it is never what gets written.
  //
  // Middle exists because libur exists, and libur only exists Senin–Kamis, so
  // middle never lands Jumat–Minggu (GLOSSARY › Middle).
  for (const tanggal of days) {
    if (!isQuietDay(tanggal)) {
      continue;
    }

    const kitchen = [...rows.values()].filter(
      (row) => row.tanggal === tanggal && row.position === 'kitchen',
    );
    const onLibur = kitchen.filter(isLibur);
    const working = kitchen.filter((row) => row.shiftCode !== null);

    if (onLibur.length > 0 && working.length === 1) {
      const lone = working[0];
      lone.shiftCode = 'MIDDLE';
      lone.source = 'auto_middle';
    }
  }

  return [...rows.values()].sort(
    (a, b) =>
      a.tanggal.localeCompare(b.tanggal) ||
      a.employeeId.localeCompare(b.employeeId),
  );
}
