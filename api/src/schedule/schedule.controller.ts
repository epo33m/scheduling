import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import type {
  DraftAssignment,
  DraftSchedule,
  PublishedSchedule,
  SessionEmployee,
  WeekAlias,
} from '@repo/types';
import { parseAssignmentEdit, parseWeekAlias } from '@repo/validators';
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

  /**
   * The `week` alias every manager draft route reads (issue #20). Absent means
   * the minggu target, so callers that predate the toggle keep working; an
   * unrecognised value is refused rather than defaulted, so a typo cannot
   * quietly publish or edit the wrong week.
   */
  private weekAlias(raw?: string): WeekAlias {
    if (raw === undefined) {
      return 'target';
    }
    const parsed = parseWeekAlias(raw);
    if (!parsed) {
      throw new BadRequestException(
        'Minggu tidak valid. Pilih berjalan atau target.',
      );
    }
    return parsed;
  }

  @Get('draft')
  draft(@Query('week') week?: string): Promise<DraftSchedule> {
    return this.schedule.draft(this.weekAlias(week));
  }

  @Post('draft')
  generate(
    @Query('week') week: string | undefined,
    @CurrentEmployee() actor: SessionEmployee,
  ): Promise<DraftSchedule> {
    return this.schedule.generate(actor, this.weekAlias(week));
  }

  /** Publish (F6): the week becomes staff-visible and the next window opens. */
  @Post('publish')
  publish(
    @Query('week') week: string | undefined,
    @CurrentEmployee() actor: SessionEmployee,
  ): Promise<DraftSchedule> {
    return this.schedule.publish(actor, this.weekAlias(week));
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
    @Query('week') week: string | undefined,
    @CurrentEmployee() actor: SessionEmployee,
  ): Promise<DraftAssignment> {
    const parsed = parseAssignmentEdit(body);
    if (!parsed.ok) {
      throw new BadRequestException(parsed.message);
    }
    return this.schedule.edit(actor, parsed.value, this.weekAlias(week));
  }
}
