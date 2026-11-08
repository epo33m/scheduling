import { describe, expect, it } from 'vitest';
import { safeNext } from './safe-next';

describe('safeNext', () => {
  it('keeps a same-site path', () => {
    expect(safeNext('/jadwal')).toBe('/jadwal');
  });

  it('keeps the query string of that path', () => {
    expect(safeNext('/jadwal?tanggal=2026-11-09')).toBe(
      '/jadwal?tanggal=2026-11-09',
    );
  });

  it('falls back when there is no destination', () => {
    expect(safeNext(undefined)).toBe('/');
    expect(safeNext(null)).toBe('/');
    expect(safeNext('')).toBe('/');
  });

  it('refuses an absolute URL', () => {
    expect(safeNext('https://example.test/jadwal')).toBe('/');
  });

  it('refuses a protocol-relative URL', () => {
    expect(safeNext('//example.test/jadwal')).toBe('/');
  });

  it('refuses a backslash that some browsers read as a host break', () => {
    expect(safeNext('/\\example.test/jadwal')).toBe('/');
  });

  it('refuses control characters that the URL parser strips', () => {
    // `new URL('/\t/evil.test', origin)` resolves to host evil.test.
    expect(safeNext('/\t/evil.test')).toBe('/');
    expect(safeNext('/\n/evil.test')).toBe('/');
    expect(safeNext('/jadwal\u0000')).toBe('/');
  });
});
