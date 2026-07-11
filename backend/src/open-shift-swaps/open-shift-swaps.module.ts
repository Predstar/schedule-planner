import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { OpenShiftSwapsController } from './open-shift-swaps.controller';
import { OpenShiftSwapsService } from './open-shift-swaps.service';

@Module({
  imports: [PrismaModule, SchedulesModule, NotificationsModule],
  controllers: [OpenShiftSwapsController],
  providers: [OpenShiftSwapsService],
})
export class OpenShiftSwapsModule {}
