import { describe, expect, it } from 'vitest';
import {
  formatDayShort,
  formatShiftTime,
  formatTotalHours,
} from './request-labels';

describe('formatShiftTime', () => {
  it('writes the stored colon clock in the PRD dot style', () => {
    expect(formatShiftTime('07:30', '15:30')).toBe('07.30–15.30');
    expect(formatShiftTime('15:00', '23:00')).toBe('15.00–23.00');
  });
});

describe('formatTotalHours', () => {
  it('counts whole hours without a decimal', () => {
    expect(formatTotalHours(56)).toBe('56 jam');
  });

  it('keeps a half day visible with the id-ID decimal comma', () => {
    expect(formatTotalHours(36.5)).toBe('36,5 jam');
  });

  it('says zero rather than hiding an all-libur week', () => {
    expect(formatTotalHours(0)).toBe('0 jam');
  });
});

describe('formatDayShort', () => {
  it('is the day number and a short month', () => {
    expect(formatDayShort('2026-11-09')).toBe('9 Nov');
  });

  it('holds the date across the WITA day boundary', () => {
    // Midnight UTC this date is still the same calendar day in WITA.
    expect(formatDayShort('2026-01-31')).toBe('31 Jan');
  });
});
