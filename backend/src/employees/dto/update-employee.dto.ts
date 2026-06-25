import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import {
  EmployeeRoleEnum,
  EmploymentTypeEnum,
  type EmployeeRole,
  type EmploymentType,
} from '../employees.constants';

export class UpdateEmployeeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEnum(EmploymentTypeEnum)
  employmentType?: EmploymentType;

  @IsOptional()
  @IsEnum(EmployeeRoleEnum)
  employeeRole?: EmployeeRole;

  @IsOptional()
  @IsInt()
  @Min(1)
  weeklyHourLimit?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
