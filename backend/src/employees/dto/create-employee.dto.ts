import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';
import {
  EmployeeRoleEnum,
  EmploymentTypeEnum,
  type EmployeeRole,
  type EmploymentType,
} from '../employees.constants';

export class CreateEmployeeDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @MinLength(1)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsEnum(EmploymentTypeEnum)
  employmentType!: EmploymentType;

  @IsEnum(EmployeeRoleEnum)
  employeeRole!: EmployeeRole;

  @IsInt()
  @Min(1)
  weeklyHourLimit!: number;
}
