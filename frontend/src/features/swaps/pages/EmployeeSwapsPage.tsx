import { useMemo, useState } from 'react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import { StatusBar } from '../../../shared/components/StatusBar';
import { BottomNav } from '../../../shared/components/BottomNav';
import { Spinner } from '../../../shared/components/Spinner';
import { getStoredUser } from '../../auth/services/auth.service';
import { getMyRoleSchedule } from '../../schedules/services/schedules.service';
import {
  cancelOpenShiftPost,
  claimOpenShiftPost,
  createOpenShiftPost,
  getMyOpenShiftPosts,
  getOpenShiftPosts,
} from '../services/open-shift-swaps.service';
import type { Assignment, OpenShiftPost, OpenShiftPostStatus } from '../../../shared/types/api.types';
import styles from './EmployeeSwapsPage.module.css';

const STATUS_LABEL: Record<OpenShiftPostStatus, string> = {
  OPEN: 'Open',
  CLAIMED: 'Claimed — Awaiting Manager',
  APPROVED: 'Approved',
  CANCELLED: 'Cancelled',
};

const STATUS_STYLE: Record<OpenShiftPostStatus, { bg: string; color: string }> = {
  OPEN:      { bg: '#FFF8E1', color: '#B45309' },
  CLAIMED:   { bg: '#EEF2FF', color: '#4338CA' },
  APPROVED:  { bg: '#DCFCE7', color: '#166534' },
  CANCELLED: { bg: '#FEE2E2', color: '#B91C1C' },
};

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatShiftLabel(dateIso: string, start: string, end: string): string {
  const d = new Date(`${dateIso}T00:00:00`);
  const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${label} · ${start}–${end}`;
}

export function EmployeeSwapsPage() {
  const storedUser = getStoredUser();
  const myEmployeeId = storedUser?.employeeId ?? null;
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'mine' | 'open'>('mine');

  const [showModal, setShowModal] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [actingPostId, setActingPostId] = useState<string | null>(null);

  const mondays = useMemo(() => {
    const firstMonday = getMondayOf(new Date());
    return Array.from({ length: 8 }, (_, i) => {
      const d = new Date(firstMonday);
      d.setDate(d.getDate() + i * 7);
      return toIso(d);
    });
  }, []);

  const shiftQueries = useQueries({
    queries: mondays.map((monday) => ({
      queryKey: ['my-role-schedule', monday],
      queryFn: () => getMyRoleSchedule(monday),
      enabled: Boolean(myEmployeeId),
      // A 404 here just means no schedule has been published for that week
      // yet — expected for most of the 8 weeks we probe, not a real error.
      retry: (failureCount: number, err: unknown) =>
        (err as { statusCode?: number })?.statusCode !== 404 && failureCount < 1,
    })),
  });

  const myPostsQuery = useQuery({
    queryKey: ['my-open-shift-posts'],
    queryFn: getMyOpenShiftPosts,
    enabled: Boolean(myEmployeeId),
  });

  const openPostsQuery = useQuery({
    queryKey: ['open-shift-posts'],
    queryFn: getOpenShiftPosts,
    enabled: Boolean(myEmployeeId),
  });

  const shiftsFailed = shiftQueries.some(
    q => q.isError && (q.error as { statusCode?: number })?.statusCode !== 404,
  );
  const loading = shiftQueries.some(q => q.isLoading) || myPostsQuery.isLoading || openPostsQuery.isLoading;
  const myRequestsError = shiftsFailed || myPostsQuery.isError
    ? 'Failed to load your requests. Try again.'
    : null;
  const openShiftsError = openPostsQuery.isError
    ? 'Failed to load open shifts. Try again.'
    : null;

  const myShifts = useMemo(() => {
    const today = toIso(new Date());
    const byId = new Map<string, Assignment>();
    for (const q of shiftQueries) {
      for (const a of q.data?.assignments ?? []) {
        if (a.employeeId === myEmployeeId && a.date >= today) {
          byId.set(a.assignmentId, a);
        }
      }
    }
    return Array.from(byId.values()).sort((a, b) => a.date.localeCompare(b.date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shiftQueries.map(q => q.dataUpdatedAt).join(','), myEmployeeId]);

  const myPosts = myPostsQuery.data ?? [];
  const openPosts = openPostsQuery.data ?? [];

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['my-open-shift-posts'] });
    queryClient.invalidateQueries({ queryKey: ['open-shift-posts'] });
  }

  const canSubmit = Boolean(selectedAssignmentId) && reason.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createOpenShiftPost({
        assignmentId: selectedAssignmentId,
        reason: reason.trim(),
      });
      setShowModal(false);
      setSelectedAssignmentId('');
      setReason('');
      invalidateAll();
    } catch (e: unknown) {
      setSubmitError((e as { message?: string })?.message ?? 'Failed to post shift as open.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleClaim(postId: string) {
    setActingPostId(postId);
    try {
      await claimOpenShiftPost(postId);
      invalidateAll();
    } finally {
      setActingPostId(null);
    }
  }

  async function handleCancel(postId: string) {
    setActingPostId(postId);
    try {
      await cancelOpenShiftPost(postId);
      invalidateAll();
    } finally {
      setActingPostId(null);
    }
  }

  return (
    <PhoneShell>
      <StatusBar />
      <div className={styles.page}>

        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Shift Swaps</h1>
          <button
            className={styles.newBtn}
            onClick={() => setShowModal(true)}
            disabled={!myEmployeeId || myShifts.length === 0}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Request
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setTab('mine')}
            style={{
              flex: 1, padding: '8px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              fontFamily: 'Inter, sans-serif', cursor: 'pointer',
              border: tab === 'mine' ? 'none' : '1.5px solid #E8DDD0',
              background: tab === 'mine' ? '#C2742A' : 'none',
              color: tab === 'mine' ? '#FFFFFF' : '#8C7B6B',
            }}
          >
            My Requests
          </button>
          <button
            onClick={() => setTab('open')}
            style={{
              flex: 1, padding: '8px', borderRadius: 10, fontSize: 13, fontWeight: 600,
              fontFamily: 'Inter, sans-serif', cursor: 'pointer',
              border: tab === 'open' ? 'none' : '1.5px solid #E8DDD0',
              background: tab === 'open' ? '#C2742A' : 'none',
              color: tab === 'open' ? '#FFFFFF' : '#8C7B6B',
            }}
          >
            Open Shifts {openPosts.length > 0 ? `(${openPosts.length})` : ''}
          </button>
        </div>

        {tab === 'mine' ? (
          <div className={styles.section}>
            <p className={styles.sectionLabel}>MY REQUESTS</p>
            <div className={styles.list}>
              {loading ? (
                <Spinner size="medium" />
              ) : myRequestsError ? (
                <p className={styles.empty}>{myRequestsError}</p>
              ) : myPosts.length === 0 ? (
                <p className={styles.empty}>No swap requests yet.</p>
              ) : (
                myPosts.map((post) => {
                  const st = STATUS_STYLE[post.status];
                  const isMine = post.postedByEmployeeId === myEmployeeId;
                  return (
                    <div key={post.id} className={styles.card}>
                      <div className={styles.cardTop}>
                        <span className={styles.cardTitle}>
                          {isMine ? 'Your posted shift' : `Claimed from ${post.postedByEmployeeName}`}
                        </span>
                        <span className={styles.statusBadge} style={{ background: st.bg, color: st.color }}>
                          {STATUS_LABEL[post.status]}
                        </span>
                      </div>
                      <div className={styles.cardMeta}>
                        {formatShiftLabel(post.shiftDate, post.shiftStartTime, post.shiftEndTime)}
                      </div>
                      <div className={styles.cardReason}>"{post.reason}"</div>
                      {post.claims.length > 0 && (
                        <div className={styles.cardMeta}>
                          {post.claims.length} claim{post.claims.length > 1 ? 's' : ''} pending manager review
                        </div>
                      )}
                      {isMine && post.status === 'OPEN' && (
                        <div className={styles.cardActions}>
                          <button
                            className={styles.declineBtn}
                            onClick={() => handleCancel(post.id)}
                            disabled={actingPostId === post.id}
                          >
                            {actingPostId === post.id ? <Spinner size="small" inline /> : 'Cancel'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ) : (
          <div className={styles.section}>
            <p className={styles.sectionLabel}>OPEN SHIFTS — CLAIM ONE</p>
            <div className={styles.list}>
              {loading ? (
                <Spinner size="medium" />
              ) : openShiftsError ? (
                <p className={styles.empty}>{openShiftsError}</p>
              ) : openPosts.length === 0 ? (
                <p className={styles.empty}>No open shifts available right now.</p>
              ) : (
                openPosts.map((post) => (
                  <div key={post.id} className={styles.card}>
                    <div className={styles.cardTop}>
                      <span className={styles.cardTitle}>{post.postedByEmployeeName}'s shift</span>
                      <span className={styles.statusBadge} style={{ background: STATUS_STYLE.OPEN.bg, color: STATUS_STYLE.OPEN.color }}>
                        {post.employeeRole.toLowerCase()}
                      </span>
                    </div>
                    <div className={styles.cardMeta}>
                      {formatShiftLabel(post.shiftDate, post.shiftStartTime, post.shiftEndTime)}
                    </div>
                    <div className={styles.cardReason}>"{post.reason}"</div>
                    <div className={styles.cardActions}>
                      <button
                        className={styles.acceptBtn}
                        onClick={() => handleClaim(post.id)}
                        disabled={actingPostId === post.id}
                      >
                        {actingPostId === post.id ? <Spinner size="small" inline onAccent /> : 'Claim this shift'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* New Request Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Post Shift as Open</h2>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Your shift</label>
              <select
                className={styles.select}
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
              >
                <option value="">Select a shift…</option>
                {myShifts.map((a) => (
                  <option key={a.assignmentId} value={a.assignmentId}>
                    {formatShiftLabel(a.date, a.startTime, a.endTime)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Reason</label>
              <textarea
                className={styles.textarea}
                rows={3}
                placeholder="Briefly explain why…"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>

            {submitError && <div className={styles.formError}>{submitError}</div>}

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
              <button
                className={styles.submitBtn}
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
              >
                {submitting ? <Spinner size="small" inline onAccent /> : 'Post as Open'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav role="employee" />
    </PhoneShell>
  );
}
