import type { AssignmentSource, ShiftCode } from '@repo/types';
import { describe, expect, it } from 'vitest';
import {
  compileDraft,
  type CompileInput,
  type CompiledAssignment,
  type CompileStaff,
} from './compiler';

/**
 * The draft compiler (F5) reproduces alur utama 4.1–4.4 from last week's
 * schedule plus the manager's approved requests. Every expectation below is a
 * worked example of one PRD sentence, so a rule change breaks exactly one test.
 */

const WEEK = '2026-11-16'; // a Monday
const DAY_MS = 86_400_000;

/** `WEEK` shifted by whole days — the minggu target's seven days. */
function day(offset: number): string {
  return shift(WEEK, offset);
}

/** The same weekday one week earlier: what step 4.1 copies from. */
function lastWeek(offset: number): string {
  return shift(WEEK, offset - 7);
}

function shift(iso: string, days: number): string {
  return new Date(new Date(`${iso}T00:00:00.000Z`).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

const barA: CompileStaff = { id: 'bar-a', name: 'Ayu', position: 'bar' };
const barB: CompileStaff = { id: 'bar-b', name: 'Budi', position: 'bar' };
const kitA: CompileStaff = { id: 'kit-a', name: 'Kiki', position: 'kitchen' };
const kitB: CompileStaff = { id: 'kit-b', name: 'Komang', position: 'kitchen' };

/** One staff member's whole previous week filled with the same shift (or libur). */
function weekOf(employeeId: string, shiftCode: ShiftCode | null) {
  return [0, 1, 2, 3, 4, 5, 6].map((offset) => ({
    employeeId,
    tanggal: lastWeek(offset),
    shiftCode,
  }));
}

function input(overrides: Partial<CompileInput> = {}): CompileInput {
  return {
    weekStartDate: WEEK,
    staff: [],
    previousWeek: [],
    offRequests: [],
    shiftRequests: [],
    ...overrides,
  };
}

function cell(
  assignments: CompiledAssignment[],
  employeeId: string,
  tanggal: string,
): CompiledAssignment {
  const found = assignments.find(
    (assignment) =>
      assignment.employeeId === employeeId && assignment.tanggal === tanggal,
  );
  if (!found) {
    throw new Error(`no assignment for ${employeeId} on ${tanggal}`);
  }
  return found;
}

function place(
  assignments: CompiledAssignment[],
  employeeId: string,
  tanggal: string,
): { shiftCode: ShiftCode | null; source: AssignmentSource } {
  const { shiftCode, source } = cell(assignments, employeeId, tanggal);
  return { shiftCode, source };
}

describe('step 4.1 — copy last week and strip its libur', () => {
  it('copies the shift held on the same weekday last week', () => {
    const assignments = compileDraft(
      input({
        staff: [barA],
        previousWeek: [
          { employeeId: barA.id, tanggal: lastWeek(0), shiftCode: 'PAGI' },
          { employeeId: barA.id, tanggal: lastWeek(1), shiftCode: 'SORE' },
        ],
      }),
    );

    expect(place(assignments, barA.id, day(0))).toEqual({
      shiftCode: 'PAGI',
      source: 'copy',
    });
    expect(place(assignments, barA.id, day(1))).toEqual({
      shiftCode: 'SORE',
      source: 'copy',
    });
  });

  it('does not copy last week’s libur; the day takes the most frequent shift', () => {
    const assignments = compileDraft(
      input({
        staff: [barA],
        previousWeek: [
          { employeeId: barA.id, tanggal: lastWeek(0), shiftCode: 'PAGI' },
          { employeeId: barA.id, tanggal: lastWeek(1), shiftCode: null },
          { employeeId: barA.id, tanggal: lastWeek(2), shiftCode: 'PAGI' },
          { employeeId: barA.id, tanggal: lastWeek(3), shiftCode: 'SORE' },
        ],
      }),
    );

    // Libur is stripped, and PAGI wins 2:1 among the shifts Ayu actually held.
    expect(place(assignments, barA.id, day(1))).toEqual({
      shiftCode: 'PAGI',
      source: 'copy',
    });
  });

  it('fills a day last week has no row for with the most frequent shift', () => {
    const assignments = compileDraft(
      input({
        staff: [barA],
        previousWeek: [
          { employeeId: barA.id, tanggal: lastWeek(0), shiftCode: 'SORE' },
          { employeeId: barA.id, tanggal: lastWeek(2), shiftCode: 'SORE' },
          { employeeId: barA.id, tanggal: lastWeek(3), shiftCode: 'PAGI' },
        ],
      }),
    );

    expect(place(assignments, barA.id, day(1))).toEqual({
      shiftCode: 'SORE',
      source: 'copy',
    });
  });

  it('never copies last week’s middle; the day is refilled with a real shift', () => {
    const assignments = compileDraft(
      input({
        staff: [barA],
        previousWeek: [
          { employeeId: barA.id, tanggal: lastWeek(0), shiftCode: 'MIDDLE' },
          { employeeId: barA.id, tanggal: lastWeek(1), shiftCode: 'SORE' },
          { employeeId: barA.id, tanggal: lastWeek(2), shiftCode: 'SORE' },
        ],
      }),
    );

    expect(place(assignments, barA.id, day(0))).toEqual({
      shiftCode: 'SORE',
      source: 'copy',
    });
  });

  it('leaves every day libur when the staff member has no history yet', () => {
    const assignments = compileDraft(input({ staff: [barA] }));

    expect(assignments).toHaveLength(7);
    for (let offset = 0; offset < 7; offset += 1) {
      expect(place(assignments, barA.id, day(offset))).toEqual({
        shiftCode: null,
        source: 'copy',
      });
    }
  });
});

describe('step 4.2 — apply the approved request libur', () => {
  it('turns an approved day-off request into libur', () => {
    const assignments = compileDraft(
      input({
        staff: [barA],
        previousWeek: weekOf(barA.id, 'PAGI'),
        offRequests: [{ employeeId: barA.id, tanggal: day(2) }],
      }),
    );

    expect(place(assignments, barA.id, day(2))).toEqual({
      shiftCode: null,
      source: 'request',
    });
    // The other days keep the copy.
    expect(place(assignments, barA.id, day(3))).toEqual({
      shiftCode: 'PAGI',
      source: 'copy',
    });
  });
});

describe('step 4.3 — apply the approved request shift', () => {
  it('places the requested shift instead of the copied one', () => {
    const assignments = compileDraft(
      input({
        staff: [barA],
        previousWeek: weekOf(barA.id, 'PAGI'),
        shiftRequests: [
          { employeeId: barA.id, tanggal: day(4), shiftCode: 'SORE' },
        ],
      }),
    );

    expect(place(assignments, barA.id, day(4))).toEqual({
      shiftCode: 'SORE',
      source: 'request',
    });
  });

  it('keeps an approved day off over a shift request for the same day', () => {
    const assignments = compileDraft(
      input({
        staff: [barA],
        previousWeek: weekOf(barA.id, 'PAGI'),
        offRequests: [{ employeeId: barA.id, tanggal: day(1) }],
        shiftRequests: [
          { employeeId: barA.id, tanggal: day(1), shiftCode: 'SORE' },
        ],
      }),
    );

    expect(place(assignments, barA.id, day(1))).toEqual({
      shiftCode: null,
      source: 'request',
    });
  });
});

describe('step 4.4 — middle for the lone kitchen staff', () => {
  it('turns the working kitchen staff into middle when their peer is off', () => {
    const assignments = compileDraft(
      input({
        staff: [kitA, kitB],
        previousWeek: [...weekOf(kitA.id, 'PAGI'), ...weekOf(kitB.id, 'PAGI')],
        offRequests: [{ employeeId: kitA.id, tanggal: day(1) }],
      }),
    );

    expect(place(assignments, kitA.id, day(1))).toEqual({
      shiftCode: null,
      source: 'request',
    });
    expect(place(assignments, kitB.id, day(1))).toEqual({
      shiftCode: 'MIDDLE',
      source: 'auto_middle',
    });
    // Only that day: the next day both kitchen staff work pagi again.
    expect(place(assignments, kitB.id, day(2))).toEqual({
      shiftCode: 'PAGI',
      source: 'copy',
    });
  });

  it('voids the kitchen staff’s approved shift request on an auto-middle day', () => {
    const assignments = compileDraft(
      input({
        staff: [kitA, kitB],
        previousWeek: [...weekOf(kitA.id, 'PAGI'), ...weekOf(kitB.id, 'PAGI')],
        offRequests: [{ employeeId: kitA.id, tanggal: day(3) }],
        shiftRequests: [
          { employeeId: kitB.id, tanggal: day(3), shiftCode: 'SORE' },
        ],
      }),
    );

    expect(place(assignments, kitB.id, day(3))).toEqual({
      shiftCode: 'MIDDLE',
      source: 'auto_middle',
    });
  });

  it('leaves two working kitchen staff on their own shifts', () => {
    const assignments = compileDraft(
      input({
        staff: [kitA, kitB],
        previousWeek: [...weekOf(kitA.id, 'PAGI'), ...weekOf(kitB.id, 'SORE')],
      }),
    );

    expect(place(assignments, kitA.id, day(0))).toEqual({
      shiftCode: 'PAGI',
      source: 'copy',
    });
    expect(place(assignments, kitB.id, day(0))).toEqual({
      shiftCode: 'SORE',
      source: 'copy',
    });
  });

  it('leaves a lone bar staff alone — middle is kitchen only', () => {
    const assignments = compileDraft(
      input({
        staff: [barA, barB],
        previousWeek: [...weekOf(barA.id, 'PAGI'), ...weekOf(barB.id, 'SORE')],
        offRequests: [{ employeeId: barA.id, tanggal: day(0) }],
      }),
    );

    expect(place(assignments, barB.id, day(0))).toEqual({
      shiftCode: 'SORE',
      source: 'copy',
    });
  });

  it('promotes nobody when the whole kitchen is off', () => {
    const assignments = compileDraft(
      input({
        staff: [kitA, kitB],
        previousWeek: [...weekOf(kitA.id, 'PAGI'), ...weekOf(kitB.id, 'SORE')],
        offRequests: [
          { employeeId: kitA.id, tanggal: day(0) },
          { employeeId: kitB.id, tanggal: day(0) },
        ],
      }),
    );

    expect(place(assignments, kitA.id, day(0)).shiftCode).toBeNull();
    expect(place(assignments, kitB.id, day(0)).shiftCode).toBeNull();
  });
});

describe('draft shape', () => {
  it('covers every staff member on all seven days, in a stable order', () => {
    const assignments = compileDraft(
      input({
        staff: [kitB, barA, kitA, barB],
        previousWeek: [
          ...weekOf(kitA.id, 'PAGI'),
          ...weekOf(kitB.id, 'SORE'),
          ...weekOf(barA.id, 'PAGI'),
          ...weekOf(barB.id, 'SORE'),
        ],
      }),
    );

    expect(assignments).toHaveLength(4 * 7);
    expect(
      new Set(assignments.map((a) => `${a.employeeId}|${a.tanggal}`)).size,
    ).toBe(4 * 7);

    const keys = assignments.map((a) => `${a.tanggal}|${a.employeeId}`);
    expect(keys).toEqual([...keys].sort());
  });
});
