import type { EmployeePosition } from './employee';
import type { WeekStatus } from './request';
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
 * A jendela request that is open for a week: which week it collects requests
 * for, and the instant it closes (Minggu 12.00 WITA of the week before).
 */
export interface OpenWindow {
  /** Monday of the week whose requests the window collects. */
  weekStartDate: string;
  /** ISO instant the window closes; `now` past it locks the window (ADR 0002). */
  requestDeadline: string;
}

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
  /** `draft` until the manager publishes; null when no week exists yet. */
  status: WeekStatus | null;
  /** ISO instant of the publish; null while the week is a draft. */
  publishedAt: string | null;
  /**
   * The jendela request publishing this week opened for the week after it
   * (ADR 0004); null until this week is published.
   */
  nextWindow: OpenWindow | null;
}

/**
 * One day of a published week, as the staff member it belongs to reads it. No
 * name, position, or source: the staff surface shows only their own day, shift,
 * and hours (F7), and carries nothing about anyone else.
 */
export interface PublishedAssignment {
  /** `YYYY-MM-DD` inside the published week. */
  tanggal: string;
  /** Null is hari libur, the same cell the manager wrote. */
  shiftCode: ShiftCode | null;
}

/**
 * The published minggu target as one employee sees it (F6/F7): the week the
 * manager last published, holding only the caller's own placements.
 */
export interface PublishedWeek {
  /** Monday of the published week, `YYYY-MM-DD`; null before the first publish. */
  weekStartDate: string | null;
  assignments: PublishedAssignment[];
}
