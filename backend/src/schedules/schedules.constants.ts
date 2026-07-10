export const SCHEDULE_STATUSES = ['DRAFT', 'APPROVED', 'REJECTED', 'PUBLISHED'] as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

export const SCHEDULE_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
