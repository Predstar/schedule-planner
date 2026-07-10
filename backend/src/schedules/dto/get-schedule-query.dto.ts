import { Matches } from 'class-validator';
import { SCHEDULE_DATE_PATTERN } from '../schedules.constants';

export class GetScheduleQueryDto {
  @Matches(SCHEDULE_DATE_PATTERN, { message: 'weekStartDate must be in YYYY-MM-DD format' })
  weekStartDate!: string;
}
