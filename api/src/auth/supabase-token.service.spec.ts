import { UnauthorizedException } from '@nestjs/common';
import {
  SignJWT,
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  type KeyLike,
} from 'jose';
import { SupabaseTokenService } from './supabase-token.service';

const SUPABASE_URL = 'http://127.0.0.1:54421';
const ISSUER = `${SUPABASE_URL}/auth/v1`;
const KID = 'test-key';
const EMAIL = 'manager@kyne.test';

describe('SupabaseTokenService', () => {
  let service: SupabaseTokenService;
  let signingKey: KeyLike;
  let foreignKey: KeyLike;

  beforeAll(async () => {
    process.env.SUPABASE_URL = SUPABASE_URL;

    const published = await generateKeyPair('ES256');
    signingKey = published.privateKey;
    foreignKey = (await generateKeyPair('ES256')).privateKey;

    service = new SupabaseTokenService(
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
    );
  });

  interface TokenOptions {
    key?: KeyLike;
    issuer?: string;
    email?: string | null;
    expirationTime?: string | number;
  }

  function accessToken(options: TokenOptions = {}): Promise<string> {
    const claims =
      options.email === null ? {} : { email: options.email ?? EMAIL };

    return new SignJWT(claims)
      .setProtectedHeader({ alg: 'ES256', kid: KID })
      .setIssuer(options.issuer ?? ISSUER)
      .setAudience('authenticated')
      .setSubject('google-user')
      .setIssuedAt()
      .setExpirationTime(options.expirationTime ?? '1h')
      .sign(options.key ?? signingKey);
  }

  it('returns the email Supabase put in the token', async () => {
    await expect(service.verify(await accessToken())).resolves.toEqual({
      sub: 'google-user',
      email: EMAIL,
    });
  });

  it('rejects a token signed by a key the project does not publish', async () => {
    await expect(
      service.verify(await accessToken({ key: foreignKey })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token issued for another Supabase project', async () => {
    await expect(
      service.verify(
        await accessToken({
          issuer: 'https://another-project.supabase.co/auth/v1',
        }),
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects an expired token', async () => {
    const alreadyExpired = Math.floor(Date.now() / 1000) - 60;

    await expect(
      service.verify(await accessToken({ expirationTime: alreadyExpired })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token with no email claim', async () => {
    await expect(
      service.verify(await accessToken({ email: null })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
