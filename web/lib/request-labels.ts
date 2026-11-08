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
