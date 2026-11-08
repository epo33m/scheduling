import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ManagedEmployee } from '@repo/types';
import type { CreateEmployee } from '@repo/validators';
import type { Employee } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { advanceProbation } from './probation';

/** Midnight-UTC Date for a `YYYY-MM-DD` day, the shape the `@db.Date` column holds. */
function toDate(date: string): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

function toCalendarDate(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

function toManaged(row: Employee): ManagedEmployee {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    position: row.position,
    role: row.role,
    status: row.status,
    probationEndDate: toCalendarDate(row.probationEndDate),
    isActive: row.isActive,
  };
}

/**
 * The staff-management module (F2). Soft-delete only: a staff member is never
 * removed, just toggled off `is_active`, so their schedule history stays
 * attached to the same `employee` row (and the same id) across a
 * deactivate/reactivate round trip.
 */
@Injectable()
export class EmployeeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Every row for the manager's screen. Reading is also where the probation
   * rule lands: with no cron (ADR 0002), a probation row whose end date has
   * passed is flipped to tetap here and persisted, so the stored status
   * matches what the manager sees.
   */
  async list(now = new Date()): Promise<ManagedEmployee[]> {
    const rows = await this.prisma.employee.findMany({
      orderBy: { name: 'asc' },
    });

    const advanced = await Promise.all(
      rows.map(async (row) => {
        const next = advanceProbation(row.status, row.probationEndDate, now);
        if (!next) {
          return row;
        }
        return this.prisma.employee.update({
          where: { id: row.id },
          data: { status: next },
        });
      }),
    );

    return advanced.map(toManaged);
  }

  async create(
    input: CreateEmployee,
    actorId: string,
  ): Promise<ManagedEmployee> {
    // A duplicate email fails the whitelist uniqueness, so it is refused here
    // with a clear conflict instead of surfacing a raw database error.
    const existing = await this.prisma.employee.findUnique({
      where: { email: input.email },
    });
    if (existing) {
      throw new ConflictException(
        'Email itu sudah terdaftar. Kalau stafnya pernah nonaktif, aktifkan lagi dari daftar staf.',
      );
    }

    const row = await this.prisma.employee.create({
      data: {
        name: input.name,
        email: input.email,
        position: input.position,
        role: input.role,
        status: input.status,
        probationEndDate: input.probationEndDate
          ? toDate(input.probationEndDate)
          : null,
        isActive: true,
        createdBy: actorId,
      },
    });

    return toManaged(row);
  }

  /**
   * Toggle a staff member on or off. Reactivation reuses the existing row, so
   * it never mints a new id: the person's history is the same history.
   *
   * A manager cannot switch off their own account. That single action would
   * leave no active manager to open Kelola staf again, locking the whole
   * screen (and every reactivation) out with no way back.
   */
  async setActive(
    id: string,
    isActive: boolean,
    actorId: string,
  ): Promise<ManagedEmployee> {
    const existing = await this.prisma.employee.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Staf tidak ditemukan.');
    }

    if (!isActive && id === actorId) {
      throw new BadRequestException(
        'Anda tidak bisa menonaktifkan akun sendiri.',
      );
    }

    const row = await this.prisma.employee.update({
      where: { id },
      data: { isActive },
    });

    return toManaged(row);
  }
}
