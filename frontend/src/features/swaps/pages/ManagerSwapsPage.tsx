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
  const [decidedSwaps, setDecidedSwaps] = useState<Record<string, 'APPROVED' | 'REJECTED'>>({});
  const [decidedClaims, setDecidedClaims] = useState<Record<string, 'APPROVED' | 'REJECTED'>>({});
  const [actionError, setActionError] = useState<string | null>(null);

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
    setActionError(null);
    try {
      await approveSwapRequest(swapId);
      setDecidedSwaps((prev) => ({ ...prev, [swapId]: 'APPROVED' }));
      await load();
    } catch (e: unknown) {
      setActionError((e as { message?: string })?.message ?? 'Failed to approve swap request.');
    } finally {
      setActingSwapId(null);
    }
  }

  async function handleReject(swapId: string) {
    setActingSwapId(swapId);
    setActionError(null);
    try {
      await rejectSwapRequest(swapId);
      setDecidedSwaps((prev) => ({ ...prev, [swapId]: 'REJECTED' }));
      await load();
    } catch (e: unknown) {
      setActionError((e as { message?: string })?.message ?? 'Failed to reject swap request.');
    } finally {
      setActingSwapId(null);
    }
  }

  async function handleApproveClaim(postId: string, claimId: string) {
    setActingClaimId(claimId);
    setActionError(null);
    try {
      await approveShiftClaim(postId, claimId);
      setDecidedClaims((prev) => ({ ...prev, [claimId]: 'APPROVED' }));
      await load();
    } catch (e: unknown) {
      const err = e as { message?: string; code?: string };
      setActionError(
        err?.code === 'SHIFT_OVERLAP'
          ? 'Cannot approve — the claiming employee already has a shift at this time.'
          : err?.code === 'WEEKLY_HOUR_LIMIT_EXCEEDED'
            ? 'Cannot approve — this would exceed the claiming employee’s weekly hour limit.'
            : err?.message ?? 'Failed to approve shift claim.',
      );
    } finally {
      setActingClaimId(null);
    }
  }

  async function handleRejectClaim(postId: string, claimId: string) {
    setActingClaimId(claimId);
    setActionError(null);
    try {
      await rejectShiftClaim(postId, claimId);
      setDecidedClaims((prev) => ({ ...prev, [claimId]: 'REJECTED' }));
      await load();
    } catch (e: unknown) {
      setActionError((e as { message?: string })?.message ?? 'Failed to reject shift claim.');
    } finally {
      setActingClaimId(null);
    }
  }

  const postsWithPendingClaims = openShiftPosts.filter(
    (post) =>
      post.claims.some((c) => c.status === 'PENDING' || decidedClaims[c.id]) &&
      (post.status === 'CLAIMED' || post.claims.some((c) => decidedClaims[c.id])),
  );

  return (
    <PhoneShell>
      <StatusBar />
      <div className={styles.page}>

        {actionError && (
          <div style={{ background: '#FEE2E2', color: '#B91C1C', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontFamily: 'Inter, sans-serif' }}>
            {actionError}
          </div>
        )}

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
            swaps.map((swap) => {
              const decided = decidedSwaps[swap.id];
              return (
              <div key={swap.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.cardTitle}>
                    {swap.requestingEmployeeName} → {swap.targetEmployeeName}
                  </span>
                  <span
                    className={styles.statusBadge}
                    style={
                      decided === 'APPROVED'
                        ? { background: '#DCFCE7', color: '#166534' }
                        : decided === 'REJECTED'
                          ? { background: '#FEE2E2', color: '#B91C1C' }
                          : undefined
                    }
                  >
                    {decided === 'APPROVED' ? 'Approved' : decided === 'REJECTED' ? 'Rejected' : 'Awaiting Approval'}
                  </span>
                </div>
                <div className={styles.cardMeta}>
                  {new Date(`${swap.requestingShiftDate}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {' · '}{swap.requestingShiftStart}–{swap.requestingShiftEnd}
                </div>
                <div className={styles.cardReason}>"{swap.reason}"</div>
                {!decided && (
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
                )}
              </div>
              );
            })
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
                .filter((claim) => claim.status === 'PENDING' || decidedClaims[claim.id])
                .map((claim) => {
                  const decided = decidedClaims[claim.id];
                  return (
                  <div key={claim.id} className={styles.card}>
                    <div className={styles.cardTop}>
                      <span className={styles.cardTitle}>
                        {post.postedByEmployeeName} → {claim.claimingEmployeeName}
                      </span>
                      <span
                        className={styles.statusBadge}
                        style={
                          decided === 'APPROVED'
                            ? { background: '#DCFCE7', color: '#166534' }
                            : decided === 'REJECTED'
                              ? { background: '#FEE2E2', color: '#B91C1C' }
                              : undefined
                        }
                      >
                        {decided === 'APPROVED' ? 'Approved' : decided === 'REJECTED' ? 'Rejected' : 'Awaiting Approval'}
                      </span>
                    </div>
                    <div className={styles.cardMeta}>
                      {new Date(`${post.shiftDate}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      {' · '}{post.shiftStartTime}–{post.shiftEndTime}
                    </div>
                    <div className={styles.cardReason}>"{post.reason}"</div>
                    {!decided && (
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
                    )}
                  </div>
                  );
                }),
            )
          )}
        </div>

      </div>
      <BottomNav role="manager" />
    </PhoneShell>
  );
}
