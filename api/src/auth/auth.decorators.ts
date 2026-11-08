import { SetMetadata } from '@nestjs/common';
import type { EmployeeRole } from '@repo/types';
import { PUBLIC_ROUTE_KEY, ROLES_KEY } from './auth-metadata';

/**
 * Skips the token and whitelist check. Only routes that must answer before
 * anyone is signed in, today just /health.
 */
export const Public = () => SetMetadata(PUBLIC_ROUTE_KEY, true);

/** Restricts a route to the given roles, read from the `employee` table. */
export const Roles = (...roles: EmployeeRole[]) =>
  SetMetadata(ROLES_KEY, roles);
