import { Matches } from 'class-validator';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class AvailabilityWeekQueryDto {
  @Matches(DATE_PATTERN, { message: 'weekStartDate must be in YYYY-MM-DD format' })
  weekStartDate!: string;
}
