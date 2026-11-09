import { SHIFT_CODES } from '@repo/types';
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
