import { IsUUID } from 'class-validator';

export class ReplaceAssignmentDto {
  @IsUUID()
  employeeId!: string;
}
