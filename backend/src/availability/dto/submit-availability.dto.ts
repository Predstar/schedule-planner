import { IsUUID, Matches } from 'class-validator';
import { AvailabilityEntriesDto } from './availability-entry.dto';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class SubmitAvailabilityDto extends AvailabilityEntriesDto {
  @IsUUID()
  employeeId!: string;

  @Matches(DATE_PATTERN, { message: 'weekStartDate must be in YYYY-MM-DD format' })
  weekStartDate!: string;
}
