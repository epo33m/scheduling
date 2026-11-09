import { SHIFT_CODES, WEEK_ALIASES } from '@repo/types';
import type { WeekAlias } from '@repo/types';
import { z } from 'zod';
import { calendarDateSchema } from './employee';

/**
 * The manager's edit of one draft cell (F5): a staff member, a day of the
 * minggu target, and either a shift or null for libur. Which shifts a position
 * may take — middle is kitchen only — is checked in the api, where the
 * employee's position is known.
 */
export const assignmentEditSchema = z.object({
  employeeId: z.uuid(),
  tanggal: calendarDateSchema,
  shiftCode: z.enum(SHIFT_CODES).nullable(),
});

export type AssignmentEditInput = z.infer<typeof assignmentEditSchema>;

export function parseAssignmentEdit(
  body: unknown,
): { ok: true; value: AssignmentEditInput } | { ok: false; message: string } {
  const result = assignmentEditSchema.safeParse(body);
  return result.success
    ? { ok: true, value: result.data }
    : {
        ok: false,
        message:
          'Perubahan jadwal tidak valid. Pilih pagi, sore, middle, atau libur.',
      };
}

/**
 * The `week` alias a manager route was called with (issue #20). An absent
 * value is not an error: the caller simply means the minggu target, which is
 * what every draft route did before the toggle existed. Anything other than
 * `running` or `target` is refused so a typo cannot silently edit the wrong
 * week.
 */
export function parseWeekAlias(raw: unknown): WeekAlias | null {
  return typeof raw === 'string' &&
    (WEEK_ALIASES as readonly string[]).includes(raw)
    ? (raw as WeekAlias)
    : null;
}
