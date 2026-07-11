export class ShiftClaimResponseDto {
  id!: string;
  claimingEmployeeId!: string;
  claimingEmployeeName!: string;
  status!: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt!: string;
}

export class OpenShiftPostResponseDto {
  id!: string;
  assignmentId!: string;
  postedByEmployeeId!: string;
  postedByEmployeeName!: string;
  shiftDate!: string;
  shiftStartTime!: string;
  shiftEndTime!: string;
  employeeRole!: string;
  reason!: string;
  status!: 'OPEN' | 'CLAIMED' | 'APPROVED' | 'CANCELLED';
  createdAt!: string;
  claims!: ShiftClaimResponseDto[];
}
