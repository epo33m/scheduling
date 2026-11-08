import type { SessionEmployee } from '@repo/types';

/**
 * The request once AuthGuard has run. `employee` is the row resolved from the
 * `employee` table, so its role is the one the api trusts.
 */
export interface AuthenticatedRequest {
  headers: { authorization?: string };
  employee: SessionEmployee;
}
