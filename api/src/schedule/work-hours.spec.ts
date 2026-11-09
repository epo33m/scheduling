import { describe, expect, it } from 'vitest';
import { shiftDurationHours } from './work-hours';

/**
 * Worked examples from PRD §Jenis shift, plus the ten-hour PAGI the F7
 * integration test puts in the table: the total is arithmetic on the row,
 * never a per-shift constant.
 */
describe('shiftDurationHours', () => {
  it('is eight hours for each of the three catalog shifts', () => {
    expect(shiftDurationHours('07:30', '15:30')).toBe(8);
    expect(shiftDurationHours('15:00', '23:00')).toBe(8);
    expect(shiftDurationHours('11:00', '19:00')).toBe(8);
  });

  it('follows the row when the hours differ from the catalog', () => {
    expect(shiftDurationHours('07:30', '17:30')).toBe(10);
  });

  it('carries the half hour without rounding', () => {
    expect(shiftDurationHours('07:30', '12:00')).toBe(4.5);
  });
});
