import {
  IsArray,
  IsBoolean,
  Matches,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
} from 'class-validator';
import { Type } from 'class-transformer';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

@ValidatorConstraint({ name: 'isTimeRange', async: false })
class TimeRangeConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const entry = args.object as AvailabilityEntryDto;

    if (!TIME_PATTERN.test(entry.startTime) || !TIME_PATTERN.test(entry.endTime)) {
      return true;
    }

    return entry.endTime > entry.startTime;
  }

  defaultMessage(): string {
    return 'endTime must be later than startTime';
  }
}

export class AvailabilityEntryDto {
  @Matches(DATE_PATTERN, { message: 'date must be in YYYY-MM-DD format' })
  date!: string;

  @Matches(TIME_PATTERN, { message: 'startTime must be in HH:mm format' })
  startTime!: string;

  @Matches(TIME_PATTERN, { message: 'endTime must be in HH:mm format' })
  @Validate(TimeRangeConstraint)
  endTime!: string;

  @IsBoolean()
  available!: boolean;

  @IsBoolean()
  preferred!: boolean;
}

export class AvailabilityEntriesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilityEntryDto)
  entries!: AvailabilityEntryDto[];
}
