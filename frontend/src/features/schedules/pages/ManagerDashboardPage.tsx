import { useState, useEffect, useMemo } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import { BottomNav } from '../../../shared/components/BottomNav';
import { Spinner } from '../../../shared/components/Spinner';
import { AddShiftModal } from '../../../shared/components/AddShiftModal';
import { getWeeklySchedule } from '../services/schedules.service';
import { getWeeklyAvailability } from '../../availability/services/availability.service';
import { listEmployees } from '../../employees/services/employees.service';
import { listShifts } from '../../shifts/services/shifts.service';
import { getPendingSwapRequests } from '../../swaps/services/swaps.service';
import type { Assignment, SwapRequest } from '../../../shared/types/api.types';
import styles from './ManagerDashboardPage.module.css';

const MONTHS     = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_LONG  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

type ShiftColor = 'blue' | 'purple' | 'orange' | 'green';
const SHIFT_COLORS: Record<ShiftColor, { bg: string; border: string; roleColor: string }> = {
  blue:   { bg:'#EEF4FF', border:'#6B8FD4', roleColor:'#2F4FA8' },
  purple: { bg:'#F5F0FF', border:'#9B7FD4', roleColor:'#5B21B6' },
  orange: { bg:'#FFF8EC', border:'#D4A84B', roleColor:'#8B6B1A' },
  green:  { bg:'#F0FDF4', border:'#4BAD72', roleColor:'#166534' },
};
const COLOR_CYCLE: ShiftColor[] = ['blue', 'purple', 'orange', 'green'];

function buildCalendar(year: number, month: number) {
  const firstDay   = new Date(year, month, 1).getDay();
  const offset     = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMon  = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const cells: Array<{ day: number; type: 'prev' | 'curr' | 'next' }> = [];
  for (let i = 0; i < offset; i++) cells.push({ day: daysInPrev - offset + i + 1, type: 'prev' });
  for (let d = 1; d <= daysInMon; d++) cells.push({ day: d, type: 'curr' });
  let n = 1;
  while (cells.length % 7 !== 0) cells.push({ day: n++, type: 'next' });
  return cells;
}

