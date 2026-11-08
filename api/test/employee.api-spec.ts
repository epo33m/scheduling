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

const ISSUER = 'http://127.0.0.1:54421/auth/v1';
const KID = 'test-key';

/** A stored `employee` row, with the dates Prisma hands back as `Date`. */
interface Row {
  id: string;
  name: string;
  email: string;
  position: 'bar' | 'kitchen';
  role: 'manager' | 'staff';
  status: 'probation' | 'tetap';
  probationEndDate: Date | null;
  isActive: boolean;
}

function row(overrides: Partial<Row> & Pick<Row, 'id' | 'email'>): Row {
  return {
    name: 'Staff',
    position: 'bar',
    role: 'staff',
    status: 'tetap',
    probationEndDate: null,
    isActive: true,
    ...overrides,
  };
}

/**
 * The manager staff-management surface (F2) drives the real guards and the real
 * EmployeeController over HTTP. The whole `employee` table is an in-memory fake
 * so RBAC, the soft-delete toggle, and the probation flip are all proven against
 * one store instead of a live database.
 */
describe('employee management over HTTP', () => {
  let app: INestApplication;
  let rows: Row[];
  let signingKey: KeyLike;

  const managerEmail = 'maya@kyne.test';
  const staffEmail = 'rian@kyne.test';

  beforeAll(async () => {
    const published = await generateKeyPair('ES256');
    signingKey = published.privateKey;

    // Reset the fake table before every suite run; one manager, one staff,
    // one retired, and one probation whose end date has long passed.
    const seed = (): Row[] => [
      row({ id: 'm1', email: managerEmail, name: 'Maya', role: 'manager' }),
      row({ id: 's1', email: staffEmail, name: 'Rian' }),
      row({
        id: 's2',
        email: 'dewi@kyne.test',
        name: 'Dewi',
        position: 'kitchen',
      }),
      row({
        id: 'p1',
        email: 'probation@kyne.test',
        name: 'Probo',
        status: 'probation',
        probationEndDate: new Date('2020-01-01T00:00:00.000Z'),
      }),
    ];
    rows = seed();

    const findUnique = ({ where }: { where: { email?: string; id?: string } }) =>
      rows.find((r) =>
        where.email !== undefined ? r.email === where.email : r.id === where.id,
      ) ?? null;

    const findMany = () => [...rows];

    const create = ({ data }: { data: Omit<Row, 'id'> }) => {
      const created = row({ ...data, id: crypto.randomUUID() });
      rows.push(created);
      return created;
    };

    const update = ({
      where,
      data,
    }: {
      where: { id: string };
      data: Partial<Row>;
    }) => {
      const target = rows.find((r) => r.id === where.id);
      if (!target) {
        throw new Error('no such employee');
      }
      Object.assign(target, data);
      return target;
    };

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
        employee: { findUnique, findMany, create, update },
      })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
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

  const asManager = async () =>
    (await accessToken(managerEmail)).toString();

  function findRow(email: string): Row | undefined {
    return rows.find((r) => r.email === email);
  }

  describe('RBAC', () => {
    it('refuses a staff member the whole staff-management surface', async () => {
      const auth = `Bearer ${await accessToken(staffEmail)}`;

      await request(app.getHttpServer())
        .get('/employees')
        .set('Authorization', auth)
        .expect(403);

      await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', auth)
        .send({
          name: 'Nina',
          email: 'nina@kyne.test',
          position: 'bar',
          status: 'tetap',
        })
        .expect(403);

      await request(app.getHttpServer())
        .patch('/employees/s1/deactivate')
        .set('Authorization', auth)
        .expect(403);
    });

    it('refuses an unauthenticated caller before RBAC even applies', async () => {
      await request(app.getHttpServer()).get('/employees').expect(401);
    });
  });

  describe('list', () => {
    it('shows the manager every staff row', async () => {
      const response = await request(app.getHttpServer())
        .get('/employees')
        .set('Authorization', `Bearer ${await asManager()}`)
        .expect(200);

      const emails = response.body.map((e: { email: string }) => e.email);
      expect(emails).toEqual(
        expect.arrayContaining([managerEmail, staffEmail, 'dewi@kyne.test']),
      );
    });

    it('advances an expired probation row to tetap on read', async () => {
      const response = await request(app.getHttpServer())
        .get('/employees')
        .set('Authorization', `Bearer ${await asManager()}`)
        .expect(200);

      const probo = response.body.find(
        (e: { email: string }) => e.email === 'probation@kyne.test',
      );
      expect(probo.status).toBe('tetap');
      // The flip is persisted, not just derived, so the row agrees next time.
      expect(findRow('probation@kyne.test')?.status).toBe('tetap');
    });
  });

  describe('create', () => {
    it('adds a staff row and normalises the email to lower case', async () => {
      const response = await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${await asManager()}`)
        .send({
          name: 'Nina',
          email: '  Nina@Kyne.test  ',
          position: 'kitchen',
          role: 'staff',
          status: 'probation',
          probationEndDate: '2099-06-30',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        name: 'Nina',
        email: 'nina@kyne.test',
        position: 'kitchen',
        status: 'probation',
        probationEndDate: '2099-06-30',
        isActive: true,
      });
      expect(findRow('nina@kyne.test')).toBeDefined();
    });

    it('rejects a duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${await asManager()}`)
        .send({
          name: 'Copy',
          email: staffEmail,
          position: 'bar',
          status: 'tetap',
        })
        .expect(409);
    });

    it('rejects a probation row with no end date', async () => {
      await request(app.getHttpServer())
        .post('/employees')
        .set('Authorization', `Bearer ${await asManager()}`)
        .send({
          name: 'NoDate',
          email: 'nodate@kyne.test',
          position: 'bar',
          status: 'probation',
        })
        .expect(400);
    });
  });

  describe('deactivate and reactivate', () => {
    it('deactivates a row, keeps the id, and blocks that email at login', async () => {
      const response = await request(app.getHttpServer())
        .patch('/employees/s2/deactivate')
        .set('Authorization', `Bearer ${await asManager()}`)
        .expect(200);

      expect(response.body).toMatchObject({ id: 's2', isActive: false });

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${await accessToken('dewi@kyne.test')}`)
        .expect(403);
    });

    it('reactivates the same row without minting a new id', async () => {
      const response = await request(app.getHttpServer())
        .patch('/employees/s2/reactivate')
        .set('Authorization', `Bearer ${await asManager()}`)
        .expect(200);

      expect(response.body).toMatchObject({ id: 's2', isActive: true });
      // No second row appeared for the same person.
      expect(rows.filter((r) => r.id === 's2')).toHaveLength(1);

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${await accessToken('dewi@kyne.test')}`)
        .expect(200);
    });

    it('refuses a manager deactivating their own account', async () => {
      await request(app.getHttpServer())
        .patch('/employees/m1/deactivate')
        .set('Authorization', `Bearer ${await asManager()}`)
        .expect(400);

      // The actor stays active, so the manager surface is never locked out.
      expect(findRow(managerEmail)?.isActive).toBe(true);
    });

    it('returns 404 when the id is unknown', async () => {
      await request(app.getHttpServer())
        .patch('/employees/does-not-exist/deactivate')
        .set('Authorization', `Bearer ${await asManager()}`)
        .expect(404);
    });
  });
});
