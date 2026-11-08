import { describe, expect, it } from 'vitest';
import { createEmployeeSchema } from './employee';

describe('createEmployeeSchema', () => {
  it('accepts a complete probation row and applies the role/status defaults', () => {
    const parsed = createEmployeeSchema.parse({
      name: 'Rian',
      email: 'rian@kyne.test',
      position: 'kitchen',
      probationEndDate: '2026-12-01',
    });

    expect(parsed).toMatchObject({
      name: 'Rian',
      email: 'rian@kyne.test',
      position: 'kitchen',
      role: 'staff',
      status: 'probation',
      probationEndDate: '2026-12-01',
    });
  });

  it('trims and lower-cases the email so it matches the whitelist lookup', () => {
    const parsed = createEmployeeSchema.parse({
      name: 'Maya',
      email: '  MAYA@KYNE.TEST  ',
      position: 'bar',
      role: 'manager',
      status: 'tetap',
    });

    expect(parsed.email).toBe('maya@kyne.test');
  });

  it('requires a probation end date while the status is probation', () => {
    expect(() =>
      createEmployeeSchema.parse({
        name: 'Dewi',
        email: 'dewi@kyne.test',
        position: 'bar',
        status: 'probation',
      }),
    ).toThrow();
  });

  it('lets a tetap row omit the probation end date', () => {
    expect(() =>
      createEmployeeSchema.parse({
        name: 'Ayu',
        email: 'ayu@kyne.test',
        position: 'kitchen',
        status: 'tetap',
      }),
    ).not.toThrow();
  });

  it('rejects a value that is not an email', () => {
    expect(() =>
      createEmployeeSchema.parse({
        name: 'X',
        email: 'not-an-email',
        position: 'bar',
        status: 'tetap',
      }),
    ).toThrow();
  });

  it('rejects a blank name', () => {
    expect(() =>
      createEmployeeSchema.parse({
        name: '   ',
        email: 'a@kyne.test',
        position: 'bar',
        status: 'tetap',
      }),
    ).toThrow();
  });

  it('rejects a position outside bar and kitchen', () => {
    expect(() =>
      createEmployeeSchema.parse({
        name: 'Y',
        email: 'y@kyne.test',
        position: 'waiter',
        status: 'tetap',
      }),
    ).toThrow();
  });
});