// Returns "Xh Ym left" or "Expired" based on createdAt + 24h deadline
function formatCountdown(createdAt: string): string {
  const deadline = new Date(createdAt).getTime() + 24 * 60 * 60 * 1000;
  const remaining = deadline - Date.now();
  if (remaining <= 0) return 'Expired';
  const totalMinutes = Math.floor(remaining / 60000);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h}h ${m}m left` : `${h}h left`;
}

// ISO "YYYY-MM-DD" for the Monday of the week containing `date`
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

export function ManagerDashboardPage() {
  const navigate = useNavigate();
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  const [showModal, setShowModal]       = useState(false);
  const [shiftDate, setShiftDate]       = useState('');

  const queryClient = useQueryClient();

  // Live countdown tick
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const weekStart = getWeekStart(today);
  const weekRangeTo = new Date(new Date(weekStart).getTime() + 6 * 86400000).toISOString().slice(0, 10);

  const [availQuery, empsQuery, shiftsQuery, swapsQuery, scheduleQuery] = useQueries({
    queries: [
      { queryKey: ['weekly-availability', weekStart], queryFn: () => getWeeklyAvailability(weekStart) },
      { queryKey: ['employees', { active: true }], queryFn: () => listEmployees({ active: true }) },
      { queryKey: ['shifts', weekStart, weekRangeTo], queryFn: () => listShifts(weekStart, weekRangeTo) },
      { queryKey: ['pending-swap-requests'], queryFn: getPendingSwapRequests },
      { queryKey: ['weekly-schedule', weekStart], queryFn: () => getWeeklySchedule(weekStart) },
    ],
  });

  const statsLoading = [availQuery, empsQuery, shiftsQuery, swapsQuery, scheduleQuery].some(q => q.isLoading);
  const statsError = [availQuery, empsQuery, shiftsQuery, swapsQuery, scheduleQuery].every(q => q.isError);

  const availabilityCount = availQuery.data?.length ?? null;
  const totalEmployees = empsQuery.data?.length ?? null;
  const pendingSwaps: SwapRequest[] = swapsQuery.data ?? [];
  const assignments: Assignment[] = scheduleQuery.data?.assignments ?? [];

  const openShiftCount = useMemo(() => {
    const shifts = shiftsQuery.data ?? [];
    const scheduleAssignments = scheduleQuery.data?.assignments ?? [];
    const assignmentsByShift = new Map<string, number>();
    for (const a of scheduleAssignments) {
      assignmentsByShift.set(a.shiftId, (assignmentsByShift.get(a.shiftId) ?? 0) + 1);
    }
    return shifts.reduce((sum, s) => {
      const filled = assignmentsByShift.get(s.id) ?? 0;
      return sum + Math.max(0, s.requiredCount - filled);
    }, 0);
  }, [shiftsQuery.data, scheduleQuery.data]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  }

  function openModal() {
    const d = selectedDay ?? today.getDate();
    const candidate = `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    setShiftDate(candidate < todayIso ? todayIso : candidate);
    setShowModal(true);
  }

  async function handleShiftSaved(shiftWeekStart: string) {
    await queryClient.invalidateQueries({ queryKey: ['weekly-schedule', shiftWeekStart] });
    await queryClient.invalidateQueries({ queryKey: ['shifts'] });
    setShowModal(false);
  }

  function handleDayClick(day: number) {
    setSelectedDay(prev => prev === day ? null : day);
  }

  const cells   = buildCalendar(viewYear, viewMonth);
  const isThisMonthAndYear = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  // Build day shift list from live assignments for selected day
  const dayKey    = selectedDay ? `${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(selectedDay).padStart(2,'0')}` : null;
  const dayShifts = dayKey
    ? assignments.filter(a => a.date === dayKey)
    : [];
  const dayLabel  = selectedDay
    ? (() => {
        const dow = new Date(viewYear, viewMonth, selectedDay).getDay();
        return `${DAYS_LONG[dow]}, ${MONTHS[viewMonth]} ${selectedDay}, ${viewYear}`;
      })()
    : null;

  // Dots: days that have assignments
  const daysWithShifts = new Set(assignments.map(a => {
    const d = new Date(a.date);
    if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) return d.getDate();
    return null;
  }).filter(Boolean) as number[]);

  const oldestPendingSwap = pendingSwaps.length > 0
    ? pendingSwaps.reduce((oldest, s) =>
        new Date(s.createdAt) < new Date(oldest.createdAt) ? s : oldest
      )
    : null;

  const availLabel = availabilityCount !== null && totalEmployees !== null
    ? `${availabilityCount}/${totalEmployees}`
    : '…';
  const openShiftsLabel  = openShiftCount !== null ? String(openShiftCount) : '…';
  const swapRequestLabel = String(pendingSwaps.length);

  const employees = empsQuery.data ?? [];

  return (
    <PhoneShell>
      <div className={styles.body}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Schedule</h1>
            <p className={styles.subtitle}>Published &middot; Full year view</p>
          </div>
          <button className={styles.addBtn} onClick={openModal}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Shift
          </button>
        </div>

        {/* Stat cards */}
        {statsLoading ? (
          <Spinner size="medium" />
        ) : (
        <div className={styles.statGrid}>
          <div
            className={styles.statCard}
            onClick={() => navigate('/manager/availability-tracking')}
            style={{ cursor: 'pointer' }}
          >
            <div className={styles.statValue}>
              {statsError ? '—' : availabilityCount !== null
                ? <>{availabilityCount}<span className={styles.statFrac}>/{totalEmployees}</span></>
                : '…'
              }
            </div>
            <div className={styles.statLabel}>Availability</div>
          </div>
          <div className={[styles.statCard, styles.statWarm].join(' ')}>
            <div className={[styles.statValue, styles.statValueWarm].join(' ')}>
              {statsError ? '—' : openShiftsLabel}
            </div>
            <div className={styles.statLabel}>Open Shifts</div>
          </div>
          <div className={[styles.statCard, styles.statCool].join(' ')}>
            <div className={[styles.statValue, styles.statValueCool].join(' ')}>
              {statsError ? '—' : swapRequestLabel}
            </div>
            <div className={styles.statLabel}>Swap Requests</div>
          </div>
        </div>
        )}

        {/* Swap alert — only shown when there are pending swaps */}
        {pendingSwaps.length > 0 && (
          <div
            className={[styles.alert, styles.alertInfo].join(' ')}
            onClick={() => navigate('/manager/requests')}
            style={{ cursor: 'pointer' }}
          >
            <div className={[styles.alertIcon, styles.alertIconInfo].join(' ')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B5FBF" strokeWidth="2.5" strokeLinecap="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div className={styles.alertBody}>
              <div className={[styles.alertTitle, styles.alertTitleInfo].join(' ')}>
                {pendingSwaps.length} swap request{pendingSwaps.length !== 1 ? 's' : ''} awaiting approval
                {oldestPendingSwap && (
                  <span style={{ marginLeft: 6, fontWeight: 400, fontSize: '0.85em' }}>
                    · {formatCountdown(oldestPendingSwap.createdAt)}
                  </span>
                )}
              </div>
              <div className={[styles.alertDesc, styles.alertDescInfo].join(' ')}>Tap to approve or reject</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2F4FA8" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        )}

        {/* Calendar */}
        <div className={styles.calCard}>
          <div className={styles.calHeader}>
            <button className={styles.calNav} onClick={prevMonth}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-sub)" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span className={styles.calMonth}>{MONTHS[viewMonth]} {viewYear}</span>
            <button className={styles.calNav} onClick={nextMonth}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-sub)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          <div className={styles.calDow}>
            {['Mo','Tu','We','Th','Fr','Sa','Su'].map(d => <span key={d} className={styles.calDowCell}>{d}</span>)}
          </div>

          <div className={styles.calGrid}>
            {cells.map((cell, i) => {
              const isCurr     = cell.type === 'curr';
              const isToday    = isThisMonthAndYear && isCurr && cell.day === today.getDate();
              const isSelected = isCurr && cell.day === selectedDay;
              const hasDot     = isCurr && daysWithShifts.has(cell.day);
              return (
                <div
                  key={i}
                  className={[
                    styles.calCell,
                    !isCurr       ? styles.calCellOther    : '',
                    isToday       ? styles.calCellToday    : '',
                    isSelected && !isToday ? styles.calCellSelected : '',
                  ].join(' ')}
                  onClick={() => isCurr && handleDayClick(cell.day)}
                >
                  {cell.day}
                  {hasDot && (
                    <span className={[styles.calDot, isToday ? styles.calDotToday : ''].join(' ')} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Day shift list */}
        {selectedDay && dayLabel && (
          <div className={styles.daySection}>
            <div className={styles.dayHeader}>
              <span className={styles.dayTitle}>{dayLabel}</span>
            </div>

            {dayShifts.length === 0 ? (
              <div className={styles.noShifts}>No shifts scheduled for this day.</div>
            ) : (
              dayShifts.map((assignment, idx) => {
                const c = SHIFT_COLORS[COLOR_CYCLE[idx % COLOR_CYCLE.length]];
                const startH = parseInt(assignment.startTime);
                const endH   = parseInt(assignment.endTime);
                return (
                  <div
                    key={assignment.assignmentId}
                    className={styles.shiftCard}
                    style={{ background: c.bg, borderColor: c.border }}
                  >
                    <div className={styles.shiftAccent} style={{ background: c.border }} />
                    <div className={styles.shiftMain}>
                      <div className={styles.shiftTop}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.border} strokeWidth="2" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span className={styles.shiftTime}>{assignment.startTime}–{assignment.endTime}</span>
                        <span className={styles.shiftDuration}>
                          ({Math.round(endH - startH)}h)
                        </span>
                      </div>
                      <div className={styles.shiftBottom}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c.border} strokeWidth="2" strokeLinecap="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span className={styles.shiftEmployee}>&middot; {assignment.employeeName}</span>
                      </div>
                    </div>
                    <span className={styles.shiftRole} style={{ color: c.roleColor }}>{assignment.employeeRole}</span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <BottomNav role="manager" />

      {showModal && (
        <AddShiftModal
          employees={employees}
          defaultDate={shiftDate}
          todayIso={todayIso}
          onClose={() => setShowModal(false)}
          onSaved={handleShiftSaved}
        />
      )}
    </PhoneShell>
  );
}
