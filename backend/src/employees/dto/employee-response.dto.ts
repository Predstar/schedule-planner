import type { EmployeeRole, EmploymentType } from '../employees.constants';

export class EmployeeResponseDto {
  id!: string;
  firstName!: string;
  lastName!: string;
  email!: string;
  phone!: string | null;
  employmentType!: EmploymentType;
  employeeRole!: EmployeeRole;
  weeklyHourLimit!: number;
  active!: boolean;
}
