import { describe, expect, it } from 'vitest';
import { isOffDayAllowed } from './off-day';

/**
 * Request libur only exists Senin–Kamis (PRD §Aturan bisnis, GLOSSARY "Hari
 * libur"): Jumat–Minggu are busy and everyone works. `tanggal` is a `@db.Date`
 * calendar day, which Prisma reads back as midnight UTC, so the UTC weekday is
 * the weekday the staff member picked — no time-zone shuffle.
 */
describe('request libur weekday rule', () => {
  it.each([
    ['Senin', '2026-11-09'],
    ['Selasa', '2026-11-10'],
    ['Rabu', '2026-11-11'],
    ['Kamis', '2026-11-12'],
  ])('allows %s', (_label, iso) => {
    expect(isOffDayAllowed(new Date(`${iso}T00:00:00.000Z`))).toBe(true);
  });

  it.each([
    ['Jumat', '2026-11-13'],
    ['Sabtu', '2026-11-14'],
    ['Minggu', '2026-11-15'],
  ])('refuses %s', (_label, iso) => {
    expect(isOffDayAllowed(new Date(`${iso}T00:00:00.000Z`))).toBe(false);
  });
});
