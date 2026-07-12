import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import { StatusBar } from '../../../shared/components/StatusBar';
import { BottomNav } from '../../../shared/components/BottomNav';
import { Spinner } from '../../../shared/components/Spinner';
import { getMyNotifications, markNotificationAsRead } from '../services/notifications.service';
import type { Notification } from '../../../shared/types/api.types';
import styles from './AlertsPage.module.css';

interface AlertsPageProps {
  role: 'manager' | 'employee';
}

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

export function AlertsPage({ role }: AlertsPageProps) {
  const queryClient = useQueryClient();
  const {
    data: notifications = [],
    isLoading: loading,
    isError,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: getMyNotifications,
  });
  const loadError = isError ? 'Failed to load alerts. Try again.' : null;

  async function handleOpen(notification: Notification) {
    if (notification.read || notification.id.startsWith('availability-reminder-')) return;
    queryClient.setQueryData<Notification[]>(['notifications'], (prev) =>
      prev?.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
    );
    try {
      await markNotificationAsRead(notification.id);
    } catch {
      // best-effort; local cache already reflects read
    }
  }

  return (
    <PhoneShell>
      <StatusBar />
      <div className={styles.page}>

        <div className={styles.header}>
          <h1 className={styles.title}>Alerts</h1>
          <p className={styles.subtitle}>Reminders and updates for you</p>
        </div>

        <div className={styles.list}>
          {loading ? (
            <Spinner size="medium" />
          ) : loadError ? (
            <p className={styles.empty}>{loadError}</p>
          ) : notifications.length === 0 ? (
            <p className={styles.empty}>No alerts right now.</p>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={[styles.card, !notification.read ? styles.cardUnread : ''].join(' ')}
                onClick={() => handleOpen(notification)}
              >
                <span className={!notification.read ? styles.dot : styles.dotSpacer} />
                <div className={styles.cardBody}>
                  <div className={styles.cardMessage}>{notification.message}</div>
                  <div className={styles.cardMeta}>{formatRelativeTime(notification.createdAt)}</div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
      <BottomNav role={role} />
    </PhoneShell>
  );
}
