import { Body, Controller, Get, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUserPayload } from '../auth/types/auth-user-payload.type';
import { AvailabilityService } from './availability.service';
import { AvailabilityResponseDto } from './dto/availability-response.dto';
import { AvailabilityWeekQueryDto } from './dto/availability-week-query.dto';
import { SubmitAvailabilityDto } from './dto/submit-availability.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';

@Controller('availability')
@UseGuards(JwtAuthGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Post()
  submit(
    @Body() dto: SubmitAvailabilityDto,
    @CurrentUser() authUser: AuthUserPayload,
  ): Promise<AvailabilityResponseDto> {
    return this.availabilityService.submitAvailability(dto, authUser);
  }

  @Put(':availabilityId')
  update(
    @Param('availabilityId') availabilityId: string,
    @Body() dto: UpdateAvailabilityDto,
    @CurrentUser() authUser: AuthUserPayload,
  ): Promise<AvailabilityResponseDto> {
    return this.availabilityService.updateAvailability(availabilityId, dto, authUser);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MANAGER')
  list(@Query() query: AvailabilityWeekQueryDto): Promise<AvailabilityResponseDto[]> {
    return this.availabilityService.listAvailability(query);
  }

  @Get(':employeeId')
  getForEmployee(
    @Param('employeeId') employeeId: string,
    @Query() query: AvailabilityWeekQueryDto,
    @CurrentUser() authUser: AuthUserPayload,
  ): Promise<AvailabilityResponseDto> {
    return this.availabilityService.getEmployeeAvailability(employeeId, query, authUser);
  }
}
