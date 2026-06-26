import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../shared/exceptions/app.exception';
import type { AuthUserPayload } from '../auth/types/auth-user-payload.type';
import { BERLIN_TIMEZONE } from './availability.constants';
import type { AvailabilityWeekQueryDto } from './dto/availability-week-query.dto';
import type { AvailabilityResponseDto } from './dto/availability-response.dto';
import type { SubmitAvailabilityDto } from './dto/submit-availability.dto';
import type { UpdateAvailabilityDto } from './dto/update-availability.dto';

type AvailabilityRecord = {
  id: string;
  employeeId: string;
  weekStartDate: Date;
  status: 'SUBMITTED';
  entries: Array<{
    date: Date;
    startTime: string;
    endTime: string;
    available: boolean;
    preferred: boolean;
  }>;
};

function parseIsoDate(date: string): DateTime {
  const value = DateTime.fromISO(date, { zone: 'utc' });

  if (!value.isValid) {
    throw new AppException(400, 'VALIDATION_ERROR', 'Validation failed', [
      { field: 'weekStartDate', message: 'weekStartDate must be a valid ISO date' },
    ]);
  }

  return value.startOf('day');
}

function parseEntryDate(date: string): DateTime {
  const value = DateTime.fromISO(date, { zone: 'utc' });

  if (!value.isValid) {
    throw new AppException(400, 'VALIDATION_ERROR', 'Validation failed', [
      { field: 'date', message: 'date must be a valid ISO date' },
    ]);
  }

  return value.startOf('day');
}

function formatIsoDate(date: Date): string {
  return DateTime.fromJSDate(date, { zone: 'utc' }).toISODate() as string;
}

