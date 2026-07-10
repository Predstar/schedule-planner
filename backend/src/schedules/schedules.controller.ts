import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthUserPayload } from '../auth/types/auth-user-payload.type';
import { AddAssignmentDto } from './dto/add-assignment.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { GetScheduleQueryDto } from './dto/get-schedule-query.dto';
import { GetMyRoleScheduleResponseDto } from './dto/get-my-role-schedule-response.dto';
import { RejectScheduleDto } from './dto/reject-schedule.dto';
import { ReplaceAssignmentDto } from './dto/replace-assignment.dto';
import { ScheduleResponseDto } from './dto/schedule-response.dto';
import { SchedulesService } from './schedules.service';

@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  create(@Body() dto: CreateScheduleDto): Promise<ScheduleResponseDto> {
    return this.schedulesService.createDraftSchedule(dto);
  }

  @Get()
  getWeeklySchedule(@Query() query: GetScheduleQueryDto): Promise<ScheduleResponseDto> {
    return this.schedulesService.getWeeklySchedule(query);
  }

  @Get('my-role')
  @Roles('EMPLOYEE')
  getMyRoleSchedule(
    @Query() query: GetScheduleQueryDto,
    @CurrentUser() authUser: AuthUserPayload,
  ): Promise<GetMyRoleScheduleResponseDto> {
    return this.schedulesService.getMyRolePublishedSchedule(query, authUser);
  }

  @Post(':scheduleId/assignments')
  addAssignment(
    @Param('scheduleId') scheduleId: string,
    @Body() dto: AddAssignmentDto,
  ): Promise<ScheduleResponseDto> {
    return this.schedulesService.addAssignment(scheduleId, dto);
  }

  @Delete(':scheduleId/assignments/:assignmentId')
  removeAssignment(
    @Param('scheduleId') scheduleId: string,
    @Param('assignmentId') assignmentId: string,
  ): Promise<ScheduleResponseDto> {
    return this.schedulesService.removeAssignment(scheduleId, assignmentId);
  }

  @Put(':scheduleId/assignments/:assignmentId')
  replaceAssignment(
    @Param('scheduleId') scheduleId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: ReplaceAssignmentDto,
  ): Promise<ScheduleResponseDto> {
    return this.schedulesService.replaceAssignment(scheduleId, assignmentId, dto);
  }

  @Post('auto-generate')
  autoGenerate(@Body() dto: CreateScheduleDto): Promise<ScheduleResponseDto> {
    return this.schedulesService.autoGenerateSchedule(dto.weekStartDate);
  }

  @Patch(':scheduleId/approve')
  approve(@Param('scheduleId') scheduleId: string): Promise<ScheduleResponseDto> {
    return this.schedulesService.approveSchedule(scheduleId);
  }

  @Patch(':scheduleId/reject')
  reject(
    @Param('scheduleId') scheduleId: string,
    @Body() dto: RejectScheduleDto,
  ): Promise<ScheduleResponseDto> {
    return this.schedulesService.rejectSchedule(scheduleId, dto);
  }

  @Patch(':scheduleId/publish')
  publish(@Param('scheduleId') scheduleId: string): Promise<ScheduleResponseDto> {
    return this.schedulesService.publishSchedule(scheduleId);
  }
}
