import { IsDateString } from 'class-validator';

export class WeekQueryDto {
  @IsDateString()
  weekStartDate!: string;
}
