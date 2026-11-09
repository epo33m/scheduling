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
  publishedAt?: Date | null;
  publishedBy?: string | null;
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

  /** The seeded shift_type rows the staff read derives hours from. */
  interface ShiftTypeRow {
    code: 'PAGI' | 'SORE' | 'MIDDLE';
    startTime: string;
    endTime: string;
  }
  const defaultShiftTypes = (): ShiftTypeRow[] => [
    { code: 'PAGI', startTime: '07:30', endTime: '15:30' },
    { code: 'SORE', startTime: '15:00', endTime: '23:00' },
    { code: 'MIDDLE', startTime: '11:00', endTime: '19:00' },
  ];
  let shiftTypes: ShiftTypeRow[] = defaultShiftTypes();

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
          findMany: (args?: { where?: { status?: 'draft' | 'published' } }) =>
            weeks
              .filter(
                (w) => !args?.where?.status || w.status === args.where.status,
              )
              .map((w) => ({ ...w })),
          create: ({
            data,
          }: {
            data: Omit<WeekRow, 'id' | 'status' | 'copiedFromWeekId'>;
          }) => {
            const created: WeekRow = {
              id: `w-${weeks.length + 1}`,
              status: 'draft',
              copiedFromWeekId: null,
              publishedAt: null,
              publishedBy: null,
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
            data: Partial<
              Pick<
                WeekRow,
                'copiedFromWeekId' | 'status' | 'publishedAt' | 'publishedBy'
              >
            >;
          }) => {
            const row = weeks.find((w) => w.id === where.id);
            if (!row) throw new Error('week not found');
            Object.assign(row, data);
            return row;
          },
        },
        shiftType: {
          findMany: () => shiftTypes.map((t) => ({ ...t })),
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
          findMany: ({
            where,
          }: {
            where: { weekId: string; employeeId?: string };
          }) =>
            assignments
              .filter(
                (a) =>
                  a.weekId === where.weekId &&
                  (!where.employeeId || a.employeeId === where.employeeId),
              )
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
    shiftTypes = defaultShiftTypes();
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

  /**
   * Publish & share (F6). Publishing is the moment the draft becomes a fact for
   * staff, and the same press opens the jendela request of the week after the
   * one being published (ADR 0004).
   */
  describe('publish and share (F6)', () => {
    function weekStarting(day: Date): WeekRow | undefined {
      return weeks.find((w) => w.startDate.getTime() === day.getTime());
    }

    /** Minggu 12.00 WITA of the week that ends the day before `day`. */
    function deadlineOf(day: Date): Date {
      return new Date(`${isoDay(addDays(day, -1))}T04:00:00.000Z`);
    }

    const staffAuth = async (email: string) =>
      `Bearer ${await accessToken(email)}`;

    it('publishes the draft, makes it staff-visible, and opens the next window', async () => {
      addStaff(barA, 'Rian', 'bar');

      await request(app.getHttpServer())
        .post('/schedule/draft')
        .set('Authorization', await managerAuth())
        .expect(201);

      // A specific placement, so the staff read proves more than an empty week.
      await request(app.getHttpServer())
        .put('/schedule/draft/assignment')
        .set('Authorization', await managerAuth())
        .send({ employeeId: barA, tanggal: isoDay(monday), shiftCode: 'PAGI' })
        .expect(200);

      // Nothing is staff-visible before publish.
      const before = await request(app.getHttpServer())
        .get('/schedule/published')
        .set('Authorization', await staffAuth('rian@kyne.test'))
        .expect(200);
      expect(before.body).toEqual({ weeks: [] });

      const published = await request(app.getHttpServer())
        .post('/schedule/publish')
        .set('Authorization', await managerAuth())
        .expect(201);

      expect(published.body.status).toBe('published');
      expect(published.body.publishedAt).toEqual(expect.any(String));
      expect(weekStarting(monday)?.status).toBe('published');

      const nextMondayTarget = addDays(monday, 7);
      const next = weekStarting(nextMondayTarget);
      expect(next).toBeDefined();
      expect(next?.status).toBe('draft');
      expect(next?.requestDeadline.toISOString()).toBe(
        deadlineOf(nextMondayTarget).toISOString(),
      );
      expect(published.body.nextWindow).toEqual({
        weekStartDate: isoDay(nextMondayTarget),
        requestDeadline: deadlineOf(nextMondayTarget).toISOString(),
      });

      const after = await request(app.getHttpServer())
        .get('/schedule/published')
        .set('Authorization', await staffAuth('rian@kyne.test'))
        .expect(200);

      expect(after.body.weeks).toHaveLength(1);
      expect(after.body.weeks[0].weekStartDate).toBe(isoDay(monday));
      expect(after.body.weeks[0].assignments).toHaveLength(7);
      expect(after.body.weeks[0].assignments[0]).toEqual({
        tanggal: isoDay(monday),
        shiftCode: 'PAGI',
        time: { startTime: '07:30', endTime: '15:30' },
      });
    });

    it('keeps post-publish edits visible, and only to the staff they belong to', async () => {
      addStaff(barA, 'Rian', 'bar');
      addStaff(kitA, 'Kiki', 'kitchen');

      await request(app.getHttpServer())
        .post('/schedule/draft')
        .set('Authorization', await managerAuth())
        .expect(201);
      await request(app.getHttpServer())
        .post('/schedule/publish')
        .set('Authorization', await managerAuth())
        .expect(201);

      const selasa = isoDay(addDays(monday, 1));
      await request(app.getHttpServer())
        .put('/schedule/draft/assignment')
        .set('Authorization', await managerAuth())
        .send({ employeeId: kitA, tanggal: selasa, shiftCode: 'SORE' })
        .expect(200);

      const rian = await request(app.getHttpServer())
        .get('/schedule/published')
        .set('Authorization', await staffAuth('rian@kyne.test'))
        .expect(200);
      expect(rian.body.weeks[0].assignments).toHaveLength(7);
      expect(
        rian.body.weeks[0].assignments.find(
          (row: { tanggal: string }) => row.tanggal === selasa,
        ),
      ).toEqual({
        tanggal: selasa,
        shiftCode: null,
        time: null,
      });

      const kiki = await request(app.getHttpServer())
        .get('/schedule/published')
        .set('Authorization', await staffAuth('kiki@kyne.test'))
        .expect(200);
      expect(
        kiki.body.weeks[0].assignments.find(
          (row: { tanggal: string }) => row.tanggal === selasa,
        ),
      ).toEqual({
        tanggal: selasa,
        shiftCode: 'SORE',
        time: { startTime: '15:00', endTime: '23:00' },
      });
    });

    it('opens the next window once even when published twice', async () => {
      addStaff(barA, 'Rian', 'bar');

      await request(app.getHttpServer())
        .post('/schedule/draft')
        .set('Authorization', await managerAuth())
        .expect(201);

      const first = await request(app.getHttpServer())
        .post('/schedule/publish')
        .set('Authorization', await managerAuth())
        .expect(201);
      const second = await request(app.getHttpServer())
        .post('/schedule/publish')
        .set('Authorization', await managerAuth())
        .expect(201);

      expect(second.body.publishedAt).toBe(first.body.publishedAt);
      expect(
        weeks.filter(
          (w) => w.startDate.getTime() === addDays(monday, 7).getTime(),
        ),
      ).toHaveLength(1);
    });

    it('refuses publish to staff, and refuses it when no week exists', async () => {
      addStaff(barA, 'Rian', 'bar');

      await request(app.getHttpServer())
        .post('/schedule/publish')
        .set('Authorization', await staffAuth('rian@kyne.test'))
        .expect(403);

      await request(app.getHttpServer())
        .post('/schedule/publish')
        .set('Authorization', await managerAuth())
        .expect(404);
    });
  });

  /**
   * Tampilan staf (F7). The read behind the shared link covers the week the
   * staff member is living through and the minggu target, one caller's own
   * days only, and nothing older than the running week.
   */
  describe('staff schedule view (F7)', () => {
    interface PublishedWeekView {
      weekStartDate: string;
      assignments: {
        tanggal: string;
        shiftCode: 'PAGI' | 'SORE' | 'MIDDLE' | null;
        time: { startTime: string; endTime: string } | null;
      }[];
    }

    const staffAuth = async (email: string) =>
      `Bearer ${await accessToken(email)}`;

    /** Publishes the minggu target on top of the seeded running week. */
    async function publishTargetWeek() {
      await request(app.getHttpServer())
        .post('/schedule/draft')
        .set('Authorization', await managerAuth())
        .expect(201);
      await request(app.getHttpServer())
        .post('/schedule/publish')
        .set('Authorization', await managerAuth())
        .expect(201);
    }

    it('serves the running week and the published minggu target, oldest first', async () => {
      addStaff(barA, 'Rian', 'bar');
      addStaff(kitA, 'Kiki', 'kitchen');
      seedPreviousWeek();
      await publishTargetWeek();

      const res = await request(app.getHttpServer())
        .get('/schedule/published')
        .set('Authorization', await staffAuth('rian@kyne.test'))
        .expect(200);

      const weeks = (res.body as { weeks: PublishedWeekView[] }).weeks;
      expect(weeks.map((w) => w.weekStartDate)).toEqual([
        isoDay(previousMonday),
        isoDay(monday),
      ]);

      // Both weeks carry Rian's seven copied PAGI days and nothing else.
      for (const week of weeks) {
        expect(week.assignments).toHaveLength(7);
        expect(week.assignments.every((a) => a.shiftCode === 'PAGI')).toBe(
          true,
        );
      }
    });

    it('never serves a published week older than the running one', async () => {
      addStaff(barA, 'Rian', 'bar');
      seedPreviousWeek();
      weeks.push({
        id: 'w-older',
        startDate: addDays(previousMonday, -7),
        requestDeadline: date(
          `${isoDay(addDays(previousMonday, -8))}T04:00:00.000Z`,
        ),
        status: 'published',
        copiedFromWeekId: null,
      });
      await publishTargetWeek();

      const res = await request(app.getHttpServer())
        .get('/schedule/published')
        .set('Authorization', await staffAuth('rian@kyne.test'))
        .expect(200);

      expect(
        (res.body as { weeks: PublishedWeekView[] }).weeks.map(
          (w) => w.weekStartDate,
        ),
      ).toEqual([isoDay(previousMonday), isoDay(monday)]);
    });

    it('carries the shift_type hours for every placement, and none for libur', async () => {
      addStaff(barA, 'Rian', 'bar');
      addStaff(kitA, 'Kiki', 'kitchen');
      seedPreviousWeek();
      await publishTargetWeek();

      const selasa = isoDay(addDays(monday, 1));
      const rabu = isoDay(addDays(monday, 2));
      await request(app.getHttpServer())
        .put('/schedule/draft/assignment')
        .set('Authorization', await managerAuth())
        .send({ employeeId: barA, tanggal: selasa, shiftCode: null })
        .expect(200);
      await request(app.getHttpServer())
        .put('/schedule/draft/assignment')
        .set('Authorization', await managerAuth())
        .send({ employeeId: kitA, tanggal: rabu, shiftCode: 'MIDDLE' })
        .expect(200);

      const rian = await request(app.getHttpServer())
        .get('/schedule/published')
        .set('Authorization', await staffAuth('rian@kyne.test'))
        .expect(200);
      const rianTarget = (rian.body as { weeks: PublishedWeekView[] }).weeks[1];
      expect(rianTarget.assignments[0]).toEqual({
        tanggal: isoDay(monday),
        shiftCode: 'PAGI',
        time: { startTime: '07:30', endTime: '15:30' },
      });
      expect(rianTarget.assignments[1]).toEqual({
        tanggal: selasa,
        shiftCode: null,
        time: null,
      });

      const kiki = await request(app.getHttpServer())
        .get('/schedule/published')
        .set('Authorization', await staffAuth('kiki@kyne.test'))
        .expect(200);
      const kikiTarget = (kiki.body as { weeks: PublishedWeekView[] }).weeks[1];
      expect(kikiTarget.assignments[2]).toEqual({
        tanggal: rabu,
        shiftCode: 'MIDDLE',
        time: { startTime: '11:00', endTime: '19:00' },
      });
    });

    it('totals the week from shift_type durations, gross and per staff', async () => {
      addStaff(barA, 'Rian', 'bar');
      seedPreviousWeek();
      // A PAGI of ten hours here, no such row exists in the catalog: the
      // total must follow the table, not a constant baked into the app.
      shiftTypes[0].endTime = '17:30';
      await publishTargetWeek();

      const selasa = isoDay(addDays(monday, 1));
      await request(app.getHttpServer())
        .put('/schedule/draft/assignment')
        .set('Authorization', await managerAuth())
        .send({ employeeId: barA, tanggal: selasa, shiftCode: null })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get('/schedule/published')
        .set('Authorization', await staffAuth('rian@kyne.test'))
        .expect(200);
      const weeks = (
        res.body as { weeks: (PublishedWeekView & { totalHours: number })[] }
      ).weeks;

      // Running week: 7 x PAGI = 70h. Target: 6 working days = 60h, the
      // libur row adds nothing.
      expect(weeks[0].totalHours).toBe(70);
      expect(weeks[1].totalHours).toBe(60);
    });

    it('blocks reading another staff member days through the published week', async () => {
      addStaff(barA, 'Rian', 'bar');
      addStaff(kitA, 'Kiki', 'kitchen');
      seedPreviousWeek();
      await publishTargetWeek();

      const res = await request(app.getHttpServer())
        .get('/schedule/published')
        .set('Authorization', await staffAuth('rian@kyne.test'))
        .expect(200);

      // seedPreviousWeek placed three staff per day; Rian reads seven rows
      // per week, and neither peer's id appears anywhere in the payload.
      const json = JSON.stringify(res.body);
      expect(json).not.toContain(kitA);
      expect(json).not.toContain(kitB);
      for (const week of (res.body as { weeks: PublishedWeekView[] }).weeks) {
        expect(week.assignments).toHaveLength(7);
      }
    });
  });

  /**
   * Minggu berjalan toggle (issue #20, ADR 0005). The clock is pinned to Rabu
   * 11 November 2026 10.00 WITA (02.00 UTC) so the running week (Senin 9 Nov,
   * the one the staff are living through) and the minggu target (Senin 16 Nov,
   * the one being composed) are fixed regardless of when CI runs — the exact
   * Monday-rollover case that shipped untested and stranded the running week.
   */
  describe('minggu berjalan toggle (issue #20)', () => {
    const PINNED = new Date('2026-11-11T02:00:00.000Z'); // Rabu 10.00 WITA
    const RUNNING = '2026-11-09';
    const TARGET = '2026-11-16';

    beforeAll(() => {
      jest.useFakeTimers();
    });
    afterAll(() => {
      jest.useRealTimers();
    });
    beforeEach(() => {
      jest.setSystemTime(PINNED);
    });

    function seedRunning(weekStatus: 'draft' | 'published') {
      weeks = [
        {
          id: 'w-running',
          startDate: date(RUNNING),
          requestDeadline: new Date('2026-11-08T04:00:00.000Z'),
          status: weekStatus,
          copiedFromWeekId: null,
          publishedAt: weekStatus === 'published' ? date(RUNNING) : null,
        },
        {
          id: 'w-target',
          startDate: date(TARGET),
          requestDeadline: new Date('2026-11-15T04:00:00.000Z'),
          status: 'draft',
          copiedFromWeekId: null,
        },
      ];
      for (let offset = 0; offset < 7; offset += 1) {
        assignments.push({
          id: `run-${offset}`,
          weekId: 'w-running',
          employeeId: barA,
          tanggal: addDays(date(RUNNING), offset),
          shiftCode: 'PAGI',
          source: 'copy',
        });
      }
    }

    it('reaches the running published week and the bare target by alias', async () => {
      addStaff(barA, 'Rian', 'bar');
      seedRunning('published');

      const running = await request(app.getHttpServer())
        .get('/schedule/draft?week=running')
        .set('Authorization', await managerAuth())
        .expect(200);
      expect(running.body.weekStartDate).toBe(RUNNING);
      expect(running.body.status).toBe('published');
      expect(running.body.assignments).toHaveLength(7);

      const target = await request(app.getHttpServer())
        .get('/schedule/draft?week=target')
        .set('Authorization', await managerAuth())
        .expect(200);
      expect(target.body.weekStartDate).toBe(TARGET);
      expect(target.body.status).toBe('draft');
      expect(target.body.assignments).toHaveLength(0);

      // Omitted week stays the target, so every pre-toggle caller is unchanged.
      const defaulted = await request(app.getHttpServer())
        .get('/schedule/draft')
        .set('Authorization', await managerAuth())
        .expect(200);
      expect(defaulted.body.weekStartDate).toBe(TARGET);
    });

    it('refuses an unknown week on every manager route, and defaults when omitted', async () => {
      addStaff(barA, 'Rian', 'bar');
      seedRunning('published');

      await request(app.getHttpServer())
        .get('/schedule/draft?week=selasa')
        .set('Authorization', await managerAuth())
        .expect(400);
      await request(app.getHttpServer())
        .post('/schedule/draft?week=selasa')
        .set('Authorization', await managerAuth())
        .expect(400);
      await request(app.getHttpServer())
        .post('/schedule/publish?week=selasa')
        .set('Authorization', await managerAuth())
        .expect(400);
      await request(app.getHttpServer())
        .put('/schedule/draft/assignment?week=selasa')
        .set('Authorization', await managerAuth())
        .send({ employeeId: barA, tanggal: RUNNING, shiftCode: 'PAGI' })
        .expect(400);
    });

    it('blocks editing a day already past (WITA) on the running week, keeps today', async () => {
      addStaff(barA, 'Rian', 'bar');
      seedRunning('published');

      // Senin 9 Nov is before today (Rabu 11 Nov): the week is a fact, not a draft.
      await request(app.getHttpServer())
        .put('/schedule/draft/assignment?week=running')
        .set('Authorization', await managerAuth())
        .send({ employeeId: barA, tanggal: RUNNING, shiftCode: 'SORE' })
        .expect(400);

      // Today is fair game, and the change lands on the same row staff read.
      await request(app.getHttpServer())
        .put('/schedule/draft/assignment?week=running')
        .set('Authorization', await managerAuth())
        .send({ employeeId: barA, tanggal: '2026-11-11', shiftCode: 'SORE' })
        .expect(200);

      const rian = await request(app.getHttpServer())
        .get('/schedule/published')
        .set('Authorization', `Bearer ${await accessToken('rian@kyne.test')}`)
        .expect(200);
      const runningWeek = (
        rian.body as {
          weeks: {
            weekStartDate: string;
            assignments: { tanggal: string; shiftCode: string | null }[];
          }[];
        }
      ).weeks.find((w) => w.weekStartDate === RUNNING);
      expect(
        runningWeek?.assignments.find((a) => a.tanggal === '2026-11-11'),
      ).toMatchObject({ tanggal: '2026-11-11', shiftCode: 'SORE' });
    });

    it('refuses the bulk regenerate on the running week', async () => {
      addStaff(barA, 'Rian', 'bar');
      seedRunning('published');

      await request(app.getHttpServer())
        .post('/schedule/draft?week=running')
        .set('Authorization', await managerAuth())
        .expect(400);
    });

    it('late-publishes a still-draft running week and opens the next window', async () => {
      addStaff(barA, 'Rian', 'bar');
      // Only the running week exists, still a draft; no target row yet.
      weeks = [
        {
          id: 'w-running',
          startDate: date(RUNNING),
          requestDeadline: new Date('2026-11-08T04:00:00.000Z'),
          status: 'draft',
          copiedFromWeekId: null,
        },
      ];

      const published = await request(app.getHttpServer())
        .post('/schedule/publish?week=running')
        .set('Authorization', await managerAuth())
        .expect(201);
      expect(published.body.status).toBe('published');
      expect(published.body.publishedAt).toEqual(expect.any(String));

      const created = weeks.find(
        (w) => w.startDate.getTime() === date(TARGET).getTime(),
      );
      expect(created?.status).toBe('draft');
      expect(published.body.nextWindow).toEqual({
        weekStartDate: TARGET,
        requestDeadline: new Date('2026-11-15T04:00:00.000Z').toISOString(),
      });
    });

    it('renders the running empty state when no running week row exists', async () => {
      addStaff(barA, 'Rian', 'bar');
      weeks = [
        {
          id: 'w-target',
          startDate: date(TARGET),
          requestDeadline: new Date('2026-11-15T04:00:00.000Z'),
          status: 'draft',
          copiedFromWeekId: null,
        },
      ];

      const res = await request(app.getHttpServer())
        .get('/schedule/draft?week=running')
        .set('Authorization', await managerAuth())
        .expect(200);
      expect(res.body).toMatchObject({
        weekStartDate: null,
        assignments: [],
        status: null,
      });
    });
  });
});
