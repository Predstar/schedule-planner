import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../shared/exceptions/app.exception';
import type { AddAssignmentDto } from './dto/add-assignment.dto';
import type { CreateScheduleDto } from './dto/create-schedule.dto';
import type { AssignmentResponseDto, ScheduleResponseDto } from './dto/schedule-response.dto';

function parseIsoDate(value: string, field: string): DateTime {
  const dt = DateTime.fromISO(value, { zone: 'utc' });
  if (!dt.isValid) {
    throw new AppException(400, 'VALIDATION_ERROR', 'Validation failed', [
      { field, message: `${field} must be a valid ISO date` },
    ]);
  }
  return dt.startOf('day');
}

function formatIsoDate(date: Date): string {
  return DateTime.fromJSDate(date, { zone: 'utc' }).toISODate() as string;
}

type FullSchedule = {
  id: string;
  weekStartDate: Date;
  status: 'DRAFT' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
  assignments: Array<{
    id: string;
    shiftId: string;
    employeeId: string;
    employee: { firstName: string; lastName: string };
    shift: { date: Date; startTime: string; endTime: string; employeeRole: 'WAITER' | 'RUNNER' | 'BARTENDER' };
  }>;
};

function mapSchedule(s: FullSchedule): ScheduleResponseDto {
  return {
    id: s.id,
    weekStartDate: formatIsoDate(s.weekStartDate),
    status: s.status,
    assignments: s.assignments.map((a): AssignmentResponseDto => ({
      assignmentId: a.id,
      shiftId: a.shiftId,
      employeeId: a.employeeId,
      employeeName: `${a.employee.firstName} ${a.employee.lastName}`,
      date: formatIsoDate(a.shift.date),
      startTime: a.shift.startTime,
      endTime: a.shift.endTime,
      employeeRole: a.shift.employeeRole,
    })),
  };
}

const INCLUDE = {
  assignments: {
    include: {
      employee: { select: { firstName: true, lastName: true } },
      shift: true,
    },
  },
} as const;

@Injectable()
export class SchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async createSchedule(dto: CreateScheduleDto): Promise<ScheduleResponseDto> {
    const weekStart = parseIsoDate(dto.weekStartDate, 'weekStartDate').toJSDate();

    const existing = await this.prisma.schedule.findUnique({ where: { weekStartDate: weekStart } });
    if (existing) {
      throw new AppException(409, 'SCHEDULE_ALREADY_EXISTS', 'A schedule for this week already exists');
    }

    const schedule = await this.prisma.schedule.create({
      data: { weekStartDate: weekStart, status: 'DRAFT' },
      include: INCLUDE,
    });

    return mapSchedule(schedule as unknown as FullSchedule);
  }

  async getSchedule(weekStartDate: string): Promise<ScheduleResponseDto> {
    const weekStart = parseIsoDate(weekStartDate, 'weekStartDate').toJSDate();

    const schedule = await this.prisma.schedule.findUnique({
      where: { weekStartDate: weekStart },
      include: INCLUDE,
    });

    if (!schedule) {
      throw new AppException(404, 'SCHEDULE_NOT_FOUND', 'No schedule found for this week');
    }

    return mapSchedule(schedule as unknown as FullSchedule);
  }

  async addAssignment(scheduleId: string, dto: AddAssignmentDto): Promise<ScheduleResponseDto> {
    const schedule = await this.prisma.schedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) throw new AppException(404, 'SCHEDULE_NOT_FOUND', 'Schedule not found');

    const shift = await this.prisma.shift.findUnique({ where: { id: dto.shiftId } });
    if (!shift) throw new AppException(404, 'SHIFT_NOT_FOUND', 'Shift not found');

    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new AppException(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found');

    const existing = await this.prisma.assignment.findUnique({
      where: { scheduleId_shiftId_employeeId: { scheduleId, shiftId: dto.shiftId, employeeId: dto.employeeId } },
    });
    if (existing) throw new AppException(409, 'ASSIGNMENT_ALREADY_EXISTS', 'Employee is already assigned to this shift');

    await this.prisma.assignment.create({
      data: { scheduleId, shiftId: dto.shiftId, employeeId: dto.employeeId },
    });

    const updated = await this.prisma.schedule.findUnique({ where: { id: scheduleId }, include: INCLUDE });
    return mapSchedule(updated as unknown as FullSchedule);
  }

  async removeAssignment(scheduleId: string, assignmentId: string): Promise<void> {
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment || assignment.scheduleId !== scheduleId) {
      throw new AppException(404, 'ASSIGNMENT_NOT_FOUND', 'Assignment not found');
    }
    await this.prisma.assignment.delete({ where: { id: assignmentId } });
  }

  async publishSchedule(scheduleId: string): Promise<ScheduleResponseDto> {
    const schedule = await this.prisma.schedule.findUnique({ where: { id: scheduleId } });
    if (!schedule) throw new AppException(404, 'SCHEDULE_NOT_FOUND', 'Schedule not found');

    const updated = await this.prisma.schedule.update({
      where: { id: scheduleId },
      data: { status: 'PUBLISHED' },
      include: INCLUDE,
    });

    return mapSchedule(updated as unknown as FullSchedule);
  }

  async getMyRoleSchedule(weekStartDate: string, employeeId: string): Promise<ScheduleResponseDto> {
    const weekStart = parseIsoDate(weekStartDate, 'weekStartDate').toJSDate();

    const schedule = await this.prisma.schedule.findUnique({
      where: { weekStartDate: weekStart },
      include: INCLUDE,
    });

    if (!schedule || schedule.status !== 'PUBLISHED') {
      throw new AppException(404, 'SCHEDULE_NOT_FOUND', 'No published schedule found for this week');
    }

    const full = schedule as unknown as FullSchedule;
    return {
      ...mapSchedule(full),
      assignments: mapSchedule(full).assignments.filter(a => a.employeeId === employeeId),
    };
  }
}
