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

/** Midnight-UTC Date for a `YYYY-MM-DD` day. */
function date(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** The Monday of the minggu target: the next Monday strictly after `now`. */
function nextMonday(now: Date): Date {
  const midnight = date(now.toISOString().slice(0, 10));
  const daysToMonday = (8 - midnight.getUTCDay()) % 7 || 7;
  return new Date(midnight.getTime() + daysToMonday * DAY_MS);
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * The staff request flow (F3) over the real guards and controller. The four
 * tables (employee, schedule_week, off_request, shift_request) are in-memory
 * fakes, so the window-lock, the probation gate, and the Senin–Kamis / max-1
 * rules are all proven against one store without a live database.
 */
describe('staff requests over HTTP', () => {
  let app: INestApplication;
  let signingKey: KeyLike;

  const now = new Date();
  const monday = nextMonday(now);
  const openDeadline = new Date(now.getTime() + DAY_MS);
  const lockedDeadline = new Date(now.getTime() - 3_600_000);

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
    {
      id: 's1',
      name: 'Rian',
      email: 'rian@kyne.test',
      position: 'bar',
      role: 'staff',
      status: 'tetap',
      probationEndDate: null,
      isActive: true,
    },
    {
      id: 'p1',
      name: 'Probo',
      email: 'probo@kyne.test',
      position: 'kitchen',
      role: 'staff',
      status: 'probation',
      // Ends in 2099: still probation, so the request menu stays hidden.
      probationEndDate: date('2099-06-30'),
      isActive: true,
    },
  ];

  let weeks: WeekRow[] = [];
  let offs: OffRow[] = [];
  let shifts: ShiftRow[] = [];

  /** Open window for the minggu target starting next Monday. */
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
  /** Only a window whose deadline has passed. */
  const seedLockedWeek = () => {
    weeks = [
      {
        id: 'w-locked',
        startDate: monday,
        requestDeadline: lockedDeadline,
        status: 'published',
      },
    ];
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
          findUnique: ({ where }: { where: { email?: string; id?: string } }) =>
            employees.find((e) =>
              where.email !== undefined
                ? e.email === where.email
                : e.id === where.id,
            ) ?? null,
        },
        scheduleWeek: {
          findMany: () => weeks.map((w) => ({ ...w })),
        },
        offRequest: {
          findUnique: ({
            where,
          }: {
            where: {
              weekId_employeeId: { weekId: string; employeeId: string };
            };
          }) =>
            offs.find(
              (o) =>
                o.weekId === where.weekId_employeeId.weekId &&
                o.employeeId === where.weekId_employeeId.employeeId,
            ) ?? null,
          upsert: ({
            where,
            create,
          }: {
            where: {
              weekId_employeeId: { weekId: string; employeeId: string };
            };
            create: Omit<OffRow, 'id' | 'status'>;
            update: { tanggal: Date };
          }) => {
            const key = where.weekId_employeeId;
            const existing = offs.find(
              (o) => o.weekId === key.weekId && o.employeeId === key.employeeId,
            );
            if (existing) {
              existing.tanggal = create.tanggal;
              return existing;
            }
            const created: OffRow = {
              id: crypto.randomUUID(),
              weekId: key.weekId,
              employeeId: key.employeeId,
              tanggal: create.tanggal,
              status: 'pending',
            };
            offs.push(created);
            return created;
          },
          deleteMany: ({
            where,
          }: {
            where: { weekId: string; employeeId: string };
          }) => {
            const before = offs.length;
            offs = offs.filter(
              (o) =>
                !(
                  o.weekId === where.weekId && o.employeeId === where.employeeId
                ),
            );
            return { count: before - offs.length };
          },
        },
        shiftRequest: {
          findMany: ({
            where,
          }: {
            where: { weekId: string; employeeId: string };
          }) =>
            shifts
              .filter(
                (s) =>
                  s.weekId === where.weekId &&
                  s.employeeId === where.employeeId,
              )
              .sort((a, b) => a.tanggal.getTime() - b.tanggal.getTime()),
          upsert: ({
            where,
            create,
          }: {
            where: {
              weekId_employeeId_tanggal: {
                weekId: string;
                employeeId: string;
                tanggal: Date;
              };
            };
            create: Omit<ShiftRow, 'id' | 'status'>;
            update: { shiftCode: 'PAGI' | 'SORE' };
          }) => {
            const key = where.weekId_employeeId_tanggal;
            const existing = shifts.find(
              (s) =>
                s.weekId === key.weekId &&
                s.employeeId === key.employeeId &&
                s.tanggal.getTime() === key.tanggal.getTime(),
            );
            if (existing) {
              existing.shiftCode = create.shiftCode;
              return existing;
            }
            const created: ShiftRow = {
              id: crypto.randomUUID(),
              weekId: key.weekId,
              employeeId: key.employeeId,
              tanggal: key.tanggal,
              shiftCode: create.shiftCode,
              status: 'pending',
            };
            shifts.push(created);
            return created;
          },
          deleteMany: ({
            where,
          }: {
            where: { weekId: string; employeeId: string; tanggal: Date };
          }) => {
            const before = shifts.length;
            shifts = shifts.filter(
              (s) =>
                !(
                  s.weekId === where.weekId &&
                  s.employeeId === where.employeeId &&
                  s.tanggal.getTime() === where.tanggal.getTime()
                ),
            );
            return { count: before - shifts.length };
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

  const staff = () => accessToken('rian@kyne.test');

  describe('access control', () => {
    it('refuses an unauthenticated caller', async () => {
      await request(app.getHttpServer()).get('/requests').expect(401);
    });

    it('refuses a manager the staff request surface', async () => {
      seedOpenWeek();
      await request(app.getHttpServer())
        .get('/requests')
        .set('Authorization', `Bearer ${await accessToken('maya@kyne.test')}`)
        .expect(403);
    });

    it('refuses a probation staf the menu (ADR 0003)', async () => {
      seedOpenWeek();
      const probo = `Bearer ${await accessToken('probo@kyne.test')}`;

      await request(app.getHttpServer())
        .get('/requests')
        .set('Authorization', probo)
        .expect(403);

      await request(app.getHttpServer())
        .put('/requests/off')
        .set('Authorization', probo)
        .send({ tanggal: isoDay(monday) })
        .expect(403);

      // Nothing was written for the probation staf.
      expect(offs).toHaveLength(0);
    });
  });

  describe('request libur', () => {
    it('accepts a Senin–Kamis pick and reads it back as pending', async () => {
      seedOpenWeek();
      const auth = `Bearer ${await staff()}`;
      const tuesday = isoDay(new Date(monday.getTime() + DAY_MS));

      await request(app.getHttpServer())
        .put('/requests/off')
        .set('Authorization', auth)
        .send({ tanggal: tuesday })
        .expect(200);

      const response = await request(app.getHttpServer())
        .get('/requests')
        .set('Authorization', auth)
        .expect(200);

      expect(response.body.offRequest).toEqual({
        tanggal: tuesday,
        status: 'pending',
      });
      expect(response.body.windowOpen).toBe(true);
    });

    it('refuses a Jumat pick (Mon–Thu rule)', async () => {
      seedOpenWeek();
      const friday = isoDay(new Date(monday.getTime() + 4 * DAY_MS));

      await request(app.getHttpServer())
        .put('/requests/off')
        .set('Authorization', `Bearer ${await staff()}`)
        .send({ tanggal: friday })
        .expect(400);

      expect(offs).toHaveLength(0);
    });

    it('keeps at most one request per week across edits', async () => {
      seedOpenWeek();
      const auth = `Bearer ${await staff()}`;

      await request(app.getHttpServer())
        .put('/requests/off')
        .set('Authorization', auth)
        .send({ tanggal: isoDay(monday) })
        .expect(200);

      const wednesday = isoDay(new Date(monday.getTime() + 2 * DAY_MS));
      await request(app.getHttpServer())
        .put('/requests/off')
        .set('Authorization', auth)
        .send({ tanggal: wednesday })
        .expect(200);

      expect(offs).toHaveLength(1);
      expect(offs[0]?.tanggal.toISOString().slice(0, 10)).toBe(wednesday);
    });
  });

  describe('request shift', () => {
    it('accepts any day, including Jumat, one per day', async () => {
      seedOpenWeek();
      const auth = `Bearer ${await staff()}`;
      const friday = isoDay(new Date(monday.getTime() + 4 * DAY_MS));

      await request(app.getHttpServer())
        .put('/requests/shift')
        .set('Authorization', auth)
        .send({ tanggal: friday, shiftCode: 'PAGI' })
        .expect(200);

      // Editing the same day replaces the preference instead of adding a row.
      await request(app.getHttpServer())
        .put('/requests/shift')
        .set('Authorization', auth)
        .send({ tanggal: friday, shiftCode: 'SORE' })
        .expect(200);

      expect(shifts).toHaveLength(1);

      const response = await request(app.getHttpServer())
        .get('/requests')
        .set('Authorization', auth)
        .expect(200);
      expect(response.body.shiftRequests).toEqual([
        { tanggal: friday, shiftCode: 'SORE', status: 'pending' },
      ]);
    });

    it('rejects a MIDDLE shift request', async () => {
      seedOpenWeek();
      await request(app.getHttpServer())
        .put('/requests/shift')
        .set('Authorization', `Bearer ${await staff()}`)
        .send({ tanggal: isoDay(monday), shiftCode: 'MIDDLE' })
        .expect(400);
    });
  });

  describe('window lock (ADR 0002)', () => {
    it('refuses a write once past request_deadline', async () => {
      seedLockedWeek();
      await request(app.getHttpServer())
        .put('/requests/off')
        .set('Authorization', `Bearer ${await staff()}`)
        .send({ tanggal: isoDay(monday) })
        .expect(409);

      expect(offs).toHaveLength(0);
    });

    it('reports the window closed on read without erroring', async () => {
      seedLockedWeek();
      const response = await request(app.getHttpServer())
        .get('/requests')
        .set('Authorization', `Bearer ${await staff()}`)
        .expect(200);

      expect(response.body.windowOpen).toBe(false);
    });
  });
});
