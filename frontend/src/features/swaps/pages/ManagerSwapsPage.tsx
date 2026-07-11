import { useEffect, useState } from 'react';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import { StatusBar } from '../../../shared/components/StatusBar';
import { BottomNav } from '../../../shared/components/BottomNav';
import { approveSwapRequest, getPendingSwapRequests, rejectSwapRequest } from '../services/swaps.service';
import {
  approveShiftClaim,
  listOpenShiftSwapsForManager,
  rejectShiftClaim,
} from '../services/open-shift-swaps.service';
import type { OpenShiftPost, SwapRequest } from '../../../shared/types/api.types';
import styles from './ManagerSwapsPage.module.css';

export function ManagerSwapsPage() {
  const [swaps, setSwaps] = useState<SwapRequest[]>([]);
  const [openShiftPosts, setOpenShiftPosts] = useState<OpenShiftPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actingSwapId, setActingSwapId] = useState<string | null>(null);
  const [actingClaimId, setActingClaimId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const [pendingSwaps, posts] = await Promise.all([
        getPendingSwapRequests(),
        listOpenShiftSwapsForManager(),
      ]);
      setSwaps(pendingSwaps);
      setOpenShiftPosts(posts);
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

  async function handleApproveClaim(postId: string, claimId: string) {
    setActingClaimId(claimId);
    try {
      await approveShiftClaim(postId, claimId);
      await load();
    } finally {
      setActingClaimId(null);
    }
  }

  async function handleRejectClaim(postId: string, claimId: string) {
    setActingClaimId(claimId);
    try {
      await rejectShiftClaim(postId, claimId);
      await load();
    } finally {
      setActingClaimId(null);
    }
  }

  const postsWithPendingClaims = openShiftPosts.filter(
    (post) => post.status === 'CLAIMED' && post.claims.some((c) => c.status === 'PENDING'),
  );

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

        <div className={styles.header} style={{ marginTop: 8 }}>
          <h1 className={styles.title} style={{ fontSize: 18 }}>Open Shift Claims</h1>
          <p className={styles.subtitle}>Claimed by an employee, awaiting your approval</p>
        </div>

        <div className={styles.list}>
          {loading ? (
            <p className={styles.empty}>Loading…</p>
          ) : postsWithPendingClaims.length === 0 ? (
            <p className={styles.empty}>No open shift claims awaiting approval.</p>
          ) : (
            postsWithPendingClaims.flatMap((post) =>
              post.claims
                .filter((claim) => claim.status === 'PENDING')
                .map((claim) => (
                  <div key={claim.id} className={styles.card}>
                    <div className={styles.cardTop}>
                      <span className={styles.cardTitle}>
                        {post.postedByEmployeeName} → {claim.claimingEmployeeName}
                      </span>
                      <span className={styles.statusBadge}>Awaiting Approval</span>
                    </div>
                    <div className={styles.cardMeta}>
                      {new Date(`${post.shiftDate}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' · '}{post.shiftStartTime}–{post.shiftEndTime}
                    </div>
                    <div className={styles.cardReason}>"{post.reason}"</div>
                    <div className={styles.cardActions}>
                      <button
                        className={styles.approveBtn}
                        onClick={() => handleApproveClaim(post.id, claim.id)}
                        disabled={actingClaimId === claim.id}
                      >
                        {actingClaimId === claim.id ? '…' : 'Approve'}
                      </button>
                      <button
                        className={styles.rejectBtn}
                        onClick={() => handleRejectClaim(post.id, claim.id)}
                        disabled={actingClaimId === claim.id}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                )),
            )
          )}
        </div>

      </div>
      <BottomNav role="manager" />
    </PhoneShell>
  );
}
