import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateOpenShiftPostDto {
  @IsUUID()
  assignmentId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}
