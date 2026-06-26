import { Injectable } from '@nestjs/common';
import { DateTime } from 'luxon';
import { PrismaService } from '../prisma/prisma.service';
import { AppException } from '../shared/exceptions/app.exception';
import type { CreateShiftDto } from './dto/create-shift.dto';
import type { ListShiftsQueryDto } from './dto/list-shifts-query.dto';
import type { ShiftResponseDto } from './dto/shift-response.dto';
import type { UpdateShiftDto } from './dto/update-shift.dto';

type ShiftRecord = {
  id: string;
  date: Date;
  startTime: string;
  endTime: string;
  employeeRole: ShiftResponseDto['employeeRole'];
  requiredCount: number;
};

function parseIsoDate(value: string, field: 'date' | 'from' | 'to'): DateTime {
  const date = DateTime.fromISO(value, { zone: 'utc' });

  if (!date.isValid) {
    throw new AppException(400, 'VALIDATION_ERROR', 'Validation failed', [
      { field, message: `${field} must be a valid ISO date` },
    ]);
  }

  return date.startOf('day');
}

function formatIsoDate(date: Date): string {
  return DateTime.fromJSDate(date, { zone: 'utc' }).toISODate() as string;
}

function mapShift(shift: ShiftRecord): ShiftResponseDto {
  return {
    id: shift.id,
    date: formatIsoDate(shift.date),
    startTime: shift.startTime,
    endTime: shift.endTime,
    employeeRole: shift.employeeRole,
    requiredCount: shift.requiredCount,
  };
}

@Injectable()
export class ShiftsService {
  constructor(private readonly prismaService: PrismaService) {}

  async createShift(dto: CreateShiftDto): Promise<ShiftResponseDto> {
    const shift = await this.prismaService.shift.create({
      data: {
        date: parseIsoDate(dto.date, 'date').toJSDate(),
        startTime: dto.startTime,
        endTime: dto.endTime,
        employeeRole: dto.employeeRole,
        requiredCount: dto.requiredCount,
      },
    });

    return mapShift(shift);
  }

  async listShifts(query: ListShiftsQueryDto): Promise<ShiftResponseDto[]> {
    const shifts = await this.prismaService.shift.findMany({
      where: {
        date: {
          gte: parseIsoDate(query.from, 'from').toJSDate(),
          lte: parseIsoDate(query.to, 'to').toJSDate(),
        },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return shifts.map(mapShift);
  }

  async updateShift(shiftId: string, dto: UpdateShiftDto): Promise<ShiftResponseDto> {
    await this.ensureShiftExists(shiftId);

    const shift = await this.prismaService.shift.update({
      where: { id: shiftId },
      data: {
        date: parseIsoDate(dto.date, 'date').toJSDate(),
        startTime: dto.startTime,
        endTime: dto.endTime,
        employeeRole: dto.employeeRole,
        requiredCount: dto.requiredCount,
      },
    });

    return mapShift(shift);
  }

  async deleteShift(shiftId: string): Promise<void> {
    await this.ensureShiftExists(shiftId);
    await this.prismaService.shift.delete({
      where: { id: shiftId },
    });
  }

  private async ensureShiftExists(shiftId: string): Promise<void> {
    const shift = await this.prismaService.shift.findUnique({
      where: { id: shiftId },
    });

    if (!shift) {
      throw new AppException(404, 'SHIFT_NOT_FOUND', 'Shift not found');
    }
  }
}
