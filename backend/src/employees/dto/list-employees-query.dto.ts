import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import {
  EmployeeRoleEnum,
  EmploymentTypeEnum,
  type EmployeeRole,
  type EmploymentType,
} from '../employees.constants';

function toBoolean(value: unknown): unknown {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return value;
}

export class ListEmployeesQueryDto {
  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsEnum(EmploymentTypeEnum)
  employmentType?: EmploymentType;

  @IsOptional()
  @IsEnum(EmployeeRoleEnum)
  employeeRole?: EmployeeRole;
}
