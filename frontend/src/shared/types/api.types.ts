// ─── System / Employee Roles ─────────────────────────────────────────────────

export type SystemRole = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';
export type EmployeeRole = 'WAITER' | 'RUNNER' | 'BARTENDER';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'MINI_JOB';
export type ScheduleStatus = 'DRAFT' | 'APPROVED' | 'REJECTED' | 'PUBLISHED';
export type AvailabilityStatus = 'SUBMITTED' | 'UPDATED';

// ─── Error Response ───────────────────────────────────────────────────────────

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiError {
  timestamp: string;
  statusCode: number;
  code: string;
  message: string;
  details: ApiErrorDetail[];
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  user: {
    id: string;
    email: string;
    systemRole: SystemRole;
    employeeId: string | null;
  };
}

export interface CurrentUser {
  id: string;
  email: string;
  systemRole: SystemRole;
  employeeId: string | null;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export interface CreateManagerRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface CreateEmployeeAccountRequest {
  email: string;
  password: string;
  employeeId: string;
}

export interface UserAccount {
  id: string;
  email: string;
  systemRole: SystemRole;
  employeeId?: string;
  active: boolean;
}

// ─── Employees ───────────────────────────────────────────────────────────────

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employmentType: EmploymentType;
  employeeRole: EmployeeRole;
  weeklyHourLimit: number;
}

export interface UpdateEmployeeRequest {
  firstName: string;
  lastName: string;
  phone: string;
  employmentType: EmploymentType;
  employeeRole: EmployeeRole;
  weeklyHourLimit: number;
  active: boolean;
}

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employmentType: EmploymentType;
  employeeRole: EmployeeRole;
  weeklyHourLimit: number;
  active: boolean;
}

export interface ListEmployeesParams {
  active?: boolean;
  employmentType?: EmploymentType;
  employeeRole?: EmployeeRole;
}

// ─── Availability ─────────────────────────────────────────────────────────────

export interface AvailabilityEntry {
  date: string;         // ISO date "2026-04-06"
  startTime: string;    // "09:00"
  endTime: string;      // "17:00"
  available: boolean;
  preferred: boolean;
}

export interface SubmitAvailabilityRequest {
  employeeId: string;
  weekStartDate: string;
  entries: AvailabilityEntry[];
}

export interface AvailabilityResponse {
  id: string;
  employeeId: string;
  weekStartDate: string;
  status: AvailabilityStatus;
  entries: AvailabilityEntry[];
}

// ─── Shifts ───────────────────────────────────────────────────────────────────

export interface CreateShiftRequest {
  date: string;
  startTime: string;
  endTime: string;
  employeeRole: EmployeeRole;
  requiredCount: number;
}

export interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  employeeRole: EmployeeRole;
  requiredCount: number;
}

// ─── Schedules ────────────────────────────────────────────────────────────────

export interface Assignment {
  assignmentId: string;
  shiftId: string;
  employeeId: string;
  employeeName: string;
  date: string;
  startTime: string;
  endTime: string;
  employeeRole: EmployeeRole;
}

export interface Schedule {
  id: string;
  weekStartDate: string;
  status: ScheduleStatus;
  assignments: Assignment[];
}

export interface AddAssignmentRequest {
  shiftId: string;
  employeeId: string;
}

export interface ReplaceAssignmentRequest {
  employeeId: string;
}

export interface RejectScheduleRequest {
  reason: string;
}

export interface MyRoleScheduleResponse {
  weekStartDate: string;
  employeeRole: EmployeeRole;
  status: 'PUBLISHED';
  assignments: Assignment[];
}
