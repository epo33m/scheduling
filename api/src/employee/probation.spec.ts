import { advanceProbation, witaDate } from './probation';

// A @db.Date column comes back as midnight UTC, so these literals stand for
// the calendar date the manager typed, not a moment on a clock.
const nov1 = new Date('2026-11-01T00:00:00.000Z');

describe('advanceProbation', () => {
  it('advances to tetap the day after probation_end_date, in WITA', () => {
    // 2026-11-02 09:00 WITA.
    const now = new Date('2026-11-02T01:00:00.000Z');
    expect(advanceProbation('probation', nov1, now)).toBe('tetap');
  });

  it('stays probation on the end date itself (the date has not passed yet)', () => {
    // 2026-11-01 09:00 WITA.
    const now = new Date('2026-11-01T01:00:00.000Z');
    expect(advanceProbation('probation', nov1, now)).toBeNull();
  });

  it('stays probation before the end date', () => {
    const now = new Date('2026-10-31T01:00:00.000Z');
    expect(advanceProbation('probation', nov1, now)).toBeNull();
  });

  it('counts the date as passed on a WITA day that is still the day before in UTC', () => {
    // 2026-11-01 20:00 UTC is already 2026-11-02 04:00 WITA.
    const now = new Date('2026-11-01T20:00:00.000Z');
    expect(advanceProbation('probation', nov1, now)).toBe('tetap');
  });

  it('leaves an already-tetap row alone', () => {
    const now = new Date('2027-01-01T01:00:00.000Z');
    expect(advanceProbation('tetap', nov1, now)).toBeNull();
  });

  it('cannot advance a probation row with no end date', () => {
    const now = new Date('2027-01-01T01:00:00.000Z');
    expect(advanceProbation('probation', null, now)).toBeNull();
  });
});

describe('witaDate', () => {
  it('reads the calendar day in Asia/Makassar, not the UTC day', () => {
    // 21:00 UTC on the 1st is 05:00 WITA on the 2nd.
    expect(witaDate(new Date('2026-11-01T21:00:00.000Z'))).toBe('2026-11-02');
  });
});
