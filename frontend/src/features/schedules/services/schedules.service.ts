import { apiClient } from '../../../shared/lib/apiClient';
import type {
  Schedule,
  AddAssignmentRequest,
  ReplaceAssignmentRequest,
  RejectScheduleRequest,
  MyRoleScheduleResponse,
} from '../../../shared/types/api.types';

export async function getWeeklySchedule(weekStartDate: string): Promise<Schedule | null> {
  try {
    return await apiClient.get<Schedule>(`/schedules?weekStartDate=${weekStartDate}`);
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === 'SCHEDULE_NOT_FOUND') return null;
    throw e;
  }
}

export async function createDraftSchedule(weekStartDate: string): Promise<Schedule> {
  return apiClient.post<Schedule>('/schedules', { weekStartDate });
}

export async function addAssignment(scheduleId: string, data: AddAssignmentRequest): Promise<Schedule> {
  return apiClient.post<Schedule>(`/schedules/${scheduleId}/assignments`, data);
}

export async function removeAssignment(scheduleId: string, assignmentId: string): Promise<void> {
  return apiClient.delete<void>(`/schedules/${scheduleId}/assignments/${assignmentId}`);
}

export async function replaceAssignment(
  scheduleId: string,
  assignmentId: string,
  data: ReplaceAssignmentRequest,
): Promise<Schedule> {
  return apiClient.put<Schedule>(`/schedules/${scheduleId}/assignments/${assignmentId}`, data);
}

export async function approveSchedule(scheduleId: string): Promise<Schedule> {
  return apiClient.patch<Schedule>(`/schedules/${scheduleId}/approve`);
}

export async function rejectSchedule(scheduleId: string, data: RejectScheduleRequest): Promise<Schedule> {
  return apiClient.patch<Schedule>(`/schedules/${scheduleId}/reject`, data);
}

export async function publishSchedule(scheduleId: string): Promise<Schedule> {
  return apiClient.patch<Schedule>(`/schedules/${scheduleId}/publish`);
}

export async function getMyRoleSchedule(weekStartDate: string): Promise<MyRoleScheduleResponse> {
  return apiClient.get<MyRoleScheduleResponse>(`/schedules/my-role?weekStartDate=${weekStartDate}`);
}

export async function autoGenerateSchedule(weekStartDate: string): Promise<Schedule> {
  return apiClient.post<Schedule>('/schedules/auto-generate', { weekStartDate });
}
