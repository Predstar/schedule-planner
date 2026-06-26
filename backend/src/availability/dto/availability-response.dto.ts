import type { AvailabilityStatus } from '../availability.constants';

export class AvailabilityResponseEntryDto {
  date!: string;
  startTime!: string;
  endTime!: string;
  available!: boolean;
  preferred!: boolean;
}

export class AvailabilityResponseDto {
  id!: string;
  employeeId!: string;
  weekStartDate!: string;
  status!: AvailabilityStatus;
  entries!: AvailabilityResponseEntryDto[];
}
