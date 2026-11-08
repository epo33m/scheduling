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
