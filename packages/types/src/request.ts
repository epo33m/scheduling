import type { EmployeePosition } from './employee';
import type { ShiftCode } from './shift';

export const REQUEST_STATUSES = ['pending', 'approved', 'rejected'] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const WEEK_STATUSES = ['draft', 'published'] as const;

export type WeekStatus = (typeof WEEK_STATUSES)[number];

/**
 * A staff member's requested day off, as the request screen reads it back.
 * `tanggal` is a `YYYY-MM-DD` calendar date inside the open week; `status`
 * starts as `pending` and only changes once the manager decides (F4).
 */
export interface OffRequestView {
  tanggal: string;
  status: RequestStatus;
}

/**
 * A shift preference for one day (F3). Only PAGI and SORE are ever requested;
 * the request is best-effort, so the shown status reflects the manager's call,
 * not a guarantee.
 */
export interface ShiftRequestView {
  tanggal: string;
  shiftCode: ShiftCode;
  status: RequestStatus;
}

/**
 * Everything the staff request screen needs for the week whose window is open.
 * `windowOpen` is derived from `requestDeadline` against the current WITA time
 * (ADR 0002), so the screen can tell a staff member they can no longer edit
 * without a stored status anywhere. When no future week is queued the whole
 * surface is closed and both fields carry their empty defaults.
 */
export interface StaffRequests {
  /** Monday of the target week, `YYYY-MM-DD`; null when no window is open. */
  weekStartDate: string | null;
  /** Window-close instant in ISO-8601; null when no window is open. */
  requestDeadline: string | null;
  windowOpen: boolean;
  offRequest: OffRequestView | null;
  shiftRequests: ShiftRequestView[];
}

/**
 * The manager dashboard (F4): every request of the minggu target in one read.
 * `offConflicted` / `shiftConflicted` carry the ids the system marks as
 * bentrok — requests that cannot all be granted, so the manager picks which
 * to approve (PRD §Bentrok request). `staffWithoutRequest` lists the active
 * non-probation staf who submitted neither kind, the people to remind.
 */
export interface RequestsDashboard {
  /** Monday of the minggu target, `YYYY-MM-DD`; null when none exists yet. */
  weekStartDate: string | null;
  /** Window-close instant in ISO-8601; null when no week exists yet. */
  requestDeadline: string | null;
  /** Whether staf can still edit; the dashboard stays readable once closed. */
  windowOpen: boolean;
  offRequests: DashboardOffRequest[];
  /** Ids among `offRequests` that clash with a same-position same-day pick. */
  offConflicted: string[];
  shiftRequests: DashboardShiftRequest[];
  /** Ids among `shiftRequests` that exceed the day's slots. */
  shiftConflicted: string[];
  staffWithoutRequest: DashboardStaff[];
}

/** A request as the manager decides it: whose, which day, and the row id. */
export interface DashboardOffRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  position: EmployeePosition;
  tanggal: string;
  status: RequestStatus;
}

export interface DashboardShiftRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  position: EmployeePosition;
  tanggal: string;
  shiftCode: ShiftCode;
  status: RequestStatus;
}

/** One entry of the "belum request" reminder list. */
export interface DashboardStaff {
  id: string;
  name: string;
  position: EmployeePosition;
}
