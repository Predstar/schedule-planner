import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { AddAssignmentDto } from '../dto/add-assignment.dto';
import { CreateScheduleDto } from '../dto/create-schedule.dto';
import { GetScheduleQueryDto } from '../dto/get-schedule-query.dto';
import { RejectScheduleDto } from '../dto/reject-schedule.dto';
import { ReplaceAssignmentDto } from '../dto/replace-assignment.dto';

describe('Schedules validation', () => {
  it('validates create schedule input', async () => {
    const dto = plainToInstance(CreateScheduleDto, {});
    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toContain('weekStartDate');
  });

  it('validates get schedule query input', async () => {
    const dto = plainToInstance(GetScheduleQueryDto, { weekStartDate: 'bad-date' });
    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toContain('weekStartDate');
  });

  it('validates assignment DTOs', async () => {
    const addDto = plainToInstance(AddAssignmentDto, { shiftId: 'bad', employeeId: 'bad' });
    const replaceDto = plainToInstance(ReplaceAssignmentDto, { employeeId: 'bad' });

    const addErrors = await validate(addDto);
    const replaceErrors = await validate(replaceDto);

    expect(addErrors.map((error) => error.property)).toContain('shiftId');
    expect(addErrors.map((error) => error.property)).toContain('employeeId');
    expect(replaceErrors.map((error) => error.property)).toContain('employeeId');
  });

  it('reject requires a reason', async () => {
    const dto = plainToInstance(RejectScheduleDto, {});
    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('reason');
  });
});