function mapAvailability(record: AvailabilityRecord): AvailabilityResponseDto {
  return {
    id: record.id,
    employeeId: record.employeeId,
    weekStartDate: formatIsoDate(record.weekStartDate),
    status: record.status,
    entries: record.entries.map((entry) => ({
      date: formatIsoDate(entry.date),
      startTime: entry.startTime,
      endTime: entry.endTime,
      available: entry.available,
      preferred: entry.preferred,
    })),
  };
}

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly nowProvider: () => DateTime = () => DateTime.utc(),
  ) {}

  async submitAvailability(
    dto: SubmitAvailabilityDto,
    authUser: AuthUserPayload,
  ): Promise<AvailabilityResponseDto> {
    this.assertEmployeeAccess(authUser, dto.employeeId);
    await this.ensureEmployeeExists(dto.employeeId);
    this.ensureEmployeeDeadline(authUser, dto.weekStartDate);
    this.validateEntriesWithinWeek(dto.weekStartDate, dto.entries);

    const weekStartDate = parseIsoDate(dto.weekStartDate).toJSDate();
    const existingAvailability = await this.prismaService.availability.findUnique({
      where: {
        employeeId_weekStartDate: {
          employeeId: dto.employeeId,
          weekStartDate,
        },
      },
      include: { entries: true },
    });

    if (existingAvailability) {
      throw new AppException(
        409,
        'AVAILABILITY_ALREADY_SUBMITTED',
        'Availability already submitted',
      );
    }

    const availability = await this.prismaService.availability.create({
      data: {
        employeeId: dto.employeeId,
        weekStartDate,
        status: 'SUBMITTED',
        entries: {
          create: dto.entries.map((entry) => ({
            date: parseEntryDate(entry.date).toJSDate(),
            startTime: entry.startTime,
            endTime: entry.endTime,
            available: entry.available,
            preferred: entry.preferred,
          })),
        },
      },
      include: { entries: true },
    });

    return mapAvailability(availability);
  }

  async updateAvailability(
    availabilityId: string,
    dto: UpdateAvailabilityDto,
    authUser: AuthUserPayload,
  ): Promise<AvailabilityResponseDto> {
    const existingAvailability = await this.prismaService.availability.findUnique({
      where: { id: availabilityId },
      include: { entries: true },
    });

    if (!existingAvailability) {
      throw new AppException(404, 'AVAILABILITY_NOT_FOUND', 'Availability not found');
    }

    this.assertEmployeeAccess(authUser, existingAvailability.employeeId);
    this.ensureEmployeeDeadline(authUser, formatIsoDate(existingAvailability.weekStartDate));
    this.validateEntriesWithinWeek(formatIsoDate(existingAvailability.weekStartDate), dto.entries);

    const availability = await this.prismaService.$transaction(async (tx) => {
      await tx.availabilityEntry.deleteMany({
        where: { availabilityId },
      });

      return tx.availability.update({
        where: { id: availabilityId },
        data: {
          entries: {
            create: dto.entries.map((entry) => ({
              date: parseEntryDate(entry.date).toJSDate(),
              startTime: entry.startTime,
              endTime: entry.endTime,
              available: entry.available,
              preferred: entry.preferred,
            })),
          },
        },
        include: { entries: true },
      });
    });

    return mapAvailability(availability);
  }

  async getEmployeeAvailability(
    employeeId: string,
    query: AvailabilityWeekQueryDto,
    authUser: AuthUserPayload,
  ): Promise<AvailabilityResponseDto> {
    this.assertEmployeeViewAccess(authUser, employeeId);

    const availability = await this.prismaService.availability.findUnique({
      where: {
        employeeId_weekStartDate: {
          employeeId,
          weekStartDate: parseIsoDate(query.weekStartDate).toJSDate(),
        },
      },
      include: { entries: true },
    });

    if (!availability) {
      throw new AppException(404, 'AVAILABILITY_NOT_FOUND', 'Availability not found');
    }

    return mapAvailability(availability);
  }

  async listAvailability(query: AvailabilityWeekQueryDto): Promise<AvailabilityResponseDto[]> {
    const availabilities = await this.prismaService.availability.findMany({
      where: {
        weekStartDate: parseIsoDate(query.weekStartDate).toJSDate(),
      },
      include: { entries: true },
      orderBy: [{ employeeId: 'asc' }],
    });

    return availabilities.map(mapAvailability);
  }

  private assertEmployeeAccess(authUser: AuthUserPayload, employeeId: string): void {
    if (authUser.systemRole !== 'EMPLOYEE') {
      return;
    }

    if (!authUser.employeeId || authUser.employeeId !== employeeId) {
      throw new AppException(403, 'ACCESS_DENIED', 'Access denied');
    }
  }

  private assertEmployeeViewAccess(authUser: AuthUserPayload, employeeId: string): void {
    if (authUser.systemRole === 'ADMIN' || authUser.systemRole === 'MANAGER') {
      return;
    }

    if (authUser.systemRole === 'EMPLOYEE' && authUser.employeeId === employeeId) {
      return;
    }

    throw new AppException(403, 'ACCESS_DENIED', 'Access denied');
  }

  private ensureEmployeeDeadline(authUser: AuthUserPayload, weekStartDate: string): void {
    if (authUser.systemRole !== 'EMPLOYEE') {
      return;
    }

    const deadline = DateTime.fromISO(weekStartDate, { zone: BERLIN_TIMEZONE })
      .startOf('day')
      .minus({ days: 2 });
    const now = this.nowProvider().setZone(BERLIN_TIMEZONE);

    if (now >= deadline) {
      throw new AppException(
        409,
        'AVAILABILITY_DEADLINE_PASSED',
        'Availability deadline passed',
      );
    }
  }

  private validateEntriesWithinWeek(
    weekStartDate: string,
    entries: Array<{ date: string; startTime: string; endTime: string }>,
  ): void {
    const start = parseIsoDate(weekStartDate);
    const end = start.plus({ days: 6 });
    const invalidEntries = entries.filter((entry) => {
      const entryDate = parseEntryDate(entry.date);
      return entryDate < start || entryDate > end;
    });

    if (invalidEntries.length > 0) {
      throw new AppException(400, 'VALIDATION_ERROR', 'Validation failed', [
        {
          field: 'entries',
          message: 'entry date must be within the requested availability week',
        },
      ]);
    }
  }

  private async ensureEmployeeExists(employeeId: string): Promise<void> {
    const employee = await this.prismaService.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new AppException(404, 'EMPLOYEE_NOT_FOUND', 'Employee not found');
    }
  }
}
