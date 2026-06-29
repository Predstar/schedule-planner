import { apiClient } from '../../../shared/lib/apiClient';
import type {
  SubmitAvailabilityRequest,
  AvailabilityResponse,
} from '../../../shared/types/api.types';

export async function submitAvailability(data: SubmitAvailabilityRequest): Promise<AvailabilityResponse> {
  return apiClient.post<AvailabilityResponse>('/availability', data);
}

export async function updateAvailability(
  availabilityId: string,
  data: SubmitAvailabilityRequest,
): Promise<AvailabilityResponse> {
  return apiClient.put<AvailabilityResponse>(`/availability/${availabilityId}`, data);
}

export async function getEmployeeAvailability(
  employeeId: string,
  weekStartDate: string,
): Promise<AvailabilityResponse | null> {
  try {
    return await apiClient.get<AvailabilityResponse>(
      `/availability/${employeeId}?weekStartDate=${weekStartDate}`,
    );
  } catch (e: unknown) {
    const err = e as { statusCode?: number; code?: string };
    if (err?.statusCode === 404 || err?.code === 'AVAILABILITY_NOT_FOUND') return null;
    throw e;
  }
}

export async function getWeeklyAvailability(weekStartDate: string): Promise<AvailabilityResponse[]> {
  return apiClient.get<AvailabilityResponse[]>(`/availability?weekStartDate=${weekStartDate}`);
}
