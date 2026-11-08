import { z } from 'zod';
import { calendarDateSchema } from './employee';

/**
 * The two shift codes a staff member may ask for. MIDDLE is excluded by design:
 * it is created by the scheduler when a kitchen peer is off (PRD §Jenis shift),
 * never requested. Keeping the literal here means the api and web share one
 * answer for "what can be picked" without the api importing zod.
 */
export const REQUESTABLE_SHIFT_CODES = ['PAGI', 'SORE'] as const;
export type RequestableShiftCode = (typeof REQUESTABLE_SHIFT_CODES)[number];

/**
 * A request libur body: the one calendar day the staff member wants off. The
 * Senin–Kamis rule and the "inside the minggu target" check live in the api,
 * because they need the resolved week; here we only pin the shape to a
 * `YYYY-MM-DD` date.
 */
export const offRequestSchema = z.object({
  tanggal: calendarDateSchema,
});
export type OffRequestInput = z.infer<typeof offRequestSchema>;

/** A request shift body: a day and the preferred pagi/sore shift for it. */
export const shiftRequestSchema = z.object({
  tanggal: calendarDateSchema,
  shiftCode: z.enum(REQUESTABLE_SHIFT_CODES),
});
export type ShiftRequestInput = z.infer<typeof shiftRequestSchema>;

/**
 * Parse helpers mirroring parseCreateEmployee: the controller learns only
 * "valid or a human message", and zod never leaks into the NestJS layer.
 */
export function parseOffRequest(
  body: unknown,
): { ok: true; value: OffRequestInput } | { ok: false; message: string } {
  const result = offRequestSchema.safeParse(body);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, message: 'Tanggal request libur tidak valid.' };
}

export function parseShiftRequest(
  body: unknown,
): { ok: true; value: ShiftRequestInput } | { ok: false; message: string } {
  const result = shiftRequestSchema.safeParse(body);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, message: 'Request shift tidak valid. Pilih pagi atau sore.' };
}
