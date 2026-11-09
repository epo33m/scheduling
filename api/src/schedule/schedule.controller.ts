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
  PublishedSchedule,
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

  /** Publish (F6): the week becomes staff-visible and the next window opens. */
  @Post('publish')
  publish(@CurrentEmployee() actor: SessionEmployee): Promise<DraftSchedule> {
    return this.schedule.publish(actor);
  }

  /**
   * The published weeks as a staff member reads them (F6/F7): the running
   * week and the minggu target. Method-level roles override the
   * manager-only class: the staff surface is published content only, never
   * the draft, and the service only returns the caller's own rows.
   */
  @Get('published')
  @Roles('staff')
  published(
    @CurrentEmployee() actor: SessionEmployee,
  ): Promise<PublishedSchedule> {
    return this.schedule.published(actor);
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
