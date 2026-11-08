import {
  EMPLOYEE_POSITIONS,
  EMPLOYEE_ROLES,
  EMPLOYEE_STATUSES,
  SHIFT_CODES,
} from '@repo/types';
import { describe, expect, it } from 'vitest';
import {
  EmployeePosition,
  EmployeeRole,
  EmployeeStatus,
  ShiftCode,
} from '../generated/prisma/enums';

/**
 * Prisma cannot import from @repo/types, so the enums in api/prisma/schema
 * restate the shared lists. These assertions are the link between the two
 * definitions: adding or removing a code on one side without the other fails
 * `bun run test` instead of drifting.
 */
describe('prisma schema vocabulary', () => {
  it('matches SHIFT_CODES', () => {
    expect(Object.keys(ShiftCode).sort()).toEqual([...SHIFT_CODES].sort());
  });

  it('matches EMPLOYEE_POSITIONS', () => {
    expect(Object.keys(EmployeePosition).sort()).toEqual(
      [...EMPLOYEE_POSITIONS].sort(),
    );
  });

  it('matches EMPLOYEE_ROLES', () => {
    expect(Object.keys(EmployeeRole).sort()).toEqual([...EMPLOYEE_ROLES].sort());
  });

  it('matches EMPLOYEE_STATUSES', () => {
    expect(Object.keys(EmployeeStatus).sort()).toEqual(
      [...EMPLOYEE_STATUSES].sort(),
    );
  });
});
