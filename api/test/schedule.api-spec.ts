import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type KeyLike,
} from 'jose';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { SUPABASE_JWKS } from '../src/auth/supabase-token.service';
import { PrismaService } from '../src/prisma/prisma.service';

// Copied verbatim from auth.api-spec.ts: a truncated issuer silently fails
// every signature check and shows up as blanket 401s that look like broken
// mocking.
const ISSUER = 'http://127.0.0.1:54421/auth/v1';
const KID = 'test-key';
const DAY_MS = 86_400_000;

interface EmployeeRow {
  id: string;
  name: string;
  email: string;
  position: 'bar' | 'kitchen';
  role: 'manager' | 'staff';
  status: 'probation' | 'tetap';
  probationEndDate: Date | null;
  isActive: boolean;
}

interface WeekRow {
  id: string;
  startDate: Date;
  requestDeadline: Date;
  status: 'draft' | 'published';
  copiedFromWeekId: string | null;
}

interface OffRow {
  id: string;
  weekId: string;
  employeeId: string;
  tanggal: Date;
  status: 'pending' | 'approved' | 'rejected';
}

interface ShiftRow {
  id: string;
  weekId: string;
  employeeId: string;
  tanggal: Date;
  shiftCode: 'PAGI' | 'SORE';
  status: 'pending' | 'approved' | 'rejected';
}

interface AssignmentRow {
  id: string;
  weekId: string;
  employeeId: string;
  tanggal: Date;
  shiftCode: 'PAGI' | 'SORE' | 'MIDDLE' | null;
  source: 'copy' | 'request' | 'auto_middle' | 'manual';
}

