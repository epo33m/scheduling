import { EMPLOYEE_POSITIONS, SHIFT_CODES } from '@repo/types';
import { z } from 'zod';

export const shiftCodeSchema = z.enum(SHIFT_CODES);

export const employeePositionSchema = z.enum(EMPLOYEE_POSITIONS);

/** Local WITA wall-clock time, `HH:MM`. */
export const localTimeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'expected HH:MM');

/** Shape a `shift_type` seed row must satisfy (PRD §Jenis shift). */
export const shiftTypeSeedSchema = z.object({
  code: shiftCodeSchema,
  startTime: localTimeSchema,
  endTime: localTimeSchema,
  positions: z.array(employeePositionSchema).min(1),
});

export type ShiftTypeSeed = z.infer<typeof shiftTypeSeedSchema>;
