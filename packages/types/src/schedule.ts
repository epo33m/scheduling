import type { EmployeePosition } from './employee';
import type { ShiftCode } from './shift';

/**
 * Where a placement in a week's schedule came from (PRD §Model data): the copy
 * of last week's schedule (alur 4.1), a request the manager approved (4.2/4.3),
 * the automatic middle of a lone kitchen staff (4.4), or the manager's edit.
 */
export const ASSIGNMENT_SOURCES = [
  'copy',
  'request',
  'auto_middle',
  'manual',
] as const;

export type AssignmentSource = (typeof ASSIGNMENT_SOURCES)[number];

/**
 * One cell of the manager's draft: a staff member on one day, with a shift or a
 * day off. `shiftCode` null is libur — the row still exists, so a day off is
 * edited like any other cell.
 */
export interface DraftAssignment {
  employeeId: string;
  employeeName: string;
  position: EmployeePosition;
  /** `YYYY-MM-DD` inside the minggu target. */
  tanggal: string;
  shiftCode: ShiftCode | null;
  source: AssignmentSource;
}

/**
 * One shortfall in a day's crew (PRD §Aturan bisnis, validasi coverage). It is
 * a warning, never a refusal: the manager decides, including the 2+1 split when
 * a bar staff member is off.
 */
export interface CoverageWarning {
  /** `YYYY-MM-DD` of the day whose coverage is short. */
  tanggal: string;
  position: EmployeePosition;
  /**
   * The short-staffed shift; null when the rule is about the kitchen's whole
   * day, which any one kitchen shift covers on Senin–Kamis.
   */
  shiftCode: 'PAGI' | 'SORE' | null;
  /** How many of that position work the shift (or the kitchen day). */
  headcount: number;
  /** The crew the day asks for: 2 bar on Jumat–Minggu, 1 everywhere else. */
  minimum: number;
}

/**
 * The draft of one minggu target (F5). Only the manager ever reads this: staff
 * see a week only once it is published (F6), and nothing here is exposed on the
 * staff surface.
 */
export interface DraftSchedule {
  /** Monday of the minggu target, `YYYY-MM-DD`; null when no week exists yet. */
  weekStartDate: string | null;
  /** Monday of the week the draft was copied from; null for a manual first week. */
  copiedFromWeekStartDate: string | null;
  assignments: DraftAssignment[];
  /** Recomputed from the assignments on every read, so an edit never goes stale. */
  warnings: CoverageWarning[];
}
