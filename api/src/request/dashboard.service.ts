import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  EmployeePosition,
  RequestStatus,
  RequestsDashboard,
  SessionEmployee,
} from '@repo/types';
import type { RequestDecisionInput } from '@repo/validators';
import { advanceProbation } from '../employee/probation';
import { PrismaService } from '../prisma/prisma.service';
import { detectConflicts } from './conflicts';
import { isWindowOpen, mostRecentWeek, resolveOpenWindow } from './request-window';
import { toCalendarDate } from './request.service';

/** A resolved `schedule_week` row, the fields the dashboard reads. */
interface Week {
  id: string;
  startDate: Date;
  requestDeadline: Date;
}

/**
 * The manager dashboard (F4): one read over the minggu target with every
 * request, the bentrok marks, and the reminder list. Reads and decisions are
 * deliberately not window-gated the way staf writes are — the manager acts
 * after the window closes (alur step 4), and the payload still says whether
 * staf can edit.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async requests(now = new Date()): Promise<RequestsDashboard> {
    const weeks = await this.prisma.scheduleWeek.findMany();
    const target = resolveOpenWindow<Week>(weeks, now) ?? mostRecentWeek(weeks);

    if (!target) {
      return {
        weekStartDate: null,
        requestDeadline: null,
        windowOpen: false,
        offRequests: [],
        offConflicted: [],
        shiftRequests: [],
        shiftConflicted: [],
        staffWithoutRequest: [],
      };
    }

    const [employees, offs, shifts] = await Promise.all([
      this.prisma.employee.findMany(),
      this.prisma.offRequest.findMany({ where: { weekId: target.id } }),
      this.prisma.shiftRequest.findMany({ where: { weekId: target.id } }),
    ]);

    const byId = new Map(employees.map((e) => [e.id, e]));
    const nameOf = (employeeId: string): string =>
      byId.get(employeeId)?.name ?? '(staf dihapus)';
    const positionOf = (employeeId: string): EmployeePosition =>
      byId.get(employeeId)?.position ?? 'bar';

    // The people behind the slots: active staf past probation. Probation is
    // recomputed lazily (ADR 0003), so someone whose masa probation just
    // ended counts towards coverage without waiting for a write anywhere.
    const requestable = employees.filter((e) => {
      if (e.role !== 'staff' || !e.isActive) return false;
      const status =
        advanceProbation(e.status, e.probationEndDate, now) ?? e.status;
      return status !== 'probation';
    });
    const staffByPosition = {
      bar: requestable.filter((e) => e.position === 'bar').length,
      kitchen: requestable.filter((e) => e.position === 'kitchen').length,
    };

    const conflicts = detectConflicts({
      offRequests: offs.map((off) => ({
        id: off.id,
        position: positionOf(off.employeeId),
        tanggal: toCalendarDate(off.tanggal),
        status: off.status,
      })),
      shiftRequests: shifts.map((shift) => ({
        id: shift.id,
        position: positionOf(shift.employeeId),
        tanggal: toCalendarDate(shift.tanggal),
        shiftCode: shift.shiftCode,
        status: shift.status,
      })),
      staffByPosition,
    });

    const requested = new Set([
      ...offs.map((off) => off.employeeId),
      ...shifts.map((shift) => shift.employeeId),
    ]);

    return {
      weekStartDate: toCalendarDate(target.startDate),
      requestDeadline: target.requestDeadline.toISOString(),
      windowOpen: isWindowOpen(target.requestDeadline, now),
      offRequests: offs.map((off) => ({
        id: off.id,
        employeeId: off.employeeId,
        employeeName: nameOf(off.employeeId),
        position: positionOf(off.employeeId),
        tanggal: toCalendarDate(off.tanggal),
        status: off.status,
      })),
      offConflicted: conflicts.offRequestIds,
      shiftRequests: shifts.map((shift) => ({
        id: shift.id,
        employeeId: shift.employeeId,
        employeeName: nameOf(shift.employeeId),
        position: positionOf(shift.employeeId),
        tanggal: toCalendarDate(shift.tanggal),
        shiftCode: shift.shiftCode,
        status: shift.status,
      })),
      shiftConflicted: conflicts.shiftRequestIds,
      staffWithoutRequest: requestable
        .filter((e) => !requested.has(e.id))
        .map((e) => ({ id: e.id, name: e.name, position: e.position })),
    };
  }

  /**
   * The manager's call on one request libur. Approving writes the hari libur
   * into the draft when a draft exists; until F5 gives the week schedule
   * entries, the decision just lands on this row and alur step 4.2 applies
   * approved offs in one batch. A rejected staf is then treated like one who
   * never requested: the manager decides their off day.
   */
  async decideOff(
    id: string,
    decision: RequestDecisionInput['decision'],
    actor: SessionEmployee,
    now = new Date(),
  ): Promise<{ id: string; status: RequestStatus }> {
    const row = await this.prisma.offRequest.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Request tidak ditemukan.');
    }
    const updated = await this.prisma.offRequest.update({
      where: { id },
      data: {
        status: decision === 'approve' ? 'approved' : 'rejected',
        decidedBy: actor.id,
        decidedAt: now,
      },
    });
    return { id: updated.id, status: updated.status };
  }

  /** The manager's call on one request shift: best-effort, recorded here. */
  async decideShift(
    id: string,
    decision: RequestDecisionInput['decision'],
    actor: SessionEmployee,
    now = new Date(),
  ): Promise<{ id: string; status: RequestStatus }> {
    const row = await this.prisma.shiftRequest.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('Request tidak ditemukan.');
    }
    const updated = await this.prisma.shiftRequest.update({
      where: { id },
      data: {
        status: decision === 'approve' ? 'approved' : 'rejected',
        decidedBy: actor.id,
        decidedAt: now,
      },
    });
    return { id: updated.id, status: updated.status };
  }
}
