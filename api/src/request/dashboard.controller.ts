import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
} from '@nestjs/common';
import type {
  RequestDecisionResult,
  RequestsDashboard,
  SessionEmployee,
} from '@repo/types';
import { parseRequestDecision } from '@repo/validators';
import { Roles } from '../auth/auth.decorators';
import { CurrentEmployee } from '../auth/current-employee.decorator';
import { DashboardService } from './dashboard.service';

/**
 * Dashboard manager (F4). The whole surface is manager-only, like Kelola staf:
 * RolesGuard refuses a staff caller before a handler runs.
 */
@Controller('dashboard')
@Roles('manager')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('requests')
  requests(): Promise<RequestsDashboard> {
    return this.dashboard.requests();
  }

  @Patch('requests/off/:id')
  decideOff(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentEmployee() actor: SessionEmployee,
  ): Promise<RequestDecisionResult> {
    const parsed = parseRequestDecision(body);
    if (!parsed.ok) {
      throw new BadRequestException(parsed.message);
    }
    return this.dashboard.decideOff(id, parsed.value.decision, actor);
  }

  @Patch('requests/shift/:id')
  decideShift(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentEmployee() actor: SessionEmployee,
  ): Promise<RequestDecisionResult> {
    const parsed = parseRequestDecision(body);
    if (!parsed.ok) {
      throw new BadRequestException(parsed.message);
    }
    return this.dashboard.decideShift(id, parsed.value.decision, actor);
  }
}
