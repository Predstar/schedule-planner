import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import { BottomNav } from '../../../shared/components/BottomNav';
import {
  getWeeklySchedule,
  autoGenerateSchedule,
  approveSchedule,
  publishSchedule,
} from '../services/schedules.service';
import type { Assignment, Schedule } from '../../../shared/types/api.types';
import styles from './ManagerWeeklySchedulePage.module.css';

const ROLE_COLORS: Record<string, { bg: string; color: string }> = {
  WAITER:    { bg: '#FFF3E0', color: '#B45309' },
  RUNNER:    { bg: '#E8F5E9', color: '#166534' },
  BARTENDER: { bg: '#E0F2FE', color: '#0369A1' },
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT:     'Draft',
  APPROVED:  'Approved',
  REJECTED:  'Rejected',
  PUBLISHED: 'Published',
};

const STATUS_COLOR: Record<string, { bg: string; color: string }> = {
  DRAFT:     { bg: '#FFF3E0', color: '#B45309' },
  APPROVED:  { bg: '#E0F2FE', color: '#0369A1' },
  REJECTED:  { bg: '#FEE2E2', color: '#DC2626' },
  PUBLISHED: { bg: '#F0FDF4', color: '#166534' },
};

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function getNextMonday(): Date {
  const now = new Date();
  const day = now.getDay();
  const daysUntil = day === 0 ? 1 : 8 - day;
  const d = new Date(now);
  d.setDate(now.getDate() + daysUntil);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDayLabel(isoDate: string): { short: string; date: string } {
  const d = new Date(isoDate + 'T00:00:00');
  return {
    short: d.toLocaleDateString('en-GB', { weekday: 'short' }),
    date:  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
  };
}

function formatWeekLabel(monday: Date): string {
  const sunday = addDays(monday, 6);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${monday.toLocaleDateString('en-GB', opts)} – ${sunday.toLocaleDateString('en-GB', opts)}`;
}

export function ManagerWeeklySchedulePage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOf(new Date()));
  const [schedule,  setSchedule]  = useState<Schedule | null>(null);
  const [loading, setLoading]     = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error,   setError]       = useState('');
  const [toast,   setToast]       = useState('');

  const assignments: Assignment[] = schedule?.assignments ?? [];

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  useEffect(() => {
    setLoading(true);
    setError('');
    getWeeklySchedule(toISODate(weekStart))
      .then(s => setSchedule(s))
      .catch(() => setSchedule(null))
      .finally(() => setLoading(false));
  }, [weekStart]);

  const weekDates = Array.from({ length: 7 }, (_, i) => toISODate(addDays(weekStart, i)));

  type EmpRow = { name: string; role: string; days: Record<string, Assignment[]> };
  const empMap: Record<string, EmpRow> = {};
  for (const a of assignments) {
    if (!empMap[a.employeeId]) {
      empMap[a.employeeId] = { name: a.employeeName, role: a.employeeRole, days: {} };
    }
    if (!empMap[a.employeeId].days[a.date]) empMap[a.employeeId].days[a.date] = [];
    empMap[a.employeeId].days[a.date].push(a);
  }
  const rows = Object.entries(empMap);

  function prevWeek() { setWeekStart(d => addDays(d, -7)); }
  function nextWeek() { setWeekStart(d => addDays(d, 7)); }

  async function handleGenerate() {
    // Always generate for next week (where seed availability exists)
    const nextWeek = getNextMonday();
    setWeekStart(nextWeek);
    setActionLoading(true);
    setError('');
    try {
      const s = await autoGenerateSchedule(toISODate(nextWeek));
      setSchedule(s);
      showToast(`Schedule generated — ${s.assignments.length} assignments created`);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? 'Generation failed';
      setError(msg);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleApprove() {
    if (!schedule) return;
    setActionLoading(true);
    try {
      const s = await approveSchedule(schedule.id);
      setSchedule(s);
      showToast('Schedule approved');
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Approve failed');
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePublish() {
    if (!schedule) return;
    setActionLoading(true);
    try {
      const s = await publishSchedule(schedule.id);
      setSchedule(s);
      showToast('Schedule published — employees can now see their shifts');
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Publish failed');
    } finally {
      setActionLoading(false);
    }
  }

  function exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 14;

    doc.setFillColor(107, 79, 42);
    doc.rect(0, 0, pageW, 24, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(245, 239, 230);
    doc.text('Authentikka — Weekly Schedule', margin, 15);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 185, 165);
    doc.text(formatWeekLabel(weekStart), pageW - margin, 15, { align: 'right' });

    let y = 32;
    const colW = (pageW - margin * 2) / 8;

    doc.setFillColor(245, 239, 230);
    doc.rect(margin, y, pageW - margin * 2, 9, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(107, 79, 42);
    doc.text('Employee', margin + 2, y + 6);
    weekDates.forEach((date, i) => {
      const lbl = formatDayLabel(date);
      doc.text(`${lbl.short} ${lbl.date}`, margin + colW * (i + 1) + 2, y + 6);
    });
    y += 11;

    rows.forEach(([, row], idx) => {
      if (y > pageH - 20) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) {
        doc.setFillColor(252, 249, 245);
        doc.rect(margin, y, pageW - margin * 2, 10, 'F');
      }
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(28, 16, 7);
      doc.text(row.name, margin + 2, y + 7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(168, 150, 126);
      doc.text(row.role.toLowerCase(), margin + 2, y + 12);

      weekDates.forEach((date, i) => {
        const shifts = row.days[date] ?? [];
        const x = margin + colW * (i + 1) + 2;
        if (shifts.length === 0) {
          doc.setTextColor(210, 200, 190);
          doc.text('—', x, y + 7);
        } else {
          doc.setTextColor(28, 16, 7);
          shifts.forEach((s, si) => doc.text(`${s.startTime}–${s.endTime}`, x, y + 7 + si * 5));
        }
      });

      doc.setDrawColor(232, 221, 208);
      doc.setLineWidth(0.2);
      doc.line(margin, y + 14, pageW - margin, y + 14);
      y += 14;
    });

    if (rows.length === 0) {
      doc.setFontSize(11);
      doc.setTextColor(168, 150, 126);
      doc.text('No assignments for this week.', pageW / 2, y + 10, { align: 'center' });
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(168, 150, 126);
    doc.text('Authentikka Shift Management · Confidential', pageW / 2, pageH - 8, { align: 'center' });
    doc.save(`Authentikka_Schedule_${toISODate(weekStart)}.pdf`);
  }

  const status = schedule?.status ?? null;
  const canGenerate = !status || status === 'DRAFT' || status === 'REJECTED';
  const canApprove  = status === 'DRAFT';
  const canPublish  = status === 'APPROVED';
  const canExport   = !!schedule && assignments.length > 0;

  return (
    <PhoneShell>
      <div className={styles.body}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Weekly Schedule</h1>
          <button className={styles.exportBtn} onClick={exportPDF} disabled={!canExport} title={canExport ? 'Export schedule as PDF' : 'Generate a schedule first'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <polyline points="9 15 12 18 15 15"/>
            </svg>
            Export as PDF
          </button>
        </div>

        {/* Week navigation */}
        <div className={styles.weekNav}>
          <button className={styles.navArrow} onClick={prevWeek}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span className={styles.weekLabel}>{formatWeekLabel(weekStart)}</span>
          <button className={styles.navArrow} onClick={nextWeek}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {/* Status badge + action buttons */}
        <div className={styles.actionRow}>
          {status && (
            <span
              className={styles.statusBadge}
              style={{ background: STATUS_COLOR[status]?.bg, color: STATUS_COLOR[status]?.color }}
            >
              {STATUS_LABEL[status]}
            </span>
          )}
          <div className={styles.actionBtns}>
            {canGenerate && (
              <button
                className={styles.actionBtn}
                onClick={handleGenerate}
                disabled={actionLoading}
              >
                {actionLoading ? '…' : '⚙ Generate'}
              </button>
            )}
            {canApprove && (
              <button
                className={`${styles.actionBtn} ${styles.actionBtnApprove}`}
                onClick={handleApprove}
                disabled={actionLoading}
              >
                {actionLoading ? '…' : '✓ Approve'}
              </button>
            )}
            {canPublish && (
              <button
                className={`${styles.actionBtn} ${styles.actionBtnPublish}`}
                onClick={handlePublish}
                disabled={actionLoading}
              >
                {actionLoading ? '…' : '▶ Publish'}
              </button>
            )}
          </div>
        </div>

        {/* Toast */}
        {toast && <div className={styles.toast}>{toast}</div>}

        {/* Error */}
        {error && <div className={styles.stateErr}>{error}</div>}

        {loading && <div className={styles.state}>Loading…</div>}

        {!loading && !error && (
          <>
            {!schedule ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📅</div>
                <div className={styles.emptyTitle}>No schedule yet</div>
                <div className={styles.emptySub}>Tap <strong>⚙ Generate</strong> to auto-assign next week's shifts based on employee availability.</div>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.thName}>Employee</th>
                      {weekDates.map(date => {
                        const lbl = formatDayLabel(date);
                        return (
                          <th key={date} className={styles.th}>
                            <span className={styles.thDay}>{lbl.short}</span>
                            <span className={styles.thDate}>{lbl.date}</span>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr>
                        <td colSpan={8} className={styles.emptyCell}>No assignments this week</td>
                      </tr>
                    ) : (
                      rows.map(([empId, row]) => {
                        const rc = ROLE_COLORS[row.role] ?? { bg: '#F5F0E8', color: '#A8967E' };
                        return (
                          <tr key={empId} className={styles.tr}>
                            <td className={styles.tdName}>
                              <div className={styles.empName}>{row.name}</div>
                              <span className={styles.roleBadge} style={{ background: rc.bg, color: rc.color }}>
                                {row.role.toLowerCase()}
                              </span>
                            </td>
                            {weekDates.map(date => {
                              const shifts = row.days[date] ?? [];
                              return (
                                <td key={date} className={styles.td}>
                                  {shifts.length === 0 ? (
                                    <span className={styles.dash}>—</span>
                                  ) : (
                                    shifts.map(s => (
                                      <div key={s.assignmentId} className={styles.shiftChip}>
                                        {s.startTime}–{s.endTime}
                                      </div>
                                    ))
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
      <BottomNav role="manager" />
    </PhoneShell>
  );
}
