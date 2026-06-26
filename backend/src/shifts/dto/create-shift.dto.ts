import {
  IsEnum,
  IsInt,
  Matches,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import {
  EmployeeRoleEnum,
  type EmployeeRole,
} from '../../employees/employees.constants';
import { SHIFT_DATE_PATTERN, SHIFT_TIME_PATTERN } from '../shifts.constants';

@ValidatorConstraint({ name: 'isShiftTimeRange', async: false })
class ShiftTimeRangeConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const shift = args.object as CreateShiftDto;

    if (
      !SHIFT_TIME_PATTERN.test(shift.startTime) ||
      !SHIFT_TIME_PATTERN.test(shift.endTime)
    ) {
      return true;
    }

    return shift.endTime > shift.startTime;
  }

  defaultMessage(): string {
    return 'endTime must be later than startTime';
  }
}

export class CreateShiftDto {
  @Matches(SHIFT_DATE_PATTERN, { message: 'date must be in YYYY-MM-DD format' })
  date!: string;

  @Matches(SHIFT_TIME_PATTERN, { message: 'startTime must be in HH:mm format' })
  startTime!: string;

  @Matches(SHIFT_TIME_PATTERN, { message: 'endTime must be in HH:mm format' })
  @Validate(ShiftTimeRangeConstraint)
  endTime!: string;

  @IsEnum(EmployeeRoleEnum)
  employeeRole!: EmployeeRole;

  @IsInt()
  @Min(1)
  requiredCount!: number;
}
