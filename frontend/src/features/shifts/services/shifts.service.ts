import { apiClient } from '../../../shared/lib/apiClient';
import type { Shift, CreateShiftRequest } from '../../../shared/types/api.types';

export async function listShifts(from: string, to: string): Promise<Shift[]> {
  return apiClient.get<Shift[]>(`/shifts?from=${from}&to=${to}`);
}

export async function createShift(data: CreateShiftRequest): Promise<Shift> {
  return apiClient.post<Shift>('/shifts', data);
}

export async function updateShift(shiftId: string, data: CreateShiftRequest): Promise<Shift> {
  return apiClient.put<Shift>(`/shifts/${shiftId}`, data);
}

export async function deleteShift(shiftId: string): Promise<void> {
  return apiClient.delete<void>(`/shifts/${shiftId}`);
}
