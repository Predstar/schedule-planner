import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { AvailabilityWeekQueryDto } from '../dto/availability-week-query.dto';
import { SubmitAvailabilityDto } from '../dto/submit-availability.dto';

describe('Availability validation', () => {
  it('returns validation errors for missing required submit fields', async () => {
    const dto = plainToInstance(SubmitAvailabilityDto, {});
    const errors = await validate(dto);

    const fields = errors.map((error) => error.property);
    expect(fields).toContain('employeeId');
    expect(fields).toContain('weekStartDate');
    expect(fields).toContain('entries');
  });

  it('rejects an invalid availability entry time range', async () => {
    const dto = plainToInstance(SubmitAvailabilityDto, {
      employeeId: '5d3d8445-70e4-4c40-a01d-6fa728d61f3b',
      weekStartDate: '2026-04-06',
      entries: [
        {
          date: '2026-04-06',
          startTime: '17:00',
          endTime: '09:00',
          available: true,
          preferred: false,
        },
      ],
    });

    const errors = await validate(dto);
    expect(errors[0]?.children?.[0]?.children?.map((error) => error.property)).toContain('endTime');
  });

  it('accepts the week query shape', async () => {
    const dto = plainToInstance(AvailabilityWeekQueryDto, {
      weekStartDate: '2026-04-06',
    });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });
});
