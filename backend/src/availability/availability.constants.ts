export const AVAILABILITY_STATUSES = ['SUBMITTED'] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export const BERLIN_TIMEZONE = 'Europe/Berlin';
