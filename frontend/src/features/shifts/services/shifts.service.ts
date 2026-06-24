import { apiClient } from '../../../shared/lib/apiClient';
import type { Shift, CreateShiftRequest } from '../../../shared/types/api.types';

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const MOCK_SHIFTS: Shift[] = [
  { id: 'shift-1', date: '2026-06-09', startTime: '09:00', endTime: '17:00', employeeRole: 'WAITER',    requiredCount: 2 },
  { id: 'shift-2', date: '2026-06-09', startTime: '14:00', endTime: '22:00', employeeRole: 'WAITER',    requiredCount: 1 },
  { id: 'shift-3', date: '2026-06-09', startTime: '09:00', endTime: '17:00', employeeRole: 'RUNNER',    requiredCount: 1 },
  { id: 'shift-4', date: '2026-06-10', startTime: '09:00', endTime: '17:00', employeeRole: 'WAITER',    requiredCount: 1 },
  { id: 'shift-5', date: '2026-06-10', startTime: '11:00', endTime: '19:00', employeeRole: 'RUNNER',    requiredCount: 1 },
  { id: 'shift-6', date: '2026-06-16', startTime: '11:00', endTime: '19:00', employeeRole: 'BARTENDER', requiredCount: 1 },
];

// ─── SHIFTS SERVICE ───────────────────────────────────────────────────────────

export async function listShifts(from: string, to: string): Promise<Shift[]> {
  // MOCK — replace with:
  // return apiClient.get<Shift[]>(`/shifts?from=${from}&to=${to}`);
  return MOCK_SHIFTS.filter(s => s.date >= from && s.date <= to);
}

export async function createShift(data: CreateShiftRequest): Promise<Shift> {
  // MOCK — replace with:
  // return apiClient.post<Shift>('/shifts', data);
  const shift: Shift = { id: `shift-${Date.now()}`, ...data };
  MOCK_SHIFTS.push(shift);
  return shift;
}

export async function updateShift(shiftId: string, data: CreateShiftRequest): Promise<Shift> {
  // MOCK — replace with:
  // return apiClient.put<Shift>(`/shifts/${shiftId}`, data);
  const idx = MOCK_SHIFTS.findIndex(s => s.id === shiftId);
  if (idx === -1) throw { statusCode: 404, code: 'SHIFT_NOT_FOUND', message: 'Shift not found.' };
  MOCK_SHIFTS[idx] = { ...MOCK_SHIFTS[idx], ...data };
  return MOCK_SHIFTS[idx];
}

export async function deleteShift(shiftId: string): Promise<void> {
  // MOCK — replace with:
  // return apiClient.delete<void>(`/shifts/${shiftId}`);
  const idx = MOCK_SHIFTS.findIndex(s => s.id === shiftId);
  if (idx !== -1) MOCK_SHIFTS.splice(idx, 1);
}
