import { apiClient } from '../../../shared/lib/apiClient';
import type {
  Schedule,
  AddAssignmentRequest,
  ReplaceAssignmentRequest,
  RejectScheduleRequest,
  MyRoleScheduleResponse,
} from '../../../shared/types/api.types';

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const MOCK_SCHEDULES: Schedule[] = [
  {
    id: 'sched-1',
    weekStartDate: '2026-06-09',
    status: 'PUBLISHED',
    assignments: [
      { assignmentId: 'asgn-1', shiftId: 'shift-1', employeeId: 'emp-1', employeeName: 'James Wright',  date: '2026-06-09', startTime: '09:00', endTime: '17:00', employeeRole: 'WAITER' },
      { assignmentId: 'asgn-2', shiftId: 'shift-2', employeeId: 'emp-2', employeeName: 'Maria Lopez',   date: '2026-06-09', startTime: '14:00', endTime: '22:00', employeeRole: 'WAITER' },
      { assignmentId: 'asgn-3', shiftId: 'shift-3', employeeId: 'emp-3', employeeName: 'Tom Baker',     date: '2026-06-09', startTime: '09:00', endTime: '17:00', employeeRole: 'RUNNER' },
    ],
  },
];

// ─── SCHEDULES SERVICE ────────────────────────────────────────────────────────

export async function getWeeklySchedule(weekStartDate: string): Promise<Schedule | null> {
  // MOCK — replace with:
  // return apiClient.get<Schedule>(`/schedules?weekStartDate=${weekStartDate}`);
  return MOCK_SCHEDULES.find(s => s.weekStartDate === weekStartDate) ?? null;
}

export async function createDraftSchedule(weekStartDate: string): Promise<Schedule> {
  // MOCK — replace with:
  // return apiClient.post<Schedule>('/schedules', { weekStartDate });
  const schedule: Schedule = { id: `sched-${Date.now()}`, weekStartDate, status: 'DRAFT', assignments: [] };
  MOCK_SCHEDULES.push(schedule);
  return schedule;
}

export async function addAssignment(scheduleId: string, data: AddAssignmentRequest): Promise<Schedule> {
  // MOCK — replace with:
  // return apiClient.post<Schedule>(`/schedules/${scheduleId}/assignments`, data);
  const sched = MOCK_SCHEDULES.find(s => s.id === scheduleId);
  if (!sched) throw { statusCode: 404, code: 'SCHEDULE_NOT_FOUND', message: 'Schedule not found.' };
  return sched;
}

export async function removeAssignment(scheduleId: string, assignmentId: string): Promise<void> {
  // MOCK — replace with:
  // return apiClient.delete<void>(`/schedules/${scheduleId}/assignments/${assignmentId}`);
  const sched = MOCK_SCHEDULES.find(s => s.id === scheduleId);
  if (!sched) return;
  sched.assignments = sched.assignments.filter(a => a.assignmentId !== assignmentId);
}

export async function replaceAssignment(
  scheduleId: string,
  assignmentId: string,
  data: ReplaceAssignmentRequest,
): Promise<Schedule> {
  // MOCK — replace with:
  // return apiClient.put<Schedule>(`/schedules/${scheduleId}/assignments/${assignmentId}`, data);
  const sched = MOCK_SCHEDULES.find(s => s.id === scheduleId);
  if (!sched) throw { statusCode: 404, code: 'SCHEDULE_NOT_FOUND', message: 'Schedule not found.' };
  return sched;
}

export async function approveSchedule(scheduleId: string): Promise<Schedule> {
  // MOCK — replace with:
  // return apiClient.patch<Schedule>(`/schedules/${scheduleId}/approve`);
  const sched = MOCK_SCHEDULES.find(s => s.id === scheduleId);
  if (!sched) throw { statusCode: 404, code: 'SCHEDULE_NOT_FOUND', message: 'Schedule not found.' };
  sched.status = 'APPROVED';
  return sched;
}

export async function rejectSchedule(scheduleId: string, data: RejectScheduleRequest): Promise<Schedule> {
  // MOCK — replace with:
  // return apiClient.patch<Schedule>(`/schedules/${scheduleId}/reject`, data);
  const sched = MOCK_SCHEDULES.find(s => s.id === scheduleId);
  if (!sched) throw { statusCode: 404, code: 'SCHEDULE_NOT_FOUND', message: 'Schedule not found.' };
  sched.status = 'REJECTED';
  return sched;
}

export async function publishSchedule(scheduleId: string): Promise<Schedule> {
  // MOCK — replace with:
  // return apiClient.patch<Schedule>(`/schedules/${scheduleId}/publish`);
  const sched = MOCK_SCHEDULES.find(s => s.id === scheduleId);
  if (!sched) throw { statusCode: 404, code: 'SCHEDULE_NOT_FOUND', message: 'Schedule not found.' };
  sched.status = 'PUBLISHED';
  return sched;
}

export async function getMyRoleSchedule(weekStartDate: string): Promise<MyRoleScheduleResponse> {
  // MOCK — replace with:
  // return apiClient.get<MyRoleScheduleResponse>(`/schedules/my-role?weekStartDate=${weekStartDate}`);
  const sched = MOCK_SCHEDULES.find(s => s.weekStartDate === weekStartDate && s.status === 'PUBLISHED');
  if (!sched) throw { statusCode: 404, code: 'SCHEDULE_NOT_FOUND', message: 'No published schedule found.' };
  return {
    weekStartDate: sched.weekStartDate,
    employeeRole: 'WAITER',
    status: 'PUBLISHED',
    assignments: sched.assignments.filter(a => a.employeeRole === 'WAITER'),
  };
}
