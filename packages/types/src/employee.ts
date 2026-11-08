export const EMPLOYEE_POSITIONS = ['bar', 'kitchen'] as const;

export type EmployeePosition = (typeof EMPLOYEE_POSITIONS)[number];

export const EMPLOYEE_ROLES = ['manager', 'staff'] as const;

export type EmployeeRole = (typeof EMPLOYEE_ROLES)[number];

export const EMPLOYEE_STATUSES = ['probation', 'tetap'] as const;

export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

/**
 * The signed-in employee as the api resolves them. Role, position and status
 * come from the `employee` table, never from the JWT's user_metadata (PRD
 * §Aturan keamanan), which is why the web reads this shape instead.
 */
export interface SessionEmployee {
  id: string;
  name: string;
  email: string;
  role: EmployeeRole;
  position: EmployeePosition;
  status: EmployeeStatus;
  isActive: boolean;
}
