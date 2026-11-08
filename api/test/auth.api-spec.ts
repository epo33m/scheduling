import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { SessionEmployee } from '@repo/types';
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

const manager: SessionEmployee = {
  id: '0d5c4d4b-1f8a-4d1f-9a3e-9f5b2c7d1e01',
  name: 'Maya',
  email: 'maya@kyne.test',
  role: 'manager',
  position: 'bar',
  status: 'tetap',
  isActive: true,
};

const staff: SessionEmployee = {
  id: '7c1e9a54-3a3b-4b6e-8d0a-2f9e1c5b7d02',
  name: 'Rian',
  email: 'rian@kyne.test',
  role: 'staff',
  position: 'kitchen',
  status: 'probation',
  isActive: true,
};

const retired: SessionEmployee = {
  ...staff,
  id: '3f8b2c6d-5e4a-4c9b-8f1d-6a2b3c4d5e03',
  email: 'gone@kyne.test',
  isActive: false,
};

/**
 * The whitelist and the role both live in the `employee` table, so the spec
 * feeds the api a fake table and drives the real guards over HTTP. A live
 * database is not needed to prove which row wins.
 */
describe('authentication over HTTP', () => {
  let app: INestApplication;
  let findUnique: jest.Mock;
  let signingKey: KeyLike;
  let foreignKey: KeyLike;

  beforeAll(async () => {
    const published = await generateKeyPair('ES256');
    signingKey = published.privateKey;
    foreignKey = (await generateKeyPair('ES256')).privateKey;

    findUnique = jest.fn(
      ({ where }: { where: { email: string } }) =>
        [manager, staff, retired].find(
          (employee) => employee.email === where.email,
        ) ?? null,
    );

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
      .useValue({ employee: { findUnique } })
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  interface TokenOptions {
    email?: string;
    key?: KeyLike;
    claims?: Record<string, unknown>;
  }

  function accessToken(options: TokenOptions = {}): Promise<string> {
    return new SignJWT({
      email: options.email ?? manager.email,
      ...options.claims,
    })
      .setProtectedHeader({ alg: 'ES256', kid: KID })
      .setIssuer(ISSUER)
      .setAudience('authenticated')
      .setSubject('google-user')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(options.key ?? signingKey);
  }

  it('keeps /health reachable without a session', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });

  it('refuses a request with no Authorization header', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('refuses a token the project did not sign', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${await accessToken({ key: foreignKey })}`)
      .expect(401);
  });

  it('answers with the employee behind a registered email', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${await accessToken()}`)
      .expect(200);

    expect(response.body).toEqual(manager);
  });

  it('looks the email up in lower case, whatever Google reports', async () => {
    await request(app.getHttpServer())
      .get('/auth/me')
      .set(
        'Authorization',
        `Bearer ${await accessToken({ email: 'Maya@Kyne.test' })}`,
      )
      .expect(200);

    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'maya@kyne.test' } }),
    );
  });

  it('rejects a Google account that has no employee row', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set(
        'Authorization',
        `Bearer ${await accessToken({ email: 'stranger@gmail.com' })}`,
      )
      .expect(403);

    expect(response.body.message).toBe('Akun belum terdaftar');
  });

  it('rejects a deactivated employee', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set(
        'Authorization',
        `Bearer ${await accessToken({ email: retired.email })}`,
      )
      .expect(403);

    expect(response.body.message).toBe('Akun tidak aktif');
  });

  it('takes the role from the employee row, not from the token', async () => {
    const response = await request(app.getHttpServer())
      .get('/auth/me')
      .set(
        'Authorization',
        `Bearer ${await accessToken({
          email: staff.email,
          claims: { user_metadata: { role: 'manager' }, role: 'manager' },
        })}`,
      )
      .expect(200);

    expect(response.body).toEqual(staff);
  });
});
