import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { OpenShiftSwapsController } from './open-shift-swaps.controller';
import { OpenShiftSwapsService } from './open-shift-swaps.service';

@Module({
  imports: [PrismaModule, SchedulesModule],
  controllers: [OpenShiftSwapsController],
  providers: [OpenShiftSwapsService],
})
export class OpenShiftSwapsModule {}
