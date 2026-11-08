import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { SessionEmployee } from '@repo/types';
import type { AuthenticatedRequest } from './authenticated-request';

/** The signed-in employee, resolved by AuthGuard from the `employee` table. */
export const CurrentEmployee = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionEmployee =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().employee,
);
