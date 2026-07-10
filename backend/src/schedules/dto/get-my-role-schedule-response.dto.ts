import type { EmployeeRole } from '../../employees/employees.constants';

export class MyRoleScheduleAssignmentResponseDto {
  assignmentId!: string;
  shiftId!: string;
  employeeId!: string;
  employeeName!: string;
  date!: string;
  startTime!: string;
  endTime!: string;
  employeeRole!: EmployeeRole;
}

export class GetMyRoleScheduleResponseDto {
  weekStartDate!: string;
  employeeRole!: EmployeeRole;
  status!: 'PUBLISHED';
  assignments!: MyRoleScheduleAssignmentResponseDto[];
}
