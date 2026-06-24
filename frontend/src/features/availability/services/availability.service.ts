import { apiClient } from '../../../shared/lib/apiClient';
import type {
  SubmitAvailabilityRequest,
  AvailabilityResponse,
} from '../../../shared/types/api.types';

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

const MOCK_AVAILABILITY: AvailabilityResponse[] = [];

// ─── AVAILABILITY SERVICE ─────────────────────────────────────────────────────

export async function submitAvailability(data: SubmitAvailabilityRequest): Promise<AvailabilityResponse> {
  // MOCK — replace with:
  // return apiClient.post<AvailabilityResponse>('/availability', data);
  const existing = MOCK_AVAILABILITY.find(
    a => a.employeeId === data.employeeId && a.weekStartDate === data.weekStartDate,
  );
  if (existing) throw { statusCode: 409, code: 'AVAILABILITY_ALREADY_SUBMITTED', message: 'Already submitted.' };
  const record: AvailabilityResponse = { id: `avail-${Date.now()}`, ...data, status: 'SUBMITTED' };
  MOCK_AVAILABILITY.push(record);
  return record;
}

export async function updateAvailability(
  availabilityId: string,
  data: SubmitAvailabilityRequest,
): Promise<AvailabilityResponse> {
  // MOCK — replace with:
  // return apiClient.put<AvailabilityResponse>(`/availability/${availabilityId}`, data);
  const idx = MOCK_AVAILABILITY.findIndex(a => a.id === availabilityId);
  if (idx === -1) throw { statusCode: 404, code: 'NOT_FOUND', message: 'Availability record not found.' };
  MOCK_AVAILABILITY[idx] = { ...MOCK_AVAILABILITY[idx], ...data, status: 'UPDATED' };
  return MOCK_AVAILABILITY[idx];
}

export async function getEmployeeAvailability(
  employeeId: string,
  weekStartDate: string,
): Promise<AvailabilityResponse | null> {
  // MOCK — replace with:
  // return apiClient.get<AvailabilityResponse>(`/employees/${employeeId}/availability?weekStartDate=${weekStartDate}`);
  return MOCK_AVAILABILITY.find(
    a => a.employeeId === employeeId && a.weekStartDate === weekStartDate,
  ) ?? null;
}

export async function getWeeklyAvailability(weekStartDate: string): Promise<AvailabilityResponse[]> {
  // MOCK — replace with:
  // return apiClient.get<AvailabilityResponse[]>(`/availability?weekStartDate=${weekStartDate}`);
  return MOCK_AVAILABILITY.filter(a => a.weekStartDate === weekStartDate);
}
