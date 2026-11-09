import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
} from '@nestjs/common';
import type {
  DraftAssignment,
  DraftSchedule,
  SessionEmployee,
} from '@repo/types';
import { parseAssignmentEdit } from '@repo/validators';
import { Roles } from '../auth/auth.decorators';
import { CurrentEmployee } from '../auth/current-employee.decorator';
import { ScheduleService } from './schedule.service';

/**
 * Penyusunan jadwal (F5). The whole surface is manager-only: that is what keeps
 * a draft invisible to staff until it is published (F6), and what refuses a
 * staff caller before any week data is read.
 */
@Controller('schedule')
@Roles('manager')
export class ScheduleController {
  constructor(private readonly schedule: ScheduleService) {}

  @Get('draft')
  draft(): Promise<DraftSchedule> {
    return this.schedule.draft();
  }

  @Post('draft')
  generate(@CurrentEmployee() actor: SessionEmployee): Promise<DraftSchedule> {
    return this.schedule.generate(actor);
  }

  @Put('draft/assignment')
  edit(
    @Body() body: unknown,
    @CurrentEmployee() actor: SessionEmployee,
  ): Promise<DraftAssignment> {
    const parsed = parseAssignmentEdit(body);
    if (!parsed.ok) {
      throw new BadRequestException(parsed.message);
    }
    return this.schedule.edit(actor, parsed.value);
  }
}
