import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import type { ManagedEmployee, SessionEmployee } from '@repo/types';
import { parseCreateEmployee } from '@repo/validators';
import { Roles } from '../auth/auth.decorators';
import { CurrentEmployee } from '../auth/current-employee.decorator';
import { EmployeeService } from './employee.service';

/**
 * Kelola staf (F2). The whole surface is manager-only: a staff member hitting
 * any of these is refused by RolesGuard before a handler runs, and a caller
 * without a session is refused earlier by AuthGuard.
 */
@Controller('employees')
@Roles('manager')
export class EmployeeController {
  constructor(private readonly employees: EmployeeService) {}

  @Get()
  list(): Promise<ManagedEmployee[]> {
    return this.employees.list();
  }

  @Post()
  create(
    @Body() body: unknown,
    @CurrentEmployee() actor: SessionEmployee,
  ): Promise<ManagedEmployee> {
    const parsed = parseCreateEmployee(body);
    if (!parsed.ok) {
      throw new BadRequestException(parsed.message);
    }

    return this.employees.create(parsed.value, actor.id);
  }

  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string): Promise<ManagedEmployee> {
    return this.employees.setActive(id, false);
  }

  @Patch(':id/reactivate')
  reactivate(@Param('id') id: string): Promise<ManagedEmployee> {
    return this.employees.setActive(id, true);
  }
}
