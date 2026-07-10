import { useEffect, useMemo, useState } from 'react';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import { StatusBar } from '../../../shared/components/StatusBar';
import { BottomNav } from '../../../shared/components/BottomNav';
import { getStoredUser } from '../../auth/services/auth.service';
import { getEmployee, listEmployees } from '../../employees/services/employees.service';
import { getMyRoleSchedule } from '../../schedules/services/schedules.service';
import {
  acceptSwapRequest,
  createSwapRequest,
  declineSwapRequest,
  getMySwapRequests,
} from '../services/swaps.service';
import type { Assignment, Employee, SwapRequest, SwapRequestStatus } from '../../../shared/types/api.types';
import styles from './EmployeeSwapsPage.module.css';

const STATUS_LABEL: Record<SwapRequestStatus, string> = {
  PENDING:  'Pending',
  ACCEPTED: 'Accepted — Awaiting Manager',
  REJECTED: 'Rejected',
  APPROVED: 'Approved',
};

const STATUS_STYLE: Record<SwapRequestStatus, { bg: string; color: string }> = {
  PENDING:  { bg: '#FFF8E1', color: '#B45309' },
  ACCEPTED: { bg: '#EEF2FF', color: '#4338CA' },
  REJECTED: { bg: '#FEE2E2', color: '#B91C1C' },
  APPROVED: { bg: '#DCFCE7', color: '#166534' },
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

function formatShiftLabel(a: Assignment): string {
  const d = new Date(`${a.date}T00:00:00`);
  const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${label} · ${a.startTime}–${a.endTime}`;
}

export function EmployeeSwapsPage() {
  const storedUser = getStoredUser();
  const myEmployeeId = storedUser?.employeeId ?? null;

  const [colleagues, setColleagues] = useState<Employee[]>([]);
  const [myShifts, setMyShifts] = useState<Assignment[]>([]);
  const [swaps, setSwaps] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [targetEmployeeId, setTargetEmployeeId] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [actingSwapId, setActingSwapId] = useState<string | null>(null);

  async function loadAll() {
    if (!myEmployeeId) return;
    setLoading(true);
    setLoadError(null);
    try {
      const me = await getEmployee(myEmployeeId);

      const monday = toIso(getMondayOf(new Date()));
      const [allEmployees, roleSchedule, mySwaps] = await Promise.all([
        listEmployees({ active: true, employeeRole: me.employeeRole }),
        getMyRoleSchedule(monday).catch(() => null),
        getMySwapRequests(),
      ]);

      setColleagues(allEmployees.filter((e) => e.id !== myEmployeeId));
      const mine = (roleSchedule?.assignments ?? []).filter((a) => a.employeeId === myEmployeeId);
      setMyShifts(mine);
      setSwaps(mySwaps);
    } catch {
      setLoadError('Failed to load swap requests. Try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myEmployeeId]);

  const canSubmit = Boolean(targetEmployeeId) && Boolean(selectedAssignmentId) && reason.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await createSwapRequest({
        targetEmployeeId,
        requestingShiftId: selectedAssignmentId,
        reason: reason.trim(),
      });
      setShowModal(false);
      setTargetEmployeeId('');
      setSelectedAssignmentId('');
      setReason('');
      await loadAll();
    } catch (e: unknown) {
      setSubmitError((e as { message?: string })?.message ?? 'Failed to submit swap request.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAccept(swapId: string) {
    setActingSwapId(swapId);
    try {
      await acceptSwapRequest(swapId);
      await loadAll();
    } finally {
      setActingSwapId(null);
    }
  }

  async function handleDecline(swapId: string) {
    setActingSwapId(swapId);
    try {
      await declineSwapRequest(swapId);
      await loadAll();
    } finally {
      setActingSwapId(null);
    }
  }

  const sortedSwaps = useMemo(
    () => [...swaps].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [swaps],
  );

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

        {/* My Requests */}
        <div className={styles.section}>
          <p className={styles.sectionLabel}>MY REQUESTS</p>
          <div className={styles.list}>
            {loading ? (
              <p className={styles.empty}>Loading…</p>
            ) : loadError ? (
              <p className={styles.empty}>{loadError}</p>
            ) : sortedSwaps.length === 0 ? (
              <p className={styles.empty}>No swap requests yet.</p>
            ) : (
              sortedSwaps.map((swap) => {
                const st = STATUS_STYLE[swap.status];
                const isTargetOfPending = swap.status === 'PENDING' && swap.targetEmployeeId === myEmployeeId;
                const otherPartyName = swap.requestingEmployeeId === myEmployeeId
                  ? swap.targetEmployeeName
                  : swap.requestingEmployeeName;
                return (
                  <div key={swap.id} className={styles.card}>
                    <div className={styles.cardTop}>
                      <span className={styles.cardTitle}>Swap with {otherPartyName}</span>
                      <span className={styles.statusBadge} style={{ background: st.bg, color: st.color }}>
                        {STATUS_LABEL[swap.status]}
                      </span>
                    </div>
                    <div className={styles.cardMeta}>
                      {new Date(`${swap.requestingShiftDate}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' · '}{swap.requestingShiftStart}–{swap.requestingShiftEnd}
                    </div>
                    <div className={styles.cardReason}>"{swap.reason}"</div>
                    {isTargetOfPending && (
                      <div className={styles.cardActions}>
                        <button
                          className={styles.acceptBtn}
                          onClick={() => handleAccept(swap.id)}
                          disabled={actingSwapId === swap.id}
                        >
                          {actingSwapId === swap.id ? '…' : 'Accept'}
                        </button>
                        <button
                          className={styles.declineBtn}
                          onClick={() => handleDecline(swap.id)}
                          disabled={actingSwapId === swap.id}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* New Request Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>New Swap Request</h2>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Swap with</label>
              <select
                className={styles.select}
                value={targetEmployeeId}
                onChange={(e) => setTargetEmployeeId(e.target.value)}
              >
                <option value="">Select a colleague…</option>
                {colleagues.map((c) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                ))}
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Your shift</label>
              <select
                className={styles.select}
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
              >
                <option value="">Select a shift…</option>
                {myShifts.map((a) => (
                  <option key={a.assignmentId} value={a.assignmentId}>{formatShiftLabel(a)}</option>
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
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav role="employee" />
    </PhoneShell>
  );
}
