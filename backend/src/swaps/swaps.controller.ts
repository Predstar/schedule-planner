import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUserPayload } from '../auth/types/auth-user-payload.type';
import { CreateSwapRequestDto } from './dto/create-swap-request.dto';
import { ListSwapsQueryDto } from './dto/list-swaps-query.dto';
import type { SwapRequestResponseDto } from './dto/swap-request-response.dto';
import { SwapsService } from './swaps.service';

@Controller('swaps')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SwapsController {
  constructor(private readonly swapsService: SwapsService) {}

  @Post()
  @Roles('EMPLOYEE')
  create(
    @Body() dto: CreateSwapRequestDto,
    @CurrentUser() authUser: AuthUserPayload,
  ): Promise<SwapRequestResponseDto> {
    return this.swapsService.createSwapRequest(dto, authUser);
  }

  @Get('my')
  @Roles('EMPLOYEE')
  getMine(@CurrentUser() authUser: AuthUserPayload): Promise<SwapRequestResponseDto[]> {
    return this.swapsService.getMySwapRequests(authUser);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER')
  list(@Query() query: ListSwapsQueryDto): Promise<SwapRequestResponseDto[]> {
    return this.swapsService.listSwapRequests(query);
  }

  @Patch(':swapId/accept')
  @Roles('EMPLOYEE')
  accept(
    @Param('swapId') swapId: string,
    @CurrentUser() authUser: AuthUserPayload,
  ): Promise<SwapRequestResponseDto> {
    return this.swapsService.acceptSwapRequest(swapId, authUser);
  }

  @Patch(':swapId/decline')
  @Roles('EMPLOYEE')
  decline(
    @Param('swapId') swapId: string,
    @CurrentUser() authUser: AuthUserPayload,
  ): Promise<SwapRequestResponseDto> {
    return this.swapsService.declineSwapRequest(swapId, authUser);
  }

  @Patch(':swapId/approve')
  @Roles('ADMIN', 'MANAGER')
  approve(@Param('swapId') swapId: string): Promise<SwapRequestResponseDto> {
    return this.swapsService.approveSwapRequest(swapId);
  }

  @Patch(':swapId/reject')
  @Roles('ADMIN', 'MANAGER')
  reject(@Param('swapId') swapId: string): Promise<SwapRequestResponseDto> {
    return this.swapsService.rejectSwapRequest(swapId);
  }
}
