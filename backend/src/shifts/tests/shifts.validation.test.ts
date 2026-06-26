import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { ListShiftsQueryDto } from '../dto/list-shifts-query.dto';

describe('Shifts validation', () => {
  it('returns validation errors for missing create fields', async () => {
    const dto = plainToInstance(CreateShiftDto, {});
    const errors = await validate(dto);

    const fields = errors.map((error) => error.property);
    expect(fields).toContain('date');
    expect(fields).toContain('startTime');
    expect(fields).toContain('endTime');
    expect(fields).toContain('employeeRole');
    expect(fields).toContain('requiredCount');
  });

  it('rejects an invalid shift time range', async () => {
    const dto = plainToInstance(CreateShiftDto, {
      date: '2026-04-06',
      startTime: '23:00',
      endTime: '17:00',
      employeeRole: 'WAITER',
      requiredCount: 4,
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toContain('endTime');
  });

  it('rejects an invalid date range order', async () => {
    const dto = plainToInstance(ListShiftsQueryDto, {
      from: '2026-04-12',
      to: '2026-04-06',
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toContain('to');
  });
});
