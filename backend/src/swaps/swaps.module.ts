import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SwapsController } from './swaps.controller';
import { SwapsService } from './swaps.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [SwapsController],
  providers: [SwapsService],
})
export class SwapsModule {}
