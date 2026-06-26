import {
  Matches,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { SHIFT_DATE_PATTERN } from '../shifts.constants';

@ValidatorConstraint({ name: 'isShiftDateRange', async: false })
class ShiftDateRangeConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const query = args.object as ListShiftsQueryDto;

    if (
      !SHIFT_DATE_PATTERN.test(query.from) ||
      !SHIFT_DATE_PATTERN.test(query.to)
    ) {
      return true;
    }

    return query.from <= query.to;
  }

  defaultMessage(): string {
    return 'to must be on or after from';
  }
}

export class ListShiftsQueryDto {
  @Matches(SHIFT_DATE_PATTERN, { message: 'from must be in YYYY-MM-DD format' })
  from!: string;

  @Matches(SHIFT_DATE_PATTERN, { message: 'to must be in YYYY-MM-DD format' })
  @Validate(ShiftDateRangeConstraint)
  to!: string;
}
