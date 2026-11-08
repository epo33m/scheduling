import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { jwtVerify, type JWTVerifyGetKey, type JWTPayload } from 'jose';
import { supabaseIssuer } from './supabase';

export const SUPABASE_JWKS = 'supabase:jwks';

/** The claims the api needs from a Supabase access token. */
export interface SupabaseClaims {
  sub: string;
  email: string;
}

/**
 * Verifies the access token the web sends as a Bearer header. Supabase signs
 * with an asymmetric key pair and publishes the public half as a JWKS, so the
 * api checks the signature locally and never calls Supabase for a page view.
 *
 * The signature proves the token is Supabase's; it says nothing about whether
 * the person may use this app. AuthGuard asks the `employee` table for that.
 */
@Injectable()
export class SupabaseTokenService {
  constructor(@Inject(SUPABASE_JWKS) private readonly jwks: JWTVerifyGetKey) {}

  async verify(token: string): Promise<SupabaseClaims> {
    const payload = await this.verifySignature(token);
    const email = payload.email;

    if (typeof email !== 'string' || email.length === 0) {
      throw new UnauthorizedException('Sesi login tidak memuat email');
    }

    return {
      sub: typeof payload.sub === 'string' ? payload.sub : '',
      email,
    };
  }

  private async verifySignature(token: string): Promise<JWTPayload> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: supabaseIssuer(),
        audience: 'authenticated',
        algorithms: ['ES256'],
      });
      return payload;
    } catch {
      throw new UnauthorizedException('Sesi login tidak valid');
    }
  }
}
