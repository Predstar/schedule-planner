import { IsUUID } from 'class-validator';

export class AddAssignmentDto {
  @IsUUID()
  shiftId!: string;

  @IsUUID()
  employeeId!: string;
}
