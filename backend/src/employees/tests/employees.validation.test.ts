import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { ListEmployeesQueryDto } from '../dto/list-employees-query.dto';

describe('Employees validation', () => {
  it('returns validation errors for missing required fields', async () => {
    const dto = plainToInstance(CreateEmployeeDto, {});
    const errors = await validate(dto);

    const fields = errors.map((error) => error.property);
    expect(fields).toContain('firstName');
    expect(fields).toContain('lastName');
    expect(fields).toContain('email');
    expect(fields).toContain('employmentType');
    expect(fields).toContain('employeeRole');
    expect(fields).toContain('weeklyHourLimit');
  });

  it('parses the active list filter as a boolean', async () => {
    const dto = plainToInstance(ListEmployeesQueryDto, { active: 'true' });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
    expect(dto.active).toBe(true);
  });
});
