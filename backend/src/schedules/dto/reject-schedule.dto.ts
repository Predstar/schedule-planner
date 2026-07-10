import { IsString, MinLength } from 'class-validator';

export class RejectScheduleDto {
  @IsString()
  @MinLength(1)
  reason!: string;
}
