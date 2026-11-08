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

// Copied verbatim from request.api-spec.ts: a truncated issuer silently fails
// every signature check and shows up as blanket 401s.
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
}

interface OffRow {
  id: string;
  weekId: string;
  employeeId: string;
  tanggal: Date;
  status: 'pending' | 'approved' | 'rejected';
  decidedBy: string | null;
  decidedAt: Date | null;
}

interface ShiftRow {
  id: string;
  weekId: string;
  employeeId: string;
  tanggal: Date;
  shiftCode: 'PAGI' | 'SORE';
  status: 'pending' | 'approved' | 'rejected';
  decidedBy: string | null;
  decidedAt: Date | null;
}

function date(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** The Monday of the minggu target: the next Monday strictly after `now`. */
function nextMonday(now: Date): Date {
  const midnight = date(now.toISOString().slice(0, 10));
  const daysToMonday = ((8 - midnight.getUTCDay()) % 7) || 7;
  return new Date(midnight.getTime() + daysToMonday * DAY_MS);
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * The manager dashboard (F4) over the real guards and controller. Same seam
 * as request.api-spec.ts: in-memory fakes for the four tables, so the bentrok
 * marks, the reminder list, and the approval decisions are proven without a
 * live database.
 */
describe('manager dashboard over HTTP', () => {
  let app: INestApplication;
  let signingKey: KeyLike;

  const now = new Date();
  const monday = nextMonday(now);
  const openDeadline = new Date(now.getTime() + DAY_MS);

  const employees: EmployeeRow[] = [
    {
      id: 'm1',
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

  const seedOpenWeek = () => {
    weeks = [
      {
        id: 'w-open',
        startDate: monday,
        requestDeadline: openDeadline,
        status: 'published',
      },
    ];
  };

  const addStaff = (
    id: string,
    name: string,
    position: 'bar' | 'kitchen',
    status: 'probation' | 'tetap' = 'tetap',
  ): EmployeeRow => {
    const row: EmployeeRow = {
      id,
      name,
      email: `${id}@kyne.test`,
      position,
      role: 'staff',
      status,
      probationEndDate: status === 'probation' ? date('2099-06-30') : null,
      isActive: true,
    };
    employees.push(row);
    return row;
  };

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
          findUnique: ({
            where,
          }: {
            where: { email?: string; id?: string };
          }) =>
            employees.find((e) =>
              where.email !== undefined ? e.email === where.email : e.id === where.id,
            ) ?? null,
          findMany: ({ where }: { where?: { isActive?: boolean } } = {}) =>
            employees.filter(
              (e) => where?.isActive === undefined || e.isActive === where.isActive,
            ),
        },
        scheduleWeek: {
          findMany: () => weeks.map((w) => ({ ...w })),
        },
        offRequest: {
          findMany: ({ where }: { where: { weekId: string } }) =>
            offs
              .filter((o) => o.weekId === where.weekId)
              .sort((a, b) => a.tanggal.getTime() - b.tanggal.getTime()),
          findUnique: ({ where }: { where: { id: string } }) =>
            offs.find((o) => o.id === where.id) ?? null,
          update: ({
            where,
            data,
          }: {
            where: { id: string };
            data: {
              status: 'approved' | 'rejected';
              decidedBy: string;
              decidedAt: Date;
            };
          }) => {
            const row = offs.find((o) => o.id === where.id);
            if (!row) throw new Error('off request not found');
            Object.assign(row, data);
            return row;
          },
        },
        shiftRequest: {
          findMany: ({ where }: { where: { weekId: string } }) =>
            shifts
              .filter((s) => s.weekId === where.weekId)
              .sort((a, b) => a.tanggal.getTime() - b.tanggal.getTime()),
          findUnique: ({ where }: { where: { id: string } }) =>
            shifts.find((s) => s.id === where.id) ?? null,
          update: ({
            where,
            data,
          }: {
            where: { id: string };
            data: {
              status: 'approved' | 'rejected';
              decidedBy: string;
              decidedAt: Date;
            };
          }) => {
            const row = shifts.find((s) => s.id === where.id);
            if (!row) throw new Error('shift request not found');
            Object.assign(row, data);
            return row;
          },
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    offs = [];
    shifts = [];
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

  describe('listing requests', () => {
    it('lists libur and shift requests per staff, marks the kitchen libur bentrok, and names who has not requested', async () => {
      seedOpenWeek();
      const selasa = new Date(monday.getTime() + DAY_MS);
      const sabtu = new Date(monday.getTime() + 5 * DAY_MS);
      addStaff('b1', 'Budi', 'bar');
      addStaff('b2', 'Bayu', 'bar');
      addStaff('b3', 'Bela', 'bar');
      addStaff('b4', 'Biri', 'bar');
      addStaff('k1', 'Kiki', 'kitchen');
      addStaff('k2', 'Kana', 'kitchen');
      addStaff('p1', 'Probo', 'kitchen', 'probation');
      offs.push(
        { id: 'o1', weekId: 'w-open', employeeId: 'k1', tanggal: selasa, status: 'pending', decidedBy: null, decidedAt: null },
        { id: 'o2', weekId: 'w-open', employeeId: 'k2', tanggal: selasa, status: 'pending', decidedBy: null, decidedAt: null },
      );
      shifts.push({
        id: 's1',
        weekId: 'w-open',
        employeeId: 'b1',
        tanggal: sabtu,
        shiftCode: 'PAGI',
        status: 'pending',
        decidedBy: null,
        decidedAt: null,
      });

      const response = await request(app.getHttpServer())
        .get('/dashboard/requests')
        .set('Authorization', await managerAuth())
        .expect(200);

      expect(response.body.offRequests).toEqual([
        { id: 'o1', employeeId: 'k1', employeeName: 'Kiki', position: 'kitchen', tanggal: isoDay(selasa), status: 'pending' },
        { id: 'o2', employeeId: 'k2', employeeName: 'Kana', position: 'kitchen', tanggal: isoDay(selasa), status: 'pending' },
      ]);
      expect(response.body.offConflicted.sort()).toEqual(['o1', 'o2']);
      expect(response.body.shiftRequests).toEqual([
        { id: 's1', employeeId: 'b1', employeeName: 'Budi', position: 'bar', tanggal: isoDay(sabtu), shiftCode: 'PAGI', status: 'pending' },
      ]);
      // One PAGI pick among four bar staff fits the Sabtu slots easily.
      expect(response.body.shiftConflicted).toEqual([]);
      // b1 requested a shift, k1/k2 requested libur, p1 is on probation,
      // Maya is the manager: only the silent bar staff need reminding.
      expect(response.body.staffWithoutRequest.map((s: { id: string }) => s.id)).toEqual([
        'b2',
        'b3',
        'b4',
      ]);
    });
  });

  describe('access control', () => {
    it('refuses a staff member the manager dashboard', async () => {
      addStaff('s1', 'Rian', 'bar');
      seedOpenWeek();

      await request(app.getHttpServer())
        .get('/dashboard/requests')
        .set('Authorization', `Bearer ${await accessToken('s1@kyne.test')}`)
        .expect(403);
    });

    it('reads an open week with no requests as empty lists', async () => {
      seedOpenWeek();

      const response = await request(app.getHttpServer())
        .get('/dashboard/requests')
        .set('Authorization', await managerAuth())
        .expect(200);

      expect(response.body).toEqual({
        weekStartDate: isoDay(monday),
        requestDeadline: openDeadline.toISOString(),
        windowOpen: true,
        offRequests: [],
        offConflicted: [],
        shiftRequests: [],
        shiftConflicted: [],
        staffWithoutRequest: [],
      });
    });
  });

  describe('deciding requests', () => {
    /** Kiki and Kana both want the same Selasa off: a kitchen bentrok. */
    const seedKitchenClash = () => {
      seedOpenWeek();
      addStaff('k1', 'Kiki', 'kitchen');
      addStaff('k2', 'Kana', 'kitchen');
      const selasa = new Date(monday.getTime() + DAY_MS);
      offs.push(
        { id: 'o1', weekId: 'w-open', employeeId: 'k1', tanggal: selasa, status: 'pending', decidedBy: null, decidedAt: null },
        { id: 'o2', weekId: 'w-open', employeeId: 'k2', tanggal: selasa, status: 'pending', decidedBy: null, decidedAt: null },
      );
      return selasa;
    };

    it('records an approval on the libur request and shows it on the dashboard', async () => {
      seedKitchenClash();

      const response = await request(app.getHttpServer())
        .patch('/dashboard/requests/off/o1')
        .set('Authorization', await managerAuth())
        .send({ decision: 'approve' })
        .expect(200);
      expect(response.body).toEqual({ id: 'o1', status: 'approved' });

      expect(offs[0]).toMatchObject({
        status: 'approved',
        decidedBy: 'm1',
      });
      expect(offs[0]?.decidedAt).toBeInstanceOf(Date);

      const dashboard = await request(app.getHttpServer())
        .get('/dashboard/requests')
        .set('Authorization', await managerAuth())
        .expect(200);
      expect(dashboard.body.offRequests.find((o: { id: string }) => o.id === 'o1')?.status).toBe('approved');
    });

    it('ends the bentrok mark once the manager rejects one of the pair', async () => {
      seedKitchenClash();

      await request(app.getHttpServer())
        .patch('/dashboard/requests/off/o2')
        .set('Authorization', await managerAuth())
        .send({ decision: 'reject' })
        .expect(200);

      const dashboard = await request(app.getHttpServer())
        .get('/dashboard/requests')
        .set('Authorization', await managerAuth())
        .expect(200);
      expect(dashboard.body.offConflicted).toEqual([]);
      // A rejected libur still counts as "sudah request": Kana drops off the
      // reminder list only when she submits something new, per F4's rule that
      // she is then treated like the staff who let the manager pick.
      expect(dashboard.body.staffWithoutRequest.map((s: { id: string }) => s.id)).toEqual([]);
    });

    it('records an approval on a shift request', async () => {
      seedOpenWeek();
      addStaff('b1', 'Budi', 'bar');
      shifts.push({
        id: 's1',
        weekId: 'w-open',
        employeeId: 'b1',
        tanggal: monday,
        shiftCode: 'PAGI',
        status: 'pending',
        decidedBy: null,
        decidedAt: null,
      });

      const response = await request(app.getHttpServer())
        .patch('/dashboard/requests/shift/s1')
        .set('Authorization', await managerAuth())
        .send({ decision: 'approve' })
        .expect(200);
      expect(response.body).toEqual({ id: 's1', status: 'approved' });
      expect(shifts[0]).toMatchObject({ status: 'approved', decidedBy: 'm1' });
    });

    it('refuses a decision that is neither approve nor reject', async () => {
      seedKitchenClash();
      await request(app.getHttpServer())
        .patch('/dashboard/requests/off/o1')
        .set('Authorization', await managerAuth())
        .send({ decision: 'maybe' })
        .expect(400);
      expect(offs[0]?.status).toBe('pending');
    });

    it('answers 404 for a request id that does not exist', async () => {
      seedKitchenClash();
      await request(app.getHttpServer())
        .patch('/dashboard/requests/off/nope')
        .set('Authorization', await managerAuth())
        .send({ decision: 'approve' })
        .expect(404);
    });

    it('refuses a staff member the decision', async () => {
      seedKitchenClash();
      addStaff('s1', 'Rian', 'bar');
      await request(app.getHttpServer())
        .patch('/dashboard/requests/off/o1')
        .set('Authorization', `Bearer ${await accessToken('s1@kyne.test')}`)
        .send({ decision: 'approve' })
        .expect(403);
      expect(offs[0]?.status).toBe('pending');
    });

    it('still reads and decides after the request window locks: alur step 4 is the manager working on a closed window', async () => {
      weeks = [
        {
          id: 'w-locked',
          startDate: monday,
          requestDeadline: new Date(now.getTime() - 3_600_000),
          status: 'published',
        },
      ];
      addStaff('k1', 'Kiki', 'kitchen');
      offs.push({
        id: 'o1',
        weekId: 'w-locked',
        employeeId: 'k1',
        tanggal: monday,
        status: 'pending',
        decidedBy: null,
        decidedAt: null,
      });

      const dashboard = await request(app.getHttpServer())
        .get('/dashboard/requests')
        .set('Authorization', await managerAuth())
        .expect(200);
      expect(dashboard.body.windowOpen).toBe(false);

      await request(app.getHttpServer())
        .patch('/dashboard/requests/off/o1')
        .set('Authorization', await managerAuth())
        .send({ decision: 'approve' })
        .expect(200);
      expect(offs[0]?.status).toBe('approved');
    });
  });
});
