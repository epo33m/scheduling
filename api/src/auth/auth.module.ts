import { Module } from '@nestjs/common';
import { createRemoteJWKSet } from 'jose';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { supabaseJwksUrl } from './supabase';
import { SUPABASE_JWKS, SupabaseTokenService } from './supabase-token.service';

@Module({
  controllers: [AuthController],
  providers: [
    SupabaseTokenService,
    AuthGuard,
    RolesGuard,
    {
      // Supabase rotates signing keys, so the key set is fetched on first use
      // and re-fetched when a token names a key the cache does not hold.
      provide: SUPABASE_JWKS,
      useFactory: () => createRemoteJWKSet(supabaseJwksUrl()),
    },
  ],
  exports: [SupabaseTokenService, AuthGuard, RolesGuard],
})
export class AuthModule {}
