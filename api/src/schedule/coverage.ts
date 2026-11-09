import type { CoverageWarning, DraftAssignment } from '@repo/types';
import { addDays, isQuietDay } from './weeks';

/**
 * Coverage validation (F5, PRD §Aturan bisnis). Pure data in, warnings out: no
 * Prisma, no clock, so every rule is a unit test. The manager reads these
 * before publish and decides; nothing here blocks a save or an edit.
 *
 * Jumat–Minggu is busy: two bar and one kitchen per shift.
 * Senin–Kamis is quiet: one bar per shift, and the kitchen is covered for the
 * day by one person on any shift, middle included, since middle is exactly the
 * lone kitchen left after a peer's libur.
 */

/** The fields the validator reads; a compiled, stored, or incoming row all fit. */
export type CoveredCell = Pick<
  DraftAssignment,
  'position' | 'tanggal' | 'shiftCode'
>;

/**
 * The shifts a crew is measured in. Middle is not one of them: it is a kitchen
 * of one covering the day, never a pagi or sore slot.
 */
const DAY_SHIFTS = ['PAGI', 'SORE'] as const;

const DAYS_PER_WEEK = 7;

/**
 * Every shortfall in the week, day by day, pagi before sore, bar before
 * kitchen. All seven days are checked, so a day nobody has touched yet reads as
 * short rather than as covered; an empty list means the whole week holds up.
 */
export function validateCoverage(
  weekStartDate: string,
  cells: readonly CoveredCell[],
): CoverageWarning[] {
  const byDay = new Map<string, CoveredCell[]>();
  for (const cell of cells) {
    const day = byDay.get(cell.tanggal) ?? [];
    day.push(cell);
    byDay.set(cell.tanggal, day);
  }

  const warnings: CoverageWarning[] = [];

  for (let offset = 0; offset < DAYS_PER_WEEK; offset += 1) {
    const tanggal = addDays(weekStartDate, offset);
    const day = byDay.get(tanggal) ?? [];
    const busy = !isQuietDay(tanggal);

    for (const position of ['bar', 'kitchen'] as const) {
      // On quiet days the kitchen is measured per day, not per shift.
      if (!busy && position === 'kitchen') {
        continue;
      }

      for (const shiftCode of DAY_SHIFTS) {
        const headcount = day.filter(
          (cell) => cell.position === position && cell.shiftCode === shiftCode,
        ).length;
        const minimum = position === 'bar' && busy ? 2 : 1;

        if (headcount < minimum) {
          warnings.push({
            tanggal,
            position,
            shiftCode,
            headcount,
            minimum,
          });
        }
      }
    }

    if (!busy) {
      const headcount = day.filter(
        (cell) => cell.position === 'kitchen' && cell.shiftCode !== null,
      ).length;

      if (headcount < 1) {
        warnings.push({
          tanggal,
          position: 'kitchen',
          shiftCode: null,
          headcount,
          minimum: 1,
        });
      }
    }
  }

  return warnings;
}
