import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUserPayload } from '../auth/types/auth-user-payload.type';
import { AppException } from '../shared/exceptions/app.exception';
import { AddAssignmentDto } from './dto/add-assignment.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import type { ScheduleResponseDto } from './dto/schedule-response.dto';
import { WeekQueryDto } from './dto/week-query.dto';
import { SchedulesService } from './schedules.service';

@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  create(@Body() dto: CreateScheduleDto): Promise<ScheduleResponseDto> {
    return this.schedulesService.createSchedule(dto);
  }

  @Get('my-role')
  @Roles('EMPLOYEE')
  getMyRole(
    @Query() query: WeekQueryDto,
    @CurrentUser() user: AuthUserPayload,
  ): Promise<ScheduleResponseDto> {
    if (!user.employeeId) {
      throw new AppException(403, 'NO_EMPLOYEE_PROFILE', 'Your account is not linked to an employee profile');
    }
    return this.schedulesService.getMyRoleSchedule(query.weekStartDate, user.employeeId);
  }

  @Get()
  @Roles('ADMIN', 'MANAGER')
  get(@Query() query: WeekQueryDto): Promise<ScheduleResponseDto> {
    return this.schedulesService.getSchedule(query.weekStartDate);
  }

  @Post(':scheduleId/assignments')
  @Roles('ADMIN', 'MANAGER')
  addAssignment(
    @Param('scheduleId') scheduleId: string,
    @Body() dto: AddAssignmentDto,
  ): Promise<ScheduleResponseDto> {
    return this.schedulesService.addAssignment(scheduleId, dto);
  }

  @Delete(':scheduleId/assignments/:assignmentId')
  @Roles('ADMIN', 'MANAGER')
  removeAssignment(
    @Param('scheduleId') scheduleId: string,
    @Param('assignmentId') assignmentId: string,
  ): Promise<void> {
    return this.schedulesService.removeAssignment(scheduleId, assignmentId);
  }

  @Patch(':scheduleId/publish')
  @Roles('ADMIN', 'MANAGER')
  publish(@Param('scheduleId') scheduleId: string): Promise<ScheduleResponseDto> {
    return this.schedulesService.publishSchedule(scheduleId);
  }
}
