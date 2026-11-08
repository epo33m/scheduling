import type {
  EmployeePosition,
  EmployeeRole,
  EmployeeStatus,
} from '@repo/types';

/**
 * Indonesian display labels for the employee enums, shared by the read-only
 * roster (page.tsx) and the add-staff form so a new posisi or status is
 * named in exactly one place. Keyed by the union types so the compiler
 * refuses to let a label go missing.
 */
export const POSITION_LABEL: Record<EmployeePosition, string> = {
  bar: 'Bar',
  kitchen: 'Kitchen',
};

export const ROLE_LABEL: Record<EmployeeRole, string> = {
  staff: 'Staf',
  manager: 'Manager',
};

export const STATUS_LABEL: Record<EmployeeStatus, string> = {
  probation: 'Probation',
  tetap: 'Tetap',
};
