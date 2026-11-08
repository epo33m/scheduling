import { describe, expect, it } from 'vitest';
import { SHIFT_TYPE_CATALOG } from './shift';

describe('SHIFT_TYPE_CATALOG', () => {
  it('holds the three shifts from the PRD exactly once each', () => {
    expect(SHIFT_TYPE_CATALOG.map((shift) => shift.code)).toEqual([
      'PAGI',
      'SORE',
      'MIDDLE',
    ]);
  });

  it('carries the PRD hours for every shift', () => {
    expect(
      SHIFT_TYPE_CATALOG.map(({ code, startTime, endTime }) => [
        code,
        startTime,
        endTime,
      ]),
    ).toEqual([
      ['PAGI', '07:30', '15:30'],
      ['SORE', '15:00', '23:00'],
      ['MIDDLE', '11:00', '19:00'],
    ]);
  });

  it('applies pagi and sore to both positions, middle to kitchen only', () => {
    const positions = Object.fromEntries(
      SHIFT_TYPE_CATALOG.map((shift) => [shift.code, shift.positions]),
    );

    expect(positions).toEqual({
      PAGI: ['bar', 'kitchen'],
      SORE: ['bar', 'kitchen'],
      MIDDLE: ['kitchen'],
    });
  });
});
