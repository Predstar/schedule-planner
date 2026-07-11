import { Module } from '@nestjs/common';
import { AvailabilityModule } from './availability/availability.module';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { PrismaModule } from './prisma/prisma.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OpenShiftSwapsModule } from './open-shift-swaps/open-shift-swaps.module';
import { SchedulesModule } from './schedules/schedules.module';
import { ShiftsModule } from './shifts/shifts.module';
import { SwapsModule } from './swaps/swaps.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    EmployeesModule,
    AvailabilityModule,
    ShiftsModule,
    SchedulesModule,
    SwapsModule,
    OpenShiftSwapsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
