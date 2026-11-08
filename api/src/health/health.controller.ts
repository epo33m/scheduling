import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/auth.decorators';

export interface HealthResponse {
  status: 'ok';
}

@Controller('health')
export class HealthController {
  /** Answers before anyone is signed in, so the uptime monitor can reach it. */
  @Public()
  @Get()
  check(): HealthResponse {
    return { status: 'ok' };
  }
}
