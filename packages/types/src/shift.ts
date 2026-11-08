import type { EmployeePosition } from './employee';

export const SHIFT_CODES = ['PAGI', 'SORE', 'MIDDLE'] as const;

export type ShiftCode = (typeof SHIFT_CODES)[number];

export interface ShiftTypeDefinition {
  code: ShiftCode;
  /** Local WITA time, `HH:MM`. */
  startTime: string;
  /** Local WITA time, `HH:MM`. */
  endTime: string;
  /** Positions this shift can be assigned to (PRD §Jenis shift). */
  positions: EmployeePosition[];
}

/**
 * The three shifts from PRD §Jenis shift. Single source for the `shift_type`
 * seed, and the catalog web reads once web depends on @repo/types.
 */
export const SHIFT_TYPE_CATALOG: readonly ShiftTypeDefinition[] = [
  {
    code: 'PAGI',
    startTime: '07:30',
    endTime: '15:30',
    positions: ['bar', 'kitchen'],
  },
  {
    code: 'SORE',
    startTime: '15:00',
    endTime: '23:00',
    positions: ['bar', 'kitchen'],
  },
  {
    code: 'MIDDLE',
    startTime: '11:00',
    endTime: '19:00',
    positions: ['kitchen'],
  },
];