/** Midnight-UTC Date for a `YYYY-MM-DD` day. */
function date(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function addDays(day: Date, days: number): Date {
  return new Date(day.getTime() + days * DAY_MS);
}

function isoDay(day: Date): string {
  return day.toISOString().slice(0, 10);
}

/** The Monday of the minggu target: the next Monday strictly after `now`. */
function nextMonday(now: Date): Date {
  const midnight = date(now.toISOString().slice(0, 10));
  const daysToMonday = (8 - midnight.getUTCDay()) % 7 || 7;
  return addDays(midnight, daysToMonday);
}

/**
 * Penyusunan jadwal (F5) over the real guards and controller. The five tables
 * are in-memory fakes, so draft generation, the auto-middle of a lone kitchen
 * staff, the voided kitchen request, and the manager's manual edits are proven
 * against one store without a live database.
 */
describe('schedule draft over HTTP', () => {
  let app: INestApplication;
  let signingKey: KeyLike;

  const now = new Date();
  const monday = nextMonday(now);
  const previousMonday = addDays(monday, -7);

  const employees: EmployeeRow[] = [
    {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Maya',
      email: 'maya@kyne.test',
      position: 'bar',
      role: 'manager',
      status: 'tetap',
      probationEndDate: null,
      isActive: true,
    },
  ];

  let weeks: WeekRow[] = [];
  let offs: OffRow[] = [];
  let shifts: ShiftRow[] = [];
  let assignments: AssignmentRow[] = [];

  const managerId = '11111111-1111-4111-8111-111111111111';
  const barA = '22222222-2222-4222-8222-222222222222';
  const kitA = '33333333-3333-4333-8333-333333333333';
  const kitB = '44444444-4444-4444-8444-444444444444';

  function addStaff(
    id: string,
    name: string,
    position: 'bar' | 'kitchen',
  ): EmployeeRow {
    const row: EmployeeRow = {
      id,
      name,
      email: `${name.toLowerCase()}@kyne.test`,
      position,
      role: 'staff',
      status: 'tetap',
      probationEndDate: null,
      isActive: true,
    };
    employees.push(row);
    return row;
  }

  /** Last week's published schedule: the raw material for the copy step (4.1). */
  function seedPreviousWeek() {
    weeks = [
      {
        id: 'w-previous',
        startDate: previousMonday,
        requestDeadline: date(
          `${isoDay(addDays(previousMonday, -1))}T04:00:00.000Z`,
        ),
        status: 'published',
        copiedFromWeekId: null,
      },
    ];

    for (const employeeId of [barA, kitA, kitB]) {
      for (let offset = 0; offset < 7; offset += 1) {
        assignments.push({
          id: `${employeeId}-${offset}`,
          weekId: 'w-previous',
          employeeId,
          tanggal: addDays(previousMonday, offset),
          shiftCode: 'PAGI',
          source: 'copy',
        });
      }
    }
  }

  beforeAll(async () => {
    const published = await generateKeyPair('ES256');
    signingKey = published.privateKey;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(SUPABASE_JWKS)
      .useValue(
        createLocalJWKSet({
          keys: [
            {
              ...(await exportJWK(published.publicKey)),
              kid: KID,
              alg: 'ES256',
              use: 'sig',
            },
          ],
        }),
      )
      .overrideProvider(PrismaService)
      .useValue({
        employee: {
          findUnique: ({ where }: { where: { email?: string; id?: string } }) =>
            employees.find((e) =>
              where.email !== undefined
                ? e.email === where.email
                : e.id === where.id,
            ) ?? null,
          findMany: () => employees.map((e) => ({ ...e })),
        },
        scheduleWeek: {
          findMany: () => weeks.map((w) => ({ ...w })),
          create: ({
            data,
          }: {
            data: Omit<WeekRow, 'id' | 'status' | 'copiedFromWeekId'>;
          }) => {
            const created: WeekRow = {
              id: `w-${weeks.length + 1}`,
              status: 'draft',
              copiedFromWeekId: null,
              ...data,
            };
            weeks.push(created);
            return created;
          },
          update: ({
            where,
            data,
          }: {
            where: { id: string };
            data: { copiedFromWeekId?: string | null };
          }) => {
            const row = weeks.find((w) => w.id === where.id);
            if (!row) throw new Error('week not found');
            Object.assign(row, data);
            return row;
          },
        },
        offRequest: {
          findMany: ({ where }: { where: { weekId: string } }) =>
            offs.filter((o) => o.weekId === where.weekId),
        },
        shiftRequest: {
          findMany: ({ where }: { where: { weekId: string } }) =>
            shifts.filter((s) => s.weekId === where.weekId),
        },
        shiftAssignment: {
          findMany: ({ where }: { where: { weekId: string } }) =>
            assignments
              .filter((a) => a.weekId === where.weekId)
              .sort(
                (a, b) =>
                  a.tanggal.getTime() - b.tanggal.getTime() ||
                  a.employeeId.localeCompare(b.employeeId),
              ),
          deleteMany: ({ where }: { where: { weekId: string } }) => {
            const before = assignments.length;
            assignments = assignments.filter((a) => a.weekId !== where.weekId);
            return { count: before - assignments.length };
          },
          createMany: ({ data }: { data: Omit<AssignmentRow, 'id'>[] }) => {
            for (const row of data) {
              assignments.push({ id: crypto.randomUUID(), ...row });
            }
            return { count: data.length };
          },
          upsert: ({
            where,
            create,
            update,
          }: {
            where: {
              weekId_employeeId_tanggal: {
                weekId: string;
                employeeId: string;
                tanggal: Date;
              };
            };
            create: Omit<AssignmentRow, 'id'>;
            update: Partial<Omit<AssignmentRow, 'id'>>;
          }) => {
            const key = where.weekId_employeeId_tanggal;
            const existing = assignments.find(
              (a) =>
                a.weekId === key.weekId &&
                a.employeeId === key.employeeId &&
                a.tanggal.getTime() === key.tanggal.getTime(),
            );
            if (existing) {
              Object.assign(existing, update);
              return existing;
            }
            const created: AssignmentRow = {
              id: crypto.randomUUID(),
              ...create,
            };
            assignments.push(created);
            return created;
          },
        },
        $transaction: (operations: Promise<unknown>[]) =>
          Promise.all(operations),
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    weeks = [];
    offs = [];
    shifts = [];
    assignments = [];
    employees.length = 1;
  });

  async function accessToken(email: string): Promise<string> {
    return new SignJWT({ email })
      .setProtectedHeader({ alg: 'ES256', kid: KID })
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setSubject('google-user')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(signingKey);
  }

  const managerAuth = async () =>
    `Bearer ${await accessToken('maya@kyne.test')}`;

  function cellOf(
    body: { assignments: AssignmentRowView[] },
    employeeId: string,
    offset: number,
  ) {
    const tanggal = isoDay(addDays(monday, offset));
    const found = body.assignments.find(
      (a) => a.employeeId === employeeId && a.tanggal === tanggal,
    );
    if (!found) throw new Error(`no cell for ${employeeId} on ${tanggal}`);
    return found;
  }

  interface AssignmentRowView {
    employeeId: string;
    employeeName: string;
    position: 'bar' | 'kitchen';
    tanggal: string;
    shiftCode: 'PAGI' | 'SORE' | 'MIDDLE' | null;
    source: 'copy' | 'request' | 'auto_middle' | 'manual';
  }

  interface CoverageWarningView {
    tanggal: string;
    position: 'bar' | 'kitchen';
    shiftCode: 'PAGI' | 'SORE' | null;
    headcount: number;
    minimum: number;
  }

  function warningFor(
    body: { warnings: CoverageWarningView[] },
    tanggal: string,
    position: 'bar' | 'kitchen',
    shiftCode: 'PAGI' | 'SORE' | null,
  ): CoverageWarningView {
    const found = body.warnings.find(
      (warning) =>
        warning.tanggal === tanggal &&
        warning.position === position &&
        warning.shiftCode === shiftCode,
    );
    if (!found) {
      throw new Error(`no ${position} warning for ${shiftCode} on ${tanggal}`);
    }
    return found;
  }

  describe('access control', () => {
    it('refuses an unauthenticated caller', async () => {
      await request(app.getHttpServer()).get('/schedule/draft').expect(401);
    });

    it('keeps the draft invisible to staff', async () => {
      addStaff(barA, 'Rian', 'bar');
      seedPreviousWeek();

      await request(app.getHttpServer())
        .get('/schedule/draft')
        .set('Authorization', `Bearer ${await accessToken('rian@kyne.test')}`)
        .expect(403);

      await request(app.getHttpServer())
        .post('/schedule/draft')
        .set('Authorization', `Bearer ${await accessToken('rian@kyne.test')}`)
        .expect(403);

      expect(weeks).toHaveLength(1); // only the seeded previous week
    });
  });

  describe('draft from last week (4.1–4.4)', () => {
    it('copies last week, applies approved requests, and makes the lone kitchen staff middle', async () => {
      addStaff(barA, 'Rian', 'bar');
      addStaff(kitA, 'Kiki', 'kitchen');
      addStaff(kitB, 'Komang', 'kitchen');
      seedPreviousWeek();

      weeks.push({
        id: 'w-target',
        startDate: monday,
        requestDeadline: date(`${isoDay(addDays(monday, -1))}T04:00:00.000Z`),
        status: 'draft',
        copiedFromWeekId: null,
      });

      // Approved: Kiki off on Selasa. Pending must not be applied.
      offs.push(
        {
          id: 'o-approved',
          weekId: 'w-target',
          employeeId: kitA,
          tanggal: addDays(monday, 1),
          status: 'approved',
        },
        {
          id: 'o-pending',
          weekId: 'w-target',
          employeeId: kitA,
          tanggal: addDays(monday, 2),
          status: 'pending',
        },
      );
      // Approved shift request for Komang on Selasa: voided by auto-middle.
      shifts.push({
        id: 's-approved',
        weekId: 'w-target',
        employeeId: kitB,
        tanggal: addDays(monday, 1),
        shiftCode: 'SORE',
        status: 'approved',
      });

      const response = await request(app.getHttpServer())
        .post('/schedule/draft')
        .set('Authorization', await managerAuth())
        .expect(201);

      expect(response.body.weekStartDate).toBe(isoDay(monday));
      expect(response.body.copiedFromWeekStartDate).toBe(
        isoDay(previousMonday),
      );
      expect(response.body.assignments).toHaveLength(3 * 7);

      expect(cellOf(response.body, barA, 0)).toMatchObject({
        shiftCode: 'PAGI',
        source: 'copy',
      });
      expect(cellOf(response.body, kitA, 1)).toMatchObject({
        shiftCode: null,
        source: 'request',
      });
      expect(cellOf(response.body, kitA, 2)).toMatchObject({
        shiftCode: 'PAGI',
        source: 'copy',
      });
      expect(cellOf(response.body, kitB, 1)).toMatchObject({
        shiftCode: 'MIDDLE',
        source: 'auto_middle',
      });
      expect(cellOf(response.body, kitB, 2)).toMatchObject({
        shiftCode: 'PAGI',
        source: 'copy',
      });

      // Persisted, and the week remembers where it was copied from.
      expect(assignments.filter((a) => a.weekId === 'w-target')).toHaveLength(
        3 * 7,
      );
      expect(weeks.find((w) => w.id === 'w-target')?.copiedFromWeekId).toBe(
        'w-previous',
      );
    });

    it('reproduces the same draft when pressed again', async () => {
      addStaff(barA, 'Rian', 'bar');
      addStaff(kitA, 'Kiki', 'kitchen');
      addStaff(kitB, 'Komang', 'kitchen');
      seedPreviousWeek();
      weeks.push({
        id: 'w-target',
        startDate: monday,
        requestDeadline: date(`${isoDay(addDays(monday, -1))}T04:00:00.000Z`),
        status: 'draft',
        copiedFromWeekId: null,
      });
      offs.push({
        id: 'o-approved',
        weekId: 'w-target',
        employeeId: kitA,
        tanggal: addDays(monday, 3),
        status: 'approved',
      });

      const first = await request(app.getHttpServer())
        .post('/schedule/draft')
        .set('Authorization', await managerAuth())
        .expect(201);

      const second = await request(app.getHttpServer())
        .post('/schedule/draft')
        .set('Authorization', await managerAuth())
        .expect(201);

      expect(second.body).toEqual(first.body);
      expect(assignments.filter((a) => a.weekId !== 'w-previous')).toHaveLength(
        3 * 7,
      );
    });

    it('leaves the first week empty for the manager to fill by hand', async () => {
      addStaff(barA, 'Rian', 'bar');

      const response = await request(app.getHttpServer())
        .post('/schedule/draft')
        .set('Authorization', await managerAuth())
        .expect(201);

      expect(response.body.copiedFromWeekStartDate).toBeNull();
      expect(response.body.assignments).toEqual(
        Array.from({ length: 7 }, (_, offset) => ({
          employeeId: barA,
          employeeName: 'Rian',
          position: 'bar',
          tanggal: isoDay(addDays(monday, offset)),
          shiftCode: null,
          source: 'copy',
        })),
      );
    });
  });

  describe('manager per-day edit (F5)', () => {
    it('persists a manual change and reads it back', async () => {
      addStaff(barA, 'Rian', 'bar');
      seedPreviousWeek();

      await request(app.getHttpServer())
        .post('/schedule/draft')
        .set('Authorization', await managerAuth())
        .expect(201);

      const sabtu = isoDay(addDays(monday, 5));
      await request(app.getHttpServer())
        .put('/schedule/draft/assignment')
        .set('Authorization', await managerAuth())
        .send({ employeeId: barA, tanggal: sabtu, shiftCode: 'SORE' })
        .expect(200);

      const draft = await request(app.getHttpServer())
        .get('/schedule/draft')
        .set('Authorization', await managerAuth())
        .expect(200);

      expect(cellOf(draft.body, barA, 5)).toEqual({
        employeeId: barA,
        employeeName: 'Rian',
        position: 'bar',
        tanggal: sabtu,
        shiftCode: 'SORE',
        source: 'manual',
      });
    });

    it('accepts libur and middle (kitchen) as manual edits', async () => {
      addStaff(kitA, 'Kiki', 'kitchen');
      seedPreviousWeek();

      await request(app.getHttpServer())
        .post('/schedule/draft')
        .set('Authorization', await managerAuth())
        .expect(201);

      await request(app.getHttpServer())
        .put('/schedule/draft/assignment')
        .set('Authorization', await managerAuth())
        .send({
          employeeId: kitA,
          tanggal: isoDay(addDays(monday, 1)),
          shiftCode: 'MIDDLE',
        })
        .expect(200);

      await request(app.getHttpServer())
        .put('/schedule/draft/assignment')
        .set('Authorization', await managerAuth())
        .send({
          employeeId: kitA,
          tanggal: isoDay(addDays(monday, 2)),
          shiftCode: null,
        })
        .expect(200);

      const draft = await request(app.getHttpServer())
        .get('/schedule/draft')
        .set('Authorization', await managerAuth())
        .expect(200);

      expect(cellOf(draft.body, kitA, 1)).toMatchObject({
        shiftCode: 'MIDDLE',
        source: 'manual',
      });
      expect(cellOf(draft.body, kitA, 2)).toMatchObject({
        shiftCode: null,
        source: 'manual',
      });
    });

    it('refuses middle for a bar staff and libur or middle on Jumat–Minggu', async () => {
      addStaff(barA, 'Rian', 'bar');
      addStaff(kitA, 'Kiki', 'kitchen');
      seedPreviousWeek();

      await request(app.getHttpServer())
        .post('/schedule/draft')
        .set('Authorization', await managerAuth())
        .expect(201);

      await request(app.getHttpServer())
        .put('/schedule/draft/assignment')
        .set('Authorization', await managerAuth())
        .send({
          employeeId: barA,
          tanggal: isoDay(addDays(monday, 0)),
          shiftCode: 'MIDDLE',
        })
        .expect(400);

      // Sabtu: libur only exists Mon–Thu, so middle cannot exist either.
      await request(app.getHttpServer())
        .put('/schedule/draft/assignment')
        .set('Authorization', await managerAuth())
        .send({
          employeeId: kitA,
          tanggal: isoDay(addDays(monday, 5)),
          shiftCode: 'MIDDLE',
        })
        .expect(400);

      // Jumat–Minggu is busy and everyone works, so no day off can be written.
      await request(app.getHttpServer())
        .put('/schedule/draft/assignment')
        .set('Authorization', await managerAuth())
        .send({
          employeeId: barA,
          tanggal: isoDay(addDays(monday, 5)),
          shiftCode: null,
        })
        .expect(400);
    });

    it('recomputes coverage on the read after an edit', async () => {
      addStaff(barA, 'Rian', 'bar');
      seedPreviousWeek();

      const generated = await request(app.getHttpServer())
        .post('/schedule/draft')
        .set('Authorization', await managerAuth())
        .expect(201);

      // Sabtu is busy: two bar per shift, and one bar on pagi is half a crew.
      const sabtu = isoDay(addDays(monday, 5));
      expect(warningFor(generated.body, sabtu, 'bar', 'PAGI')).toMatchObject({
        headcount: 1,
        minimum: 2,
      });

      await request(app.getHttpServer())
        .put('/schedule/draft/assignment')
        .set('Authorization', await managerAuth())
        .send({ employeeId: barA, tanggal: sabtu, shiftCode: 'SORE' })
        .expect(200);

      const draft = await request(app.getHttpServer())
        .get('/schedule/draft')
        .set('Authorization', await managerAuth())
        .expect(200);

      expect(warningFor(draft.body, sabtu, 'bar', 'PAGI')).toMatchObject({
        headcount: 0,
        minimum: 2,
      });
      expect(warningFor(draft.body, sabtu, 'bar', 'SORE')).toMatchObject({
        headcount: 1,
        minimum: 2,
      });
    });

    it('refuses a day outside the minggu target', async () => {
      addStaff(barA, 'Rian', 'bar');
      seedPreviousWeek();

      await request(app.getHttpServer())
        .post('/schedule/draft')
        .set('Authorization', await managerAuth())
        .expect(201);

      await request(app.getHttpServer())
        .put('/schedule/draft/assignment')
        .set('Authorization', await managerAuth())
        .send({
          employeeId: barA,
          tanggal: isoDay(addDays(monday, 7)),
          shiftCode: 'PAGI',
        })
        .expect(400);
    });
  });
});
