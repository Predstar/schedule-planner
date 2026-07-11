import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUserPayload } from '../auth/types/auth-user-payload.type';
import { CreateOpenShiftPostDto } from './dto/create-open-shift-post.dto';
import type { OpenShiftPostResponseDto } from './dto/open-shift-post-response.dto';
import { OpenShiftSwapsService } from './open-shift-swaps.service';

@Controller('open-shift-swaps')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OpenShiftSwapsController {
  constructor(private readonly openShiftSwapsService: OpenShiftSwapsService) {}

  @Post()
  @Roles('EMPLOYEE')
  create(
    @Body() dto: CreateOpenShiftPostDto,
    @CurrentUser() authUser: AuthUserPayload,
  ): Promise<OpenShiftPostResponseDto> {
    return this.openShiftSwapsService.createPost(dto, authUser);
  }

  @Get('open')
  @Roles('EMPLOYEE')
  listOpen(@CurrentUser() authUser: AuthUserPayload): Promise<OpenShiftPostResponseDto[]> {
    return this.openShiftSwapsService.listOpenPosts(authUser);
  }

  @Get('my')
  @Roles('EMPLOYEE')
  getMine(@CurrentUser() authUser: AuthUserPayload): Promise<OpenShiftPostResponseDto[]> {
    return this.openShiftSwapsService.getMyPosts(authUser);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER')
  listForManager(): Promise<OpenShiftPostResponseDto[]> {
    return this.openShiftSwapsService.listAllForManager();
  }

  @Patch(':postId/claim')
  @Roles('EMPLOYEE')
  claim(
    @Param('postId') postId: string,
    @CurrentUser() authUser: AuthUserPayload,
  ): Promise<OpenShiftPostResponseDto> {
    return this.openShiftSwapsService.claimPost(postId, authUser);
  }

  @Patch(':postId/cancel')
  @Roles('EMPLOYEE')
  cancel(
    @Param('postId') postId: string,
    @CurrentUser() authUser: AuthUserPayload,
  ): Promise<OpenShiftPostResponseDto> {
    return this.openShiftSwapsService.cancelPost(postId, authUser);
  }

  @Patch(':postId/claims/:claimId/approve')
  @Roles('ADMIN', 'MANAGER')
  approveClaim(
    @Param('postId') postId: string,
    @Param('claimId') claimId: string,
  ): Promise<OpenShiftPostResponseDto> {
    return this.openShiftSwapsService.approveClaim(postId, claimId);
  }

  @Patch(':postId/claims/:claimId/reject')
  @Roles('ADMIN', 'MANAGER')
  rejectClaim(
    @Param('postId') postId: string,
    @Param('claimId') claimId: string,
  ): Promise<OpenShiftPostResponseDto> {
    return this.openShiftSwapsService.rejectClaim(postId, claimId);
  }
}
