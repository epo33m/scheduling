import { describe, expect, it } from 'vitest';
import { addDays, targetMondayIso, witaCalendarDate } from './weeks';

/**
 * The minggu target rule (ADR 0004) lives here once so the api's `nextMonday`
 * and the e2e fixture cannot drift. These are the same boundaries the api
 * relies on: the Sunday composition day, an ordinary weekday, and the WITA
 * midnight edge where the UTC date is still the day before.
 */
describe('targetMondayIso', () => {
  it('is next Monday when today is Monday', () => {
    expect(targetMondayIso(new Date('2026-11-09T10:00:00.000Z'))).toBe(
      '2026-11-16',
    );
  });

  it('is tomorrow when today is Sunday', () => {
    expect(targetMondayIso(new Date('2026-11-15T03:00:00.000Z'))).toBe(
      '2026-11-16',
    );
  });

  it('is the coming Monday from midweek', () => {
    expect(targetMondayIso(new Date('2026-11-11T23:30:00.000Z'))).toBe(
      '2026-11-16',
    );
  });

  it('reads today in WITA, not UTC, just after midnight', () => {
    // 16.30 UTC on Sunday is 00.30 WITA on Monday: the running week already
    // opened, so the minggu target is the Monday after it.
    expect(targetMondayIso(new Date('2026-11-15T16:30:00.000Z'))).toBe(
      '2026-11-23',
    );
  });

  it('is tomorrow while it is still Sunday evening in WITA', () => {
    // 15.59 UTC on Sunday is 23.59 WITA the same Sunday.
    expect(targetMondayIso(new Date('2026-11-15T15:59:00.000Z'))).toBe(
      '2026-11-16',
    );
  });
});

describe('addDays', () => {
  it('shifts a calendar day by whole days', () => {
    expect(addDays('2026-11-16', -7)).toBe('2026-11-09');
    expect(addDays('2026-11-16', 7)).toBe('2026-11-23');
  });

  it('crosses a month edge without drifting', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('witaCalendarDate', () => {
  it('is the WITA day, ahead of the UTC day after 16.00 UTC', () => {
    expect(witaCalendarDate(new Date('2026-11-15T16:30:00.000Z'))).toBe(
      '2026-11-16',
    );
  });
});
