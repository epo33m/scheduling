import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Put,
  Query,
} from '@nestjs/common';
import type {
  OffRequestView,
  SessionEmployee,
  ShiftRequestView,
  StaffRequests,
} from '@repo/types';
import { parseOffRequest, parseShiftRequest } from '@repo/validators';
import { Roles } from '../auth/auth.decorators';
import { CurrentEmployee } from '../auth/current-employee.decorator';
import { RequestService } from './request.service';

/**
 * Request libur & request shift (F3). This is the staf surface: @Roles('staff')
 * keeps a manager out (their view is the dashboard, F4), and the service's
 * probation gate then keeps a probation staf out even though they carry the
 * staff role. A caller without a session is refused earlier by AuthGuard.
 */
@Controller('requests')
@Roles('staff')
export class RequestController {
  constructor(private readonly requests: RequestService) {}

  @Get()
  view(@CurrentEmployee() actor: SessionEmployee): Promise<StaffRequests> {
    return this.requests.view(actor);
  }

  @Put('off')
  setOff(
    @Body() body: unknown,
    @CurrentEmployee() actor: SessionEmployee,
  ): Promise<OffRequestView> {
    const parsed = parseOffRequest(body);
    if (!parsed.ok) {
      throw new BadRequestException(parsed.message);
    }
    return this.requests.setOff(actor, parsed.value.tanggal);
  }

  @Delete('off')
  cancelOff(@CurrentEmployee() actor: SessionEmployee): Promise<void> {
    return this.requests.cancelOff(actor);
  }

  @Put('shift')
  setShift(
    @Body() body: unknown,
    @CurrentEmployee() actor: SessionEmployee,
  ): Promise<ShiftRequestView> {
    const parsed = parseShiftRequest(body);
    if (!parsed.ok) {
      throw new BadRequestException(parsed.message);
    }
    return this.requests.setShift(actor, parsed.value);
  }

  @Delete('shift')
  cancelShift(
    @Query('tanggal') tanggal: string,
    @CurrentEmployee() actor: SessionEmployee,
  ): Promise<void> {
    const parsed = parseOffRequest({ tanggal });
    if (!parsed.ok) {
      throw new BadRequestException(parsed.message);
    }
    return this.requests.cancelShift(actor, parsed.value.tanggal);
  }
}
