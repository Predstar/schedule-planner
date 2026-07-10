import { apiClient } from '../../../shared/lib/apiClient';
import type { SwapRequest, CreateSwapRequestBody } from '../../../shared/types/api.types';

export async function getMySwapRequests(): Promise<SwapRequest[]> {
  return apiClient.get<SwapRequest[]>('/swaps/my');
}

// Requests accepted by the target employee and awaiting manager approval.
export async function getPendingSwapRequests(): Promise<SwapRequest[]> {
  return apiClient.get<SwapRequest[]>('/swaps?status=ACCEPTED');
}

export async function createSwapRequest(data: CreateSwapRequestBody): Promise<SwapRequest> {
  return apiClient.post<SwapRequest>('/swaps', data);
}

// Target employee accepts/declines being swapped in.
export async function acceptSwapRequest(swapId: string): Promise<SwapRequest> {
  return apiClient.patch<SwapRequest>(`/swaps/${swapId}/accept`);
}

export async function declineSwapRequest(swapId: string): Promise<SwapRequest> {
  return apiClient.patch<SwapRequest>(`/swaps/${swapId}/decline`);
}

// Manager gives final approval/rejection once the target has accepted.
export async function approveSwapRequest(swapId: string): Promise<SwapRequest> {
  return apiClient.patch<SwapRequest>(`/swaps/${swapId}/approve`);
}

export async function rejectSwapRequest(swapId: string): Promise<SwapRequest> {
  return apiClient.patch<SwapRequest>(`/swaps/${swapId}/reject`);
}
