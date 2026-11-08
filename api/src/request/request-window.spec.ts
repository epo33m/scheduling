import { describe, expect, it } from 'vitest';
import { isWindowOpen, mostRecentWeek, resolveOpenWindow } from './request-window';

/**
 * The window-lock from ADR 0002: no cron, no stored open/closed flag. A request
 * is accepted while `now` is at or before the week's `request_deadline` and
 * rejected the instant it passes. Deadlines are UTC instants; the WITA wall
 * clock only decides *which* instant is stored, not this comparison.
 */
describe('jendela request window-lock', () => {
  const deadline = new Date('2026-11-15T04:00:00.000Z'); // Minggu 12.00 WITA

  it('is open up to the deadline instant inclusive', () => {
    expect(isWindowOpen(deadline, new Date('2026-11-15T03:59:59.999Z'))).toBe(
      true,
    );
    expect(isWindowOpen(deadline, deadline)).toBe(true);
  });

  it('locks once now is past the deadline', () => {
    expect(isWindowOpen(deadline, new Date('2026-11-15T04:00:00.001Z'))).toBe(
      false,
    );
  });
});

describe('the open minggu target', () => {
  const nextWeek = { id: 'w2', requestDeadline: new Date('2026-11-15T04:00:00Z') };
  const followingWeek = {
    id: 'w3',
    requestDeadline: new Date('2026-11-22T04:00:00Z'),
  };
  const pastWeek = { id: 'w1', requestDeadline: new Date('2026-11-08T04:00:00Z') };

  it('resolves the nearest week whose deadline has not passed', () => {
    const now = new Date('2026-11-10T00:00:00Z');
    expect(
      resolveOpenWindow([followingWeek, pastWeek, nextWeek], now)?.id,
    ).toBe('w2');
  });

  it('is null when every window is locked', () => {
    const now = new Date('2026-11-30T00:00:00Z');
    expect(resolveOpenWindow([pastWeek, nextWeek], now)).toBeNull();
  });
});

describe('mostRecentWeek', () => {
  it('picks the latest startDate so a just-closed week stays visible', () => {
    const older = { id: 'w1', startDate: new Date('2026-11-02T00:00:00Z') };
    const newer = { id: 'w2', startDate: new Date('2026-11-09T00:00:00Z') };
    expect(mostRecentWeek([older, newer])?.id).toBe('w2');
    expect(mostRecentWeek([])).toBeNull();
  });
});
