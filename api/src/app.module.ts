import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth/auth.guard';
import { AuthModule } from './auth/auth.module';
import { RolesGuard } from './auth/roles.guard';
import { EmployeeModule } from './employee/employee.module';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { RequestModule } from './request/request.module';
import { ScheduleModule } from './schedule/schedule.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    HealthModule,
    EmployeeModule,
    RequestModule,
    ScheduleModule,
  ],
  providers: [
    // Order matters: AuthGuard resolves the employee, RolesGuard reads that
    // employee's role. Every route is closed until it opts out with @Public().
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
