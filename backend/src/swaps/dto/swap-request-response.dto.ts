export class SwapRequestResponseDto {
  id!: string;
  requestingEmployeeId!: string;
  requestingEmployeeName!: string;
  targetEmployeeId!: string;
  targetEmployeeName!: string;
  requestingShiftId!: string;
  requestingShiftDate!: string;
  requestingShiftStart!: string;
  requestingShiftEnd!: string;
  reason!: string;
  status!: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'APPROVED';
  createdAt!: string;
}
