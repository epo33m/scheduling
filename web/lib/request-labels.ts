import type { RequestStatus, ShiftCode } from '@repo/types';

/** Senin..Minggu, index 0 = Monday. The minggu target always starts Senin. */
export const DAY_NAMES = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
] as const;

export const SHIFT_LABEL: Record<ShiftCode, string> = {
  PAGI: 'Pagi',
  SORE: 'Sore',
  MIDDLE: 'Middle',
};

/**
 * The only shifts a staff member may request (PRD §Aturan bisnis): middle is
 * manager-assigned and never a request option, so it is excluded here rather
 * than filtered at every call site.
 */
export const REQUESTABLE_SHIFTS: readonly ShiftCode[] = ['PAGI', 'SORE'];

/**
 * The request status in the staff member's words. A request shift is
 * best-effort, so "diusahakan" says the manager will try rather than promise
 * (PRD §Aturan bisnis).
 */
export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  pending: 'Menunggu keputusan manager',
  approved: 'Disetujui',
  rejected: 'Belum dikabulkan',
};

const DAY_MS = 86_400_000;

/** One selectable day in the target week. */
export interface TargetDay {
  tanggal: string;
  name: (typeof DAY_NAMES)[number];
  /** Senin..Kamis: the only days a request libur may fall on. */
  offAllowed: boolean;
}

/**
 * Expand the minggu target (its Monday, `YYYY-MM-DD`) into its seven days. The
 * first four carry `offAllowed` so the libur control only offers Senin..Kamis
 * while the shift control offers every day.
 */
export function targetWeekDays(monday: string): TargetDay[] {
  const start = new Date(`${monday}T00:00:00.000Z`).getTime();
  return DAY_NAMES.map((name, index) => ({
    tanggal: new Date(start + index * DAY_MS).toISOString().slice(0, 10),
    name,
    offAllowed: index <= 3,
  }));
}

/** "Selasa" for a `YYYY-MM-DD` inside the target week; null if unknown. */
export function dayName(monday: string, tanggal: string): string | null {
  const day = targetWeekDays(monday).find((d) => d.tanggal === tanggal);
  return day?.name ?? null;
}

/**
 * "9 Nov" for a `YYYY-MM-DD` day: the cell in the staff week list, where the
 * full date would crowd the row. WITA keeps the day stable for this app's
 * users, matching every other formatter here.
 */
export function formatDayShort(tanggal: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Makassar',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${tanggal}T00:00:00.000Z`));
}

/**
 * "07.30–15.30" for a stored `HH:MM` pair. The PRD writes WITA clock times
 * with a dot, so the stored colon gives way to the reader's habit.
 */
export function formatShiftTime(startTime: string, endTime: string): string {
  return `${startTime.replace(':', '.')}–${endTime.replace(':', '.')}`;
}

/** "56 jam", or "36,5 jam": id-ID decimals, because staff count in hours. */
export function formatTotalHours(hours: number): string {
  const text = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
  }).format(hours);
  return `${text} jam`;
}

/**
 * The F7 marker for a kitchen middle day, verbatim from the PRD: the cafe's
 * quiet stretch around the lone kitchen shift. It belongs to the `MIDDLE`
 * code, which only kitchen ever holds, so no position check rides along.
 */
export const MIDDLE_CLOSING_NOTICE = 'Dapur tutup 07.30–11.00 & 19.00–23.00';
