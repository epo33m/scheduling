import { Controller, Get } from '@nestjs/common';
import type { SessionEmployee } from '@repo/types';
import { CurrentEmployee } from './current-employee.decorator';

@Controller('auth')
export class AuthController {
  /**
   * Who is signed in, and with which role. The web calls this right after the
   * Google round trip: a 403 here is the "akun belum terdaftar" gate.
   */
  @Get('me')
  me(@CurrentEmployee() employee: SessionEmployee): SessionEmployee {
    return employee;
  }
}
