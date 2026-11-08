export const EMPLOYEE_POSITIONS = ['bar', 'kitchen'] as const;

export type EmployeePosition = (typeof EMPLOYEE_POSITIONS)[number];
