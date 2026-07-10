import { useEffect, useState } from 'react';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import { StatusBar } from '../../../shared/components/StatusBar';
import { BottomNav } from '../../../shared/components/BottomNav';
import { approveSwapRequest, getPendingSwapRequests, rejectSwapRequest } from '../services/swaps.service';
import type { SwapRequest } from '../../../shared/types/api.types';
import styles from './ManagerSwapsPage.module.css';

export function ManagerSwapsPage() {
  const [swaps, setSwaps] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actingSwapId, setActingSwapId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      setSwaps(await getPendingSwapRequests());
    } catch {
      setLoadError('Failed to load swap requests. Try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleApprove(swapId: string) {
    setActingSwapId(swapId);
    try {
      await approveSwapRequest(swapId);
      await load();
    } finally {
      setActingSwapId(null);
    }
  }

  async function handleReject(swapId: string) {
    setActingSwapId(swapId);
    try {
      await rejectSwapRequest(swapId);
      await load();
    } finally {
      setActingSwapId(null);
    }
  }

  return (
    <PhoneShell>
      <StatusBar />
      <div className={styles.page}>

        <div className={styles.header}>
          <h1 className={styles.title}>Swap Requests</h1>
          <p className={styles.subtitle}>Accepted by employees, awaiting your approval</p>
        </div>

        <div className={styles.list}>
          {loading ? (
            <p className={styles.empty}>Loading…</p>
          ) : loadError ? (
            <p className={styles.empty}>{loadError}</p>
          ) : swaps.length === 0 ? (
            <p className={styles.empty}>No swap requests awaiting approval.</p>
          ) : (
            swaps.map((swap) => (
              <div key={swap.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.cardTitle}>
                    {swap.requestingEmployeeName} → {swap.targetEmployeeName}
                  </span>
                  <span className={styles.statusBadge}>Awaiting Approval</span>
                </div>
                <div className={styles.cardMeta}>
                  {new Date(`${swap.requestingShiftDate}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {' · '}{swap.requestingShiftStart}–{swap.requestingShiftEnd}
                </div>
                <div className={styles.cardReason}>"{swap.reason}"</div>
                <div className={styles.cardActions}>
                  <button
                    className={styles.approveBtn}
                    onClick={() => handleApprove(swap.id)}
                    disabled={actingSwapId === swap.id}
                  >
                    {actingSwapId === swap.id ? '…' : 'Approve'}
                  </button>
                  <button
                    className={styles.rejectBtn}
                    onClick={() => handleReject(swap.id)}
                    disabled={actingSwapId === swap.id}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
      <BottomNav role="manager" />
    </PhoneShell>
  );
}
