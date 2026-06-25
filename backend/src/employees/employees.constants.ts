export const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'MINI_JOB'] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYEE_ROLES = ['WAITER', 'RUNNER', 'BARTENDER'] as const;
export type EmployeeRole = (typeof EMPLOYEE_ROLES)[number];

export const EmploymentTypeEnum = {
  FULL_TIME: 'FULL_TIME',
  PART_TIME: 'PART_TIME',
  MINI_JOB: 'MINI_JOB',
} as const;

export const EmployeeRoleEnum = {
  WAITER: 'WAITER',
  RUNNER: 'RUNNER',
  BARTENDER: 'BARTENDER',
} as const;
