import type { EmployeeRole } from '../../employees/employees.constants';

export class ShiftResponseDto {
  id!: string;
  date!: string;
  startTime!: string;
  endTime!: string;
  employeeRole!: EmployeeRole;
  requiredCount!: number;
}
