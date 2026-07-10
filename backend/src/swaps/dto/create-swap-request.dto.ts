import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateSwapRequestDto {
  @IsUUID()
  targetEmployeeId!: string;

  // Actually the ScheduleAssignment id — named to match the public API contract,
  // which refers to it as the "shift" being given up.
  @IsUUID()
  requestingShiftId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}
