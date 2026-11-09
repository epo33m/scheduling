import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type {
  OffRequestView,
  SessionEmployee,
  ShiftRequestView,
  StaffRequests,
} from '@repo/types';
import type { ShiftCode } from '@repo/types';
import type { ShiftRequestInput } from '@repo/validators';
import { advanceProbation } from '../employee/probation';
import { PrismaService } from '../prisma/prisma.service';
import { isOffDayAllowed } from './off-day';
import {
  isWindowOpen,
  mostRecentWeek,
  resolveOpenWindow,
} from './request-window';

const DAY_MS = 86_400_000;

/** Midnight-UTC Date for a `YYYY-MM-DD` day, the shape the `@db.Date` column holds. */
function toDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function toCalendarDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** A resolved `schedule_week` row: the fields the request flow reads. */
interface Week {
  id: string;
  startDate: Date;
  requestDeadline: Date;
}

/**
 * The staff request flow (F3): a staf non-probation captures one request libur
 * and any number of per-day request shift inside the one open jendela request,
 * for the minggu target. Every rule the PRD enforces "in the form" is enforced
 * here on the server, because the web is not trusted to be the only gate.
 */
@Injectable()
export class RequestService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Everything the request screen shows: the target week, whether its window is
   * still open, and the staff member's current picks. Reads are not a mutation,
   * so a locked window is reported (not refused) — the screen then disables the
   * controls instead of erroring.
   */
  async view(actor: SessionEmployee, now = new Date()): Promise<StaffRequests> {
    await this.assertCanRequest(actor, now);

    const weeks = await this.prisma.scheduleWeek.findMany();

    // The live window if one is open, otherwise the most recent week so a
    // just-closed window still shows the staff member what they had submitted.
    const target = resolveOpenWindow(weeks, now) ?? mostRecentWeek(weeks);

    if (!target) {
      return {
        weekStartDate: null,
        requestDeadline: null,
        windowOpen: false,
        offRequest: null,
        shiftRequests: [],
      };
    }

    const off = await this.prisma.offRequest.findUnique({
      where: {
        weekId_employeeId: { weekId: target.id, employeeId: actor.id },
      },
    });
    const shifts = await this.prisma.shiftRequest.findMany({
      where: { weekId: target.id, employeeId: actor.id },
      orderBy: { tanggal: 'asc' },
    });

    return {
      weekStartDate: toCalendarDate(target.startDate),
      requestDeadline: target.requestDeadline.toISOString(),
      windowOpen: isWindowOpen(target.requestDeadline, now),
      offRequest: off
        ? { tanggal: toCalendarDate(off.tanggal), status: off.status }
        : null,
      shiftRequests: shifts.map((shift) => ({
        tanggal: toCalendarDate(shift.tanggal),
        shiftCode: shift.shiftCode as ShiftCode,
        status: shift.status,
      })),
    };
  }

  /** Capture or replace the single request libur for the open window. */
  async setOff(
    actor: SessionEmployee,
    tanggal: string,
    now = new Date(),
  ): Promise<OffRequestView> {
    const week = await this.openWeekOrThrow(actor, now);
    const date = toDate(tanggal);

    this.assertWithinWeek(date, week);
    if (!isOffDayAllowed(date)) {
      throw new BadRequestException(
        'Request libur hanya untuk Senin sampai Kamis.',
      );
    }

    // "Max 1 per minggu" is structural: the unique (week, employee) means an
    // edit is an upsert against the same slot, never a second row.
    const row = await this.prisma.offRequest.upsert({
      where: {
        weekId_employeeId: { weekId: week.id, employeeId: actor.id },
      },
      create: {
        weekId: week.id,
        employeeId: actor.id,
        tanggal: date,
        createdBy: actor.id,
      },
      update: { tanggal: date },
    });

    return { tanggal: toCalendarDate(row.tanggal), status: row.status };
  }

  /** Withdraw the request libur for the open window, if any. */
  async cancelOff(actor: SessionEmployee, now = new Date()): Promise<void> {
    const week = await this.openWeekOrThrow(actor, now);
    await this.prisma.offRequest.deleteMany({
      where: { weekId: week.id, employeeId: actor.id },
    });
  }

  /**
   * Capture or replace a request shift for one day. A staff member may hold one
   * per day (any day of the week), so the upsert keys on (week, employee, day).
   */
  async setShift(
    actor: SessionEmployee,
    input: ShiftRequestInput,
    now = new Date(),
  ): Promise<ShiftRequestView> {
    const week = await this.openWeekOrThrow(actor, now);
    const date = toDate(input.tanggal);

    this.assertWithinWeek(date, week);

    const row = await this.prisma.shiftRequest.upsert({
      where: {
        weekId_employeeId_tanggal: {
          weekId: week.id,
          employeeId: actor.id,
          tanggal: date,
        },
      },
      create: {
        weekId: week.id,
        employeeId: actor.id,
        tanggal: date,
        shiftCode: input.shiftCode,
        createdBy: actor.id,
      },
      update: { shiftCode: input.shiftCode },
    });

    return {
      tanggal: toCalendarDate(row.tanggal),
      shiftCode: row.shiftCode as ShiftCode,
      status: row.status,
    };
  }

  /** Withdraw the request shift for one day, if any. */
  async cancelShift(
    actor: SessionEmployee,
    tanggal: string,
    now = new Date(),
  ): Promise<void> {
    const week = await this.openWeekOrThrow(actor, now);
    await this.prisma.shiftRequest.deleteMany({
      where: {
        weekId: week.id,
        employeeId: actor.id,
        tanggal: toDate(tanggal),
      },
    });
  }

  /**
   * The open minggu target, refusing a write when no window is live. Writes must
   * not slip through after the deadline, so unlike the read this path is a hard
   * rejection (ADR 0002).
   */
  private async openWeekOrThrow(
    actor: SessionEmployee,
    now: Date,
  ): Promise<Week> {
    await this.assertCanRequest(actor, now);

    const weeks = await this.prisma.scheduleWeek.findMany();
    const week = resolveOpenWindow(weeks, now);
    if (!week) {
      throw new ConflictException(
        'Jendela request untuk minggu berikutnya sudah tertutup.',
      );
    }
    return week;
  }

  /**
   * The probation gate (ADR 0003): a probation staf sees no request menu and is
   * refused the API. The status is recomputed through the same lazy advance the
   * staff list uses, so a member whose probation has just ended is let through
   * without waiting for a scheduler to flip the stored row.
   */
  private async assertCanRequest(
    actor: SessionEmployee,
    now: Date,
  ): Promise<void> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: actor.id },
      select: { status: true, probationEndDate: true },
    });

    const status = employee
      ? (advanceProbation(employee.status, employee.probationEndDate, now) ??
        employee.status)
      : actor.status;

    if (status === 'probation') {
      throw new ForbiddenException(
        'Menu request terbuka setelah masa probation selesai.',
      );
    }
  }

  /** A pick must land on one of the seven days of the target week. */
  private assertWithinWeek(date: Date, week: Week): void {
    const offset = date.getTime() - week.startDate.getTime();
    if (offset < 0 || offset > 6 * DAY_MS || offset % DAY_MS !== 0) {
      throw new BadRequestException(
        'Tanggal harus berada di dalam minggu target.',
      );
    }
  }
}
