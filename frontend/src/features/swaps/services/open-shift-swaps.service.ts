import { apiClient } from '../../../shared/lib/apiClient';
import type { OpenShiftPost, CreateOpenShiftPostBody } from '../../../shared/types/api.types';

export async function createOpenShiftPost(data: CreateOpenShiftPostBody): Promise<OpenShiftPost> {
  return apiClient.post<OpenShiftPost>('/open-shift-swaps', data);
}

export async function getOpenShiftPosts(): Promise<OpenShiftPost[]> {
  return apiClient.get<OpenShiftPost[]>('/open-shift-swaps/open');
}

export async function getMyOpenShiftPosts(): Promise<OpenShiftPost[]> {
  return apiClient.get<OpenShiftPost[]>('/open-shift-swaps/my');
}

export async function claimOpenShiftPost(postId: string): Promise<OpenShiftPost> {
  return apiClient.patch<OpenShiftPost>(`/open-shift-swaps/${postId}/claim`);
}

export async function cancelOpenShiftPost(postId: string): Promise<OpenShiftPost> {
  return apiClient.patch<OpenShiftPost>(`/open-shift-swaps/${postId}/cancel`);
}

// Manager-facing
export async function listOpenShiftSwapsForManager(): Promise<OpenShiftPost[]> {
  return apiClient.get<OpenShiftPost[]>('/open-shift-swaps');
}

export async function approveShiftClaim(postId: string, claimId: string): Promise<OpenShiftPost> {
  return apiClient.patch<OpenShiftPost>(`/open-shift-swaps/${postId}/claims/${claimId}/approve`);
}

export async function rejectShiftClaim(postId: string, claimId: string): Promise<OpenShiftPost> {
  return apiClient.patch<OpenShiftPost>(`/open-shift-swaps/${postId}/claims/${claimId}/reject`);
}
