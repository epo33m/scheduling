import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedRequest } from './authenticated-request';
import { PUBLIC_ROUTE_KEY } from './auth-metadata';
import { SupabaseTokenService } from './supabase-token.service';

/**
 * Registered as a global guard, so every request is verified before a handler
 * runs. The Supabase token only says which Google account is asking; the
 * `employee` row for that email decides whether they may use the app and with
 * which role. Supabase Auth lets any Google account sign in, so this lookup is
 * the whitelist (PRD §Aturan keamanan).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: SupabaseTokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (this.isPublic(context)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const claims = await this.tokens.verify(bearerToken(request));

    // Google reports the address it mailed, not the casing the manager typed,
    // so the query is lower-cased. The email column is a plain unique string,
    // which means rows have to be written lower-cased too.
    const employee = await this.prisma.employee.findUnique({
      where: { email: claims.email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        position: true,
        status: true,
        isActive: true,
      },
    });

    if (!employee) {
      throw new ForbiddenException('Akun belum terdaftar');
    }

    if (!employee.isActive) {
      throw new ForbiddenException('Akun tidak aktif');
    }

    request.employee = employee;
    return true;
  }

  private isPublic(context: ExecutionContext): boolean {
    return Boolean(
      this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]),
    );
  }
}

function bearerToken(request: AuthenticatedRequest): string {
  const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    throw new UnauthorizedException('Header login tidak ada');
  }
  return token;
}
