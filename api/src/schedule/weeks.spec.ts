import { describe, expect, it } from 'vitest';
import {
  nextMonday,
  publishedWeekBounds,
  requestDeadlineFor,
  runningMonday,
} from './weeks';

/**
 * The minggu target and its jendela request deadline (ADR 0004 + ADR 0002):
 * the manager composes next week's schedule on Sunday, and the window shuts at
 * Minggu 12.00 WITA — Sunday 04.00 UTC, the day before the week opens.
 */
describe('minggu target', () => {
  it('is next Monday when today is Monday', () => {
    expect(nextMonday(new Date('2026-11-09T10:00:00.000Z'))).toEqual(
      new Date('2026-11-16T00:00:00.000Z'),
    );
  });

  it('is tomorrow when today is Sunday', () => {
    expect(nextMonday(new Date('2026-11-15T03:00:00.000Z'))).toEqual(
      new Date('2026-11-16T00:00:00.000Z'),
    );
  });

  it('is the coming Monday from midweek', () => {
    expect(nextMonday(new Date('2026-11-11T23:30:00.000Z'))).toEqual(
      new Date('2026-11-16T00:00:00.000Z'),
    );
  });

  it('reads today in WITA, not UTC, just after midnight', () => {
    // 16.30 UTC on Sunday is 00.30 WITA on Monday: the current week already
    // opened, so the minggu target is the Monday after it.
    expect(nextMonday(new Date('2026-11-15T16:30:00.000Z'))).toEqual(
      new Date('2026-11-23T00:00:00.000Z'),
    );
  });

  it('is tomorrow while it is still Sunday evening in WITA', () => {
    // 15.59 UTC on Sunday is 23.59 WITA the same Sunday.
    expect(nextMonday(new Date('2026-11-15T15:59:00.000Z'))).toEqual(
      new Date('2026-11-16T00:00:00.000Z'),
    );
  });
});

describe('publishedWeekBounds', () => {
  it('spans the target week and the running week one before it', () => {
    const { running, target } = publishedWeekBounds(
      new Date('2026-11-09T10:00:00.000Z'),
    );
    expect(target).toBe(new Date('2026-11-16T00:00:00.000Z').getTime());
    expect(running).toBe(new Date('2026-11-09T00:00:00.000Z').getTime());
  });

  it('keeps the two bounds exactly one week apart', () => {
    const { running, target } = publishedWeekBounds(
      new Date('2026-11-15T16:30:00.000Z'),
    );
    expect(target - running).toBe(7 * 86_400_000);
  });
});

describe('minggu berjalan', () => {
  it('is the Monday the staff are living through, one week before the target', () => {
    // Senin 9 Nov 10.00 WITA (02.00 UTC): the running week opened that same
    // Monday, and the minggu target is the next one (ADR 0004/0005).
    expect(runningMonday(new Date('2026-11-09T02:00:00.000Z'))).toEqual(
      new Date('2026-11-09T00:00:00.000Z'),
    );
  });

  it('stays on this Monday when the UTC date is still yesterday', () => {
    // 17.30 UTC on Sunday is 01.30 WITA on Monday: the running week just
    // opened, so it is the Monday that started, not the Sunday's week.
    expect(runningMonday(new Date('2026-11-15T17:30:00.000Z'))).toEqual(
      new Date('2026-11-16T00:00:00.000Z'),
    );
  });

  it('is exactly the target minus seven days across the WITA midnight edge', () => {
    const now = new Date('2026-11-08T17:00:00.000Z'); // 01.00 WITA Senin
    expect(runningMonday(now).getTime()).toBe(
      nextMonday(now).getTime() - 7 * 86_400_000,
    );
  });
});

describe('request deadline', () => {
  it('is Minggu 12.00 WITA before the week opens', () => {
    // 04.00 UTC on the Sunday is 12.00 WITA (UTC+8) the same day.
    expect(requestDeadlineFor(new Date('2026-11-16T00:00:00.000Z'))).toEqual(
      new Date('2026-11-15T04:00:00.000Z'),
    );
  });

  it('lands one day before the Monday that opens the week', () => {
    const start = new Date('2026-11-23T00:00:00.000Z');
    const deadline = requestDeadlineFor(start);
    expect(start.getTime() - deadline.getTime()).toBe(20 * 3_600_000);
    expect(deadline.getUTCDay()).toBe(0); // Sunday
  });
});
