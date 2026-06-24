import { useState } from 'react';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import { StatusBar } from '../../../shared/components/StatusBar';
import { BottomNav } from '../../../shared/components/BottomNav';
import styles from './EmployeeSwapsPage.module.css';

type SwapStatus = 'Accepted — Awaiting Manager' | 'Pending' | 'Rejected' | 'Approved';

interface SwapRequest {
  id: string;
  swapWith: string;
  date: string;
  time: string;
  reason: string;
  status: SwapStatus;
}

const MOCK_SWAPS: SwapRequest[] = [
  {
    id: 'sw-1',
    swapWith: 'Carlos Ruiz',
    date: 'Fri Jun 12',
    time: '09:00–17:00',
    reason: 'Doctor appointment Thursday morning',
    status: 'Accepted — Awaiting Manager',
  },
];

const STATUS_STYLE: Record<SwapStatus, { bg: string; color: string }> = {
  'Accepted — Awaiting Manager': { bg: '#EEF2FF', color: '#4338CA' },
  'Pending':                     { bg: '#FFF8E1', color: '#B45309' },
  'Rejected':                    { bg: '#FEE2E2', color: '#B91C1C' },
  'Approved':                    { bg: '#DCFCE7', color: '#166534' },
};

export function EmployeeSwapsPage() {
  const [swaps] = useState<SwapRequest[]>(MOCK_SWAPS);
  const [showModal, setShowModal] = useState(false);

  return (
    <PhoneShell>
      <StatusBar />
      <div className={styles.page}>

        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Shift Swaps</h1>
          <button className={styles.newBtn} onClick={() => setShowModal(true)}>
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
            {swaps.length === 0 ? (
              <p className={styles.empty}>No swap requests yet.</p>
            ) : (
              swaps.map(swap => {
                const st = STATUS_STYLE[swap.status];
                return (
                  <div key={swap.id} className={styles.card}>
                    <div className={styles.cardTop}>
                      <span className={styles.cardTitle}>Swap with {swap.swapWith}</span>
                      <span className={styles.statusBadge} style={{ background: st.bg, color: st.color }}>
                        {swap.status}
                      </span>
                    </div>
                    <div className={styles.cardMeta}>{swap.date} · {swap.time}</div>
                    <div className={styles.cardReason}>"{swap.reason}"</div>
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
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>New Swap Request</h2>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Swap with</label>
              <select className={styles.select}>
                <option>Carlos Ruiz</option>
                <option>Maria Lopez</option>
                <option>Tom Baker</option>
                <option>Priya Patel</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Your shift</label>
              <select className={styles.select}>
                <option>Fri Jun 12 · 09:00–17:00</option>
                <option>Tue Jun 16 · 09:00–17:00</option>
                <option>Fri Jun 19 · 09:00–17:00</option>
              </select>
            </div>

            <div className={styles.field}>
              <label className={styles.fieldLabel}>Reason</label>
              <textarea className={styles.textarea} rows={3} placeholder="Briefly explain why…" />
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
              <button className={styles.submitBtn} onClick={() => setShowModal(false)}>Submit</button>
            </div>
          </div>
        </div>
      )}

      <BottomNav role="employee" />
    </PhoneShell>
  );
}
