import { useState, useEffect, useCallback } from 'react';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import { StatusBar } from '../../../shared/components/StatusBar';
import { BottomNav } from '../../../shared/components/BottomNav';
import { getMyRoleSchedule } from '../../schedules/services/schedules.service';
import { getStoredUser } from '../../auth/services/auth.service';
import type { Assignment } from '../../../shared/types/api.types';
import styles from './EmployeeShiftsPage.module.css';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

function mondayOfWeek(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const raw = new Date(year, month, 1).getDay();
  return raw === 0 ? 6 : raw - 1;
}

function calcHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return Math.round(((eh * 60 + em) - (sh * 60 + sm)) / 60);
}

export function EmployeeShiftsPage() {
  const myEmployeeId = getStoredUser()?.employeeId ?? null;
  const today = new Date();
  const [calYear,  setCalYear]  = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string>('');

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const fetchWeek = useCallback(async (monday: string) => {
    setLoading(true);
    setError(null);
    try {
      const schedule = await getMyRoleSchedule(monday);
      setAssignments(prev => {
        const keyOf = (a: Assignment) => a.assignmentId ?? a.id!;
        const byId = new Map(prev.map(a => [keyOf(a), a]));
        for (const a of schedule.assignments) byId.set(keyOf(a), a);
        return Array.from(byId.values());
      });
    } catch (e: unknown) {
      const err = e as { statusCode?: number };
      if (err?.statusCode === 404) {
        // no published schedule this week — that's fine
      } else {
        setError('Could not load shifts.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay  = new Date(calYear, calMonth + 1, 0);
    const mondays  = new Set<string>();
    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      mondays.add(mondayOfWeek(new Date(d)));
    }
    setAssignments([]);
    mondays.forEach(m => fetchWeek(m));
  }, [calYear, calMonth, fetchWeek]);

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
    setAssignments([]);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
    setAssignments([]);
  }

  const assignmentsByDate: Record<string, Assignment[]> = {};
  for (const a of assignments) {
    (assignmentsByDate[a.date] ??= []).push(a);
  }

  const myAssignments = assignments.filter(a => a.employeeId === myEmployeeId);
  const totalHours  = myAssignments.reduce((s, a) => s + calcHours(a.startTime, a.endTime), 0);
  const totalShifts = myAssignments.length;

  const daysInMonth  = getDaysInMonth(calYear, calMonth);
  const firstWeekDay = getFirstDayOfWeek(calYear, calMonth);

  const calCells: Array<number | null> = [
    ...Array(firstWeekDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calCells.length % 7 !== 0) calCells.push(null);

  function padDay(day: number) {
    return `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  function hasShift(day: number)  { return (assignmentsByDate[padDay(day)]?.length ?? 0) > 0; }
  function isSelected(day: number){ return selectedDate === padDay(day); }
  function isToday(day: number)   {
    return today.getFullYear() === calYear && today.getMonth() === calMonth && today.getDate() === day;
  }

  const selectedAssignments = selectedDate ? (assignmentsByDate[selectedDate] ?? []) : [];

  const upcomingAssignments = myAssignments
    .filter(a => a.date >= today.toISOString().slice(0, 10))
    .sort((a, b) => a.date.localeCompare(b.date));

  function formatSelectedLabel() {
    if (!selectedDate) return '';
    const dt = new Date(selectedDate + 'T00:00:00');
    return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  return (
    <PhoneShell>
      <StatusBar />
      <div className={styles.page}>

        <div className={styles.header}>
          <h1 className={styles.title}>My Shifts</h1>
          <p className={styles.subtitle}>
            {loading ? 'Loading…' : `${totalHours}h total · ${totalShifts} shifts`}
          </p>
        </div>

        {error && <p style={{ color: '#B91C1C', padding: '0 16px', fontSize: 13 }}>{error}</p>}

        {/* Calendar */}
        <div className={styles.calCard}>
          <div className={styles.calNav}>
            <button className={styles.calNavBtn} onClick={prevMonth}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span className={styles.calTitle}>{MONTHS[calMonth]} {calYear}</span>
            <button className={styles.calNavBtn} onClick={nextMonth}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          <div className={styles.calGrid}>
            {DAY_LABELS.map(d => (
              <div key={d} className={styles.calDayLabel}>{d}</div>
            ))}
            {calCells.map((day, idx) => (
              <div key={idx} className={styles.calCell}>
                {day !== null && (
                  <button
                    className={[
                      styles.calDay,
                      isSelected(day) ? styles.calDaySelected : '',
                      isToday(day) && !isSelected(day) ? styles.calDayToday : '',
                    ].join(' ')}
                    onClick={() => setSelectedDate(prev => prev === padDay(day) ? '' : padDay(day))}
                  >
                    {day}
                    {hasShift(day) && !isSelected(day) && (
                      <span className={styles.dot} />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Selected day detail */}
        {selectedDate && (
          <div className={styles.daySection}>
            <div className={styles.dayHeader}>
              <span className={styles.dayLabel}>{formatSelectedLabel()}</span>
              <button className={styles.clearBtn} onClick={() => setSelectedDate('')}>Clear</button>
            </div>

            {selectedAssignments.length > 0 ? selectedAssignments.map(a => (
              <div key={a.assignmentId} className={styles.selectedShiftCard}>
                <div className={styles.selectedShiftAccent} />
                <div className={styles.selectedShiftBody}>
                  <div className={styles.selectedShiftTime}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {a.startTime} – {a.endTime} ({calcHours(a.startTime, a.endTime)}h)
                  </div>
                  <div className={styles.selectedShiftSection}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    {a.employeeName}
                  </div>
                </div>
                <span className={styles.assignedBadge}>{a.employeeRole.toLowerCase()}</span>
              </div>
            )) : (
              <p className={styles.noShift}>No shift on this day.</p>
            )}
          </div>
        )}

        {/* Upcoming shifts */}
        <div className={styles.upcomingSection}>
          <p className={styles.upcomingLabel}>UPCOMING ({upcomingAssignments.length})</p>
          <div className={styles.upcomingList}>
            {upcomingAssignments.length === 0 && !loading && (
              <p className={styles.noShift}>No upcoming shifts. Ask your manager to publish the schedule.</p>
            )}
            {upcomingAssignments.map(a => {
              const [, m, d] = a.date.split('-');
              const monthShort = MONTHS[Number(m) - 1].slice(0, 3);
              const dow = new Date(a.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' });
              return (
                <div key={a.assignmentId} className={styles.upcomingCard} onClick={() => setSelectedDate(a.date)}>
                  <div className={styles.upcomingDateBadge}>
                    <span className={styles.upcomingMonth}>{monthShort}</span>
                    <span className={styles.upcomingDay}>{d}</span>
                  </div>
                  <div className={styles.upcomingInfo}>
                    <div className={styles.upcomingTime}>{a.startTime} – {a.endTime} ({calcHours(a.startTime, a.endTime)}h)</div>
                    <div className={styles.upcomingMeta}>{a.employeeRole.toLowerCase()} · {dow}</div>
                  </div>
                  <span className={styles.sectionBadge}>{a.employeeRole.toLowerCase()}</span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
      <BottomNav role="employee" />
    </PhoneShell>
  );
}
