import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  DraftAssignment,
  DraftSchedule,
  SessionEmployee,
  ShiftCode,
} from '@repo/types';
import type { AssignmentEditInput } from '@repo/validators';
import { PrismaService } from '../prisma/prisma.service';
import { isOffDayAllowed } from '../request/off-day';
import { toCalendarDate } from '../request/request.service';
import {
  compileDraft,
  type PreviousAssignment,
  type ShiftFact,
} from './compiler';
import { nextMonday, requestDeadlineFor } from './weeks';

const DAY_MS = 86_400_000;

/** Midnight-UTC Date for a `YYYY-MM-DD` day, the shape the `@db.Date` column holds. */
function toDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

/** A resolved `schedule_week` row: the fields the draft reads. */
interface Week {
  id: string;
  startDate: Date;
  requestDeadline: Date;
  copiedFromWeekId: string | null;
}

/**
 * Penyusunan jadwal (F5). The rules themselves live in `compileDraft`; this
 * service resolves the minggu target, loads what the compiler reads, and owns
 * the write. Every route is manager-only, which is also how the draft stays
 * invisible to staff before publish (PRD F5).
 */
@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The draft the manager is working on, or an empty one when no week exists
   * yet. Reads are not a mutation: a manager who opens the screen before
   * pressing the button simply sees nothing to edit.
   */
  async draft(now = new Date()): Promise<DraftSchedule> {
    const weeks = await this.prisma.scheduleWeek.findMany();
    const target = this.targetWeek(weeks, now);

    if (!target) {
      return {
        weekStartDate: null,
        copiedFromWeekStartDate: null,
        assignments: [],
      };
    }

    const [assignments, employees] = await Promise.all([
      this.prisma.shiftAssignment.findMany({ where: { weekId: target.id } }),
      this.prisma.employee.findMany(),
    ]);

    const copiedFrom = target.copiedFromWeekId
      ? weeks.find((week) => week.id === target.copiedFromWeekId)
      : undefined;

    return {
      weekStartDate: toCalendarDate(target.startDate),
      copiedFromWeekStartDate: copiedFrom
        ? toCalendarDate(copiedFrom.startDate)
        : null,
      assignments: assignments
        .map((assignment) => {
          const employee = employees.find(
            (row) => row.id === assignment.employeeId,
          );
          return {
            employeeId: assignment.employeeId,
            employeeName: employee?.name ?? '(staf dihapus)',
            position: employee?.position ?? 'bar',
            tanggal: toCalendarDate(assignment.tanggal),
            shiftCode: assignment.shiftCode as ShiftCode | null,
            source: assignment.source,
          };
        })
        .sort(
          (a, b) =>
            a.tanggal.localeCompare(b.tanggal) ||
            a.employeeId.localeCompare(b.employeeId),
        ),
    };
  }

  /**
   * "Buat draft dari minggu lalu" (alur 4.1–4.4). Creates the minggu target if
   * this is the first time it is touched — which is also what opens its jendela
   * request — then replaces whatever draft it holds with a fresh compile.
   * Pressing it again after manual edits is a deliberate reset, not a merge.
   */
  async generate(
    actor: SessionEmployee,
    now = new Date(),
  ): Promise<DraftSchedule> {
    const weeks = await this.prisma.scheduleWeek.findMany();
    const target = await this.ensureTargetWeek(weeks, actor, now);

    const previous =
      weeks.find(
        (week) =>
          week.startDate.getTime() === target.startDate.getTime() - 7 * DAY_MS,
      ) ?? null;

    const [employees, offs, shifts, previousAssignments] = await Promise.all([
      this.prisma.employee.findMany(),
      this.prisma.offRequest.findMany({ where: { weekId: target.id } }),
      this.prisma.shiftRequest.findMany({ where: { weekId: target.id } }),
      previous
        ? this.prisma.shiftAssignment.findMany({
            where: { weekId: previous.id },
          })
        : Promise.resolve([]),
    ]);

    const staff = employees.filter(
      (employee) => employee.role === 'staff' && employee.isActive,
    );

    const assignments = compileDraft({
      weekStartDate: toCalendarDate(target.startDate),
      staff: staff.map((employee) => ({
        id: employee.id,
        name: employee.name,
        position: employee.position,
      })),
      previousWeek: previousAssignments.map(
        (assignment): PreviousAssignment => ({
          employeeId: assignment.employeeId,
          tanggal: toCalendarDate(assignment.tanggal),
          shiftCode: assignment.shiftCode as ShiftCode | null,
        }),
      ),
      // Only the manager's approval makes a request a fact (alur 4.2/4.3).
      offRequests: offs
        .filter((off) => off.status === 'approved')
        .map((off) => ({
          employeeId: off.employeeId,
          tanggal: toCalendarDate(off.tanggal),
        })),
      shiftRequests: shifts
        .filter((shift) => shift.status === 'approved')
        .map((shift): ShiftFact => ({
          employeeId: shift.employeeId,
          tanggal: toCalendarDate(shift.tanggal),
          shiftCode: shift.shiftCode as ShiftCode,
        })),
    });

    await this.prisma.$transaction([
      this.prisma.shiftAssignment.deleteMany({ where: { weekId: target.id } }),
      this.prisma.shiftAssignment.createMany({
        data: assignments.map((assignment) => ({
          weekId: target.id,
          employeeId: assignment.employeeId,
          tanggal: toDate(assignment.tanggal),
          shiftCode: assignment.shiftCode,
          source: assignment.source,
          createdBy: actor.id,
        })),
      }),
      this.prisma.scheduleWeek.update({
        where: { id: target.id },
        data: { copiedFromWeekId: previous?.id ?? null },
      }),
    ]);

    return {
      weekStartDate: toCalendarDate(target.startDate),
      copiedFromWeekStartDate: previous
        ? toCalendarDate(previous.startDate)
        : null,
      assignments,
    };
  }

  /**
   * The manager's per-day edit (F5): pagi, sore, middle (kitchen only), or
   * libur. The row is stamped `manual` so the draft keeps saying where each
   * placement came from. Nothing cascades — coverage validation (T7) reads the
   * result and warns the manager.
   */
  async edit(
    actor: SessionEmployee,
    input: AssignmentEditInput,
    now = new Date(),
  ): Promise<DraftAssignment> {
    const weeks = await this.prisma.scheduleWeek.findMany();
    const target = this.targetWeek(weeks, now);
    if (!target) {
      throw new NotFoundException('Belum ada minggu target untuk disusun.');
    }

    const tanggal = toDate(input.tanggal);
    this.assertWithinWeek(tanggal, target);

    const employee = await this.prisma.employee.findUnique({
      where: { id: input.employeeId },
      select: {
        id: true,
        name: true,
        position: true,
        role: true,
        isActive: true,
      },
    });
    if (!employee || employee.role !== 'staff' || !employee.isActive) {
      throw new BadRequestException(
        'Staf tidak ditemukan atau sudah nonaktif.',
      );
    }

    if (input.shiftCode === 'MIDDLE') {
      if (employee.position !== 'kitchen') {
        throw new BadRequestException('Shift middle hanya untuk staf kitchen.');
      }
      // Middle exists only when a kitchen peer is off, and libur only exists
      // Senin–Kamis (PRD §Jenis shift), so Jumat–Minggu has no middle.
      if (!isOffDayAllowed(tanggal)) {
        throw new BadRequestException('Shift middle hanya Senin sampai Kamis.');
      }
    }

    await this.prisma.shiftAssignment.upsert({
      where: {
        weekId_employeeId_tanggal: {
          weekId: target.id,
          employeeId: employee.id,
          tanggal,
        },
      },
      create: {
        weekId: target.id,
        employeeId: employee.id,
        tanggal,
        shiftCode: input.shiftCode,
        source: 'manual',
        createdBy: actor.id,
      },
      update: { shiftCode: input.shiftCode, source: 'manual' },
    });

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      position: employee.position,
      tanggal: input.tanggal,
      shiftCode: input.shiftCode,
      source: 'manual',
    };
  }

  /**
   * The week the manager is composing: the one that opens on the next Monday
   * (ADR 0004). Null until the manager presses the button and it is created.
   */
  private targetWeek(weeks: Week[], now: Date): Week | null {
    const start = nextMonday(now).getTime();
    return weeks.find((week) => week.startDate.getTime() === start) ?? null;
  }

  /**
   * The minggu target for a write, created when the manager first opens the
   * week. Creating it also opens its jendela request, which is why the deadline
   * is written here (ADR 0004).
   */
  private async ensureTargetWeek(
    weeks: Week[],
    actor: SessionEmployee,
    now: Date,
  ): Promise<Week> {
    const existing = this.targetWeek(weeks, now);
    if (existing) {
      return existing;
    }

    const startDate = nextMonday(now);
    return this.prisma.scheduleWeek.create({
      data: {
        startDate,
        requestDeadline: requestDeadlineFor(startDate),
        createdBy: actor.id,
      },
    });
  }

  /** A cell must land on one of the seven days of the minggu target. */
  private assertWithinWeek(date: Date, week: Week): void {
    const offset = date.getTime() - week.startDate.getTime();
    if (offset < 0 || offset > 6 * DAY_MS || offset % DAY_MS !== 0) {
      throw new BadRequestException(
        'Tanggal harus berada di dalam minggu target.',
      );
    }
  }
}
