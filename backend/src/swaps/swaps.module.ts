import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SwapsController } from './swaps.controller';
import { SwapsService } from './swaps.service';

@Module({
  imports: [PrismaModule],
  controllers: [SwapsController],
  providers: [SwapsService],
})
export class SwapsModule {}
