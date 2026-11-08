import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { EmployeeRole } from '@repo/types';
import type { AuthenticatedRequest } from './authenticated-request';
import { ROLES_KEY } from './auth-metadata';

/**
 * Runs after AuthGuard, which is what puts `employee` on the request. A route
 * without @Roles stays open to every signed-in employee.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<EmployeeRole[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!roles?.length) {
      return true;
    }

    const { employee } = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>();

    // A route carrying both @Public and @Roles has no employee to check, and
    // the safe reading of that contradiction is to refuse it.
    if (!employee || !roles.includes(employee.role)) {
      throw new ForbiddenException('Peran akun tidak punya akses ke sini');
    }

    return true;
  }
}
