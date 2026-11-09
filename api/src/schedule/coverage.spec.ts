import type { EmployeePosition, ShiftCode } from '@repo/types';
import { describe, expect, it } from 'vitest';
import { validateCoverage, type CoveredCell } from './coverage';

/**
 * Coverage validation (T7, PRD §Aturan bisnis). Jumat–Minggu is busy: two bar
 * and one kitchen per shift. Senin–Kamis is quiet: one bar per shift, and the
 * kitchen for the day is covered by one person on any shift, middle included.
 * Every expectation is a worked example of one PRD row, so a rule change
 * breaks exactly one test.
 */

const WEEK = '2026-11-16'; // a Monday
const DAY_MS = 86_400_000;

/** `WEEK` shifted by whole days: 0 = Senin, 4 = Jumat, 6 = Minggu. */
function day(offset: number): string {
  return new Date(new Date(`${WEEK}T00:00:00.000Z`).getTime() + offset * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function cell(
  position: EmployeePosition,
  tanggal: string,
  shiftCode: ShiftCode | null,
): CoveredCell {
  return { position, tanggal, shiftCode };
}

/** A quiet day that passes: one bar per shift, one kitchen per shift. */
function quietDay(tanggal: string): CoveredCell[] {
  return [
    cell('bar', tanggal, 'PAGI'),
    cell('bar', tanggal, 'SORE'),
    cell('kitchen', tanggal, 'PAGI'),
    cell('kitchen', tanggal, 'SORE'),
  ];
}

/** A busy day that passes: two bar per shift, one kitchen per shift. */
function busyDay(tanggal: string): CoveredCell[] {
  return [
    cell('bar', tanggal, 'PAGI'),
    cell('bar', tanggal, 'PAGI'),
    cell('bar', tanggal, 'SORE'),
    cell('bar', tanggal, 'SORE'),
    cell('kitchen', tanggal, 'PAGI'),
    cell('kitchen', tanggal, 'SORE'),
  ];
}

/** Senin–Kamis quiet, Jumat–Minggu busy: the whole week, nothing to warn about. */
function coveredWeek(): CoveredCell[] {
  return [0, 1, 2, 3, 4, 5, 6].flatMap((offset) =>
    offset <= 3 ? quietDay(day(offset)) : busyDay(day(offset)),
  );
}

/** The covered week with one day's cells replaced. */
function weekWith(offset: number, cells: CoveredCell[]): CoveredCell[] {
  return coveredWeek()
    .filter((row) => row.tanggal !== day(offset))
    .concat(cells);
}

describe('a covered week', () => {
  it('raises no warning', () => {
    expect(validateCoverage(WEEK, coveredWeek())).toEqual([]);
  });

  it('checks a day nobody has touched yet instead of calling it covered', () => {
    const warnings = validateCoverage(
      WEEK,
      coveredWeek().filter((row) => row.tanggal !== day(2)),
    );

    expect(warnings.map((w) => w.tanggal)).toEqual([day(2), day(2), day(2)]);
  });

  it('reports every day of an empty week', () => {
    // Four quiet days at three shortfalls, three busy days at four.
    expect(validateCoverage(WEEK, [])).toHaveLength(24);
  });
});

describe('Senin–Kamis (quiet days)', () => {
  it('raises no warning when every shift has one bar', () => {
    const warnings = validateCoverage(WEEK, quietDay(day(0)));

    expect(warnings.filter((w) => w.tanggal === day(0))).toEqual([]);
  });

  it('warns about a shift with no bar at all', () => {
    const warnings = validateCoverage(
      WEEK,
      weekWith(2, [
        cell('bar', day(2), 'PAGI'),
        cell('kitchen', day(2), 'PAGI'),
        cell('kitchen', day(2), 'SORE'),
      ]),
    );

    expect(warnings).toEqual([
      {
        tanggal: day(2),
        position: 'bar',
        shiftCode: 'SORE',
        headcount: 0,
        minimum: 1,
      },
    ]);
  });

  it('accepts three bar split 2+1 as the manager decided', () => {
    const warnings = validateCoverage(
      WEEK,
      weekWith(3, [
        cell('bar', day(3), 'PAGI'),
        cell('bar', day(3), 'PAGI'),
        cell('bar', day(3), 'SORE'),
        cell('kitchen', day(3), 'PAGI'),
        cell('kitchen', day(3), 'SORE'),
      ]),
    );

    expect(warnings).toEqual([]);
  });

  it('warns when the kitchen has neither a staff nor a middle', () => {
    const warnings = validateCoverage(
      WEEK,
      weekWith(1, [
        cell('bar', day(1), 'PAGI'),
        cell('bar', day(1), 'SORE'),
        cell('kitchen', day(1), null),
        cell('kitchen', day(1), null),
      ]),
    );

    expect(warnings).toEqual([
      {
        tanggal: day(1),
        position: 'kitchen',
        shiftCode: null,
        headcount: 0,
        minimum: 1,
      },
    ]);
  });

  it('accepts a lone kitchen on middle as the day coverage', () => {
    const warnings = validateCoverage(
      WEEK,
      weekWith(1, [
        cell('bar', day(1), 'PAGI'),
        cell('bar', day(1), 'SORE'),
        cell('kitchen', day(1), null),
        cell('kitchen', day(1), 'MIDDLE'),
      ]),
    );

    expect(warnings).toEqual([]);
  });
});

describe('Jumat–Minggu (busy days)', () => {
  it('accepts two bar and one kitchen per shift', () => {
    const warnings = validateCoverage(WEEK, busyDay(day(4)));

    expect(warnings.filter((w) => w.tanggal === day(4))).toEqual([]);
  });

  it('warns when a shift has only one bar', () => {
    const warnings = validateCoverage(
      WEEK,
      weekWith(4, [
        cell('bar', day(4), 'PAGI'),
        cell('bar', day(4), 'SORE'),
        cell('bar', day(4), 'SORE'),
        cell('kitchen', day(4), 'PAGI'),
        cell('kitchen', day(4), 'SORE'),
      ]),
    );

    expect(warnings).toEqual([
      {
        tanggal: day(4),
        position: 'bar',
        shiftCode: 'PAGI',
        headcount: 1,
        minimum: 2,
      },
    ]);
  });

  it('warns when a shift has no kitchen', () => {
    const warnings = validateCoverage(
      WEEK,
      weekWith(5, [
        cell('bar', day(5), 'PAGI'),
        cell('bar', day(5), 'PAGI'),
        cell('bar', day(5), 'SORE'),
        cell('bar', day(5), 'SORE'),
        cell('kitchen', day(5), 'PAGI'),
        cell('kitchen', day(5), null),
      ]),
    );

    expect(warnings).toEqual([
      {
        tanggal: day(5),
        position: 'kitchen',
        shiftCode: 'SORE',
        headcount: 0,
        minimum: 1,
      },
    ]);
  });

  it('does not count a middle as pagi or sore', () => {
    const warnings = validateCoverage(
      WEEK,
      weekWith(6, [
        cell('bar', day(6), 'PAGI'),
        cell('bar', day(6), 'PAGI'),
        cell('bar', day(6), 'SORE'),
        cell('bar', day(6), 'SORE'),
        cell('kitchen', day(6), 'PAGI'),
        cell('kitchen', day(6), 'MIDDLE'),
      ]),
    );

    expect(warnings).toEqual([
      {
        tanggal: day(6),
        position: 'kitchen',
        shiftCode: 'SORE',
        headcount: 0,
        minimum: 1,
      },
    ]);
  });
});

describe('warning order', () => {
  it('lists warnings day by day, pagi before sore, bar before kitchen', () => {
    const warnings = validateCoverage(
      WEEK,
      coveredWeek()
        .filter((row) => row.tanggal !== day(0) && row.tanggal !== day(4))
        .concat(
          // Senin drops every bar and every kitchen.
          [cell('bar', day(0), null), cell('kitchen', day(0), null)],
          // Jumat keeps its bar crew but loses the kitchen entirely.
          [
            cell('bar', day(4), 'PAGI'),
            cell('bar', day(4), 'PAGI'),
            cell('bar', day(4), 'SORE'),
            cell('bar', day(4), 'SORE'),
          ],
        ),
    );

    expect(warnings.map((w) => [w.tanggal, w.position, w.shiftCode])).toEqual([
      [day(0), 'bar', 'PAGI'],
      [day(0), 'bar', 'SORE'],
      [day(0), 'kitchen', null],
      [day(4), 'kitchen', 'PAGI'],
      [day(4), 'kitchen', 'SORE'],
    ]);
  });
});
