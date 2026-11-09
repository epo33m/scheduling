import type { EmployeeRole } from '@repo/types';

/**
 * Where a signed-in visitor lands: the screen their role owns. The request
 * gate has already confirmed the session, so the only question left is whether
 * this person is a manager (who reviews and builds the schedule) or staff (who
 * reads their own days). Kept as a plain lookup so it is testable apart from
 * the fetch that resolves the role.
 */
const HOME_ROUTE: Record<EmployeeRole, string> = {
  manager: '/manager/dashboard',
  staff: '/staff/schedule',
};

export function homeRouteForRole(role: EmployeeRole): string {
  return HOME_ROUTE[role];
}
