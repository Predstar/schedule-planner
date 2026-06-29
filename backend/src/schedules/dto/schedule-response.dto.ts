export class AssignmentResponseDto {
  assignmentId!: string;
  shiftId!: string;
  employeeId!: string;
  employeeName!: string;
  date!: string;
  startTime!: string;
  endTime!: string;
  employeeRole!: 'WAITER' | 'RUNNER' | 'BARTENDER';
}

export class ScheduleResponseDto {
  id!: string;
  weekStartDate!: string;
  status!: 'DRAFT' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
  assignments!: AssignmentResponseDto[];
}
