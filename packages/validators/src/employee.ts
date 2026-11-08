import {
  EMPLOYEE_POSITIONS,
  EMPLOYEE_ROLES,
  EMPLOYEE_STATUSES,
} from '@repo/types';
import { z } from 'zod';

/** A calendar date as `YYYY-MM-DD`, the shape the `@db.Date` column stores. */
export const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

/**
 * The manager's "add staff" payload (F2). The email is trimmed and lower-cased
 * here because the `email` column is a plain unique string that AuthGuard
 * looks up in lower case: a row must be written the same way or login misses.
 */
export const createEmployeeSchema = z
  .object({
    name: z.string().trim().min(1),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email()),
    position: z.enum(EMPLOYEE_POSITIONS),
    role: z.enum(EMPLOYEE_ROLES).default('staff'),
    status: z.enum(EMPLOYEE_STATUSES).default('probation'),
    probationEndDate: calendarDateSchema.nullish(),
  })
  .refine(
    (value) => value.status !== 'probation' || value.probationEndDate != null,
    {
      message: 'probation requires a probation end date',
      path: ['probationEndDate'],
    },
  );

export type CreateEmployee = z.infer<typeof createEmployeeSchema>;

/**
 * Parse a manager "add staff" payload without pushing the zod error shape onto
 * callers: the api only needs to know whether it is valid, and the first human
 * message when it is not. Zod stays inside this package.
 */
export function parseCreateEmployee(
  body: unknown,
): { ok: true; value: CreateEmployee } | { ok: false; message: string } {
  const result = createEmployeeSchema.safeParse(body);

  return result.success
    ? { ok: true, value: result.data }
    : {
        ok: false,
        message: result.error.issues[0]?.message ?? 'Data staf tidak valid.',
      };
}
