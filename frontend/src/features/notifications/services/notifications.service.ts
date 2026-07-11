import { apiClient } from '../../../shared/lib/apiClient';
import type { Notification } from '../../../shared/types/api.types';

export async function getMyNotifications(): Promise<Notification[]> {
  return apiClient.get<Notification[]>('/notifications');
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  return apiClient.patch<void>(`/notifications/${notificationId}/read`);
}
