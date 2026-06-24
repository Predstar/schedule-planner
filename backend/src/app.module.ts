import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EmployeesModule } from './employees/employees.module';
import { AvailabilityModule } from './availability/availability.module';
import { ShiftsModule } from './shifts/shifts.module';
import { SchedulesModule } from './schedules/schedules.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    EmployeesModule,
    AvailabilityModule,
    ShiftsModule,
    SchedulesModule,
  ],
})
export class AppModule {}
