import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { SessionEmployee } from '@repo/types';
import { Roles } from './auth.decorators';
import { ROLES_KEY } from './auth-metadata';
import { RolesGuard } from './roles.guard';

const manager: SessionEmployee = {
  id: '5b0a2b0e-1b6f-4a4f-9c2e-6b2a1f0d7c31',
  name: 'Maya',
  email: 'maya@kyne.test',
  role: 'manager',
  position: 'bar',
  status: 'tetap',
  isActive: true,
};

const staff: SessionEmployee = { ...manager, role: 'staff' };

class OpenRoute {
  handle() {}
}

class ManagerRoute {
  @Roles('manager')
  handle() {}
}

class SharedRoute {
  @Roles('manager', 'staff')
  handle() {}
}

interface Route {
  readonly handle: () => void;
  readonly constructor: unknown;
}

function contextFor(route: Route, employee: SessionEmployee): ExecutionContext {
  return {
    getHandler: () => route.handle,
    getClass: () => route.constructor,
    switchToHttp: () => ({ getRequest: () => ({ headers: {}, employee }) }),
  } as unknown as ExecutionContext;
}

/** What a @Public route hands a guard that still expects an employee. */
function contextWithoutEmployee(route: Route): ExecutionContext {
  return {
    getHandler: () => route.handle,
    getClass: () => route.constructor,
    switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const guard = new RolesGuard(new Reflector());

  it('lets any signed-in employee into a route without @Roles', () => {
    expect(guard.canActivate(contextFor(new OpenRoute(), staff))).toBe(true);
  });

  it('lets a matching role through', () => {
    expect(guard.canActivate(contextFor(new ManagerRoute(), manager))).toBe(
      true,
    );
  });

  it('blocks a role the route does not list', () => {
    expect(() =>
      guard.canActivate(contextFor(new ManagerRoute(), staff)),
    ).toThrow(ForbiddenException);
  });

  it('accepts every role the route lists', () => {
    expect(guard.canActivate(contextFor(new SharedRoute(), staff))).toBe(true);
  });

  it('refuses a role-protected route with no employee on the request', () => {
    expect(() =>
      guard.canActivate(contextWithoutEmployee(new ManagerRoute())),
    ).toThrow(ForbiddenException);
  });

  it('reads the roles from @Roles, not from the request', () => {
    expect(Reflect.getMetadata(ROLES_KEY, ManagerRoute.prototype.handle)).toEqual([
      'manager',
    ]);
  });
});
