import { useState } from 'react';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import { StatusBar } from '../../../shared/components/StatusBar';
import { BottomNav } from '../../../shared/components/BottomNav';
import styles from './AvailabilityPage.module.css';

type NavRole = 'manager' | 'employee';

interface Props {
  role: NavRole;
}

interface ShiftSlot {
  label: string;
  time: string;
}

interface DayAvailability {
  date: string;        // e.g. "Jun 9"
  dayName: string;     // e.g. "Tuesday"
  morning: boolean;
  evening: boolean;
}

const SHIFTS: ShiftSlot[] = [
  { label: 'Morning Shift', time: '11:00 – 17:00' },
  { label: 'Evening Shift', time: '17:00 – 23:00' },
];

const INITIAL_DAYS: DayAvailability[] = [
  { date: 'Jun 9',  dayName: 'Tuesday',   morning: false, evening: false },
  { date: 'Jun 10', dayName: 'Wednesday', morning: false, evening: false },
  { date: 'Jun 11', dayName: 'Thursday',  morning: false, evening: false },
  { date: 'Jun 12', dayName: 'Friday',    morning: false, evening: false },
  { date: 'Jun 13', dayName: 'Saturday',  morning: false, evening: false },
  { date: 'Jun 14', dayName: 'Sunday',    morning: false, evening: false },
  { date: 'Jun 15', dayName: 'Monday',    morning: false, evening: false },
];

export function AvailabilityPage({ role }: Props) {
  const [days, setDays]         = useState<DayAvailability[]>(INITIAL_DAYS);
  const [submitted, setSubmitted] = useState(false);

  function toggle(index: number, slot: 'morning' | 'evening') {
    setDays(prev =>
      prev.map((d, i) => i === index ? { ...d, [slot]: !d[slot] } : d)
    );
    setSubmitted(false);
  }

  function handleSubmit() {
    const selected = days.filter(d => d.morning || d.evening);
    if (selected.length === 0) return;
    setSubmitted(true);
  }

  const totalSelected = days.reduce(
    (sum, d) => sum + (d.morning ? 1 : 0) + (d.evening ? 1 : 0), 0
  );

  return (
    <PhoneShell>
      <StatusBar />

      <div className={styles.body}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>My Availability</h1>
            <p className={styles.subtitle}>Week of Jun 9–15, 2026</p>
          </div>
          <div className={styles.timerBadge}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            14h left
          </div>
        </div>

        {/* Capacity info */}
        <div className={styles.capacityCard}>
          <div className={styles.capacityTitle}>Shift Capacity Info</div>
          <div className={styles.capacityRow}>
            <span>🌤</span>
            <span className={styles.capacityText}>Morning — 3 waiters max</span>
          </div>
          <div className={styles.capacityRow}>
            <span>🌙</span>
            <span className={styles.capacityText}>Evening — 6 waiters max</span>
          </div>
        </div>

        {/* Day cards */}
        {days.map((day, i) => (
          <div key={day.date} className={styles.dayCard}>
            <div className={styles.dayHeader}>
              <span className={styles.dayName}>{day.dayName},</span>
              <span className={styles.dayDate}>{day.date}</span>
            </div>
            <div className={styles.shiftRow}>
              {SHIFTS.map((shift, si) => {
                const isSelected = si === 0 ? day.morning : day.evening;
                const slot: 'morning' | 'evening' = si === 0 ? 'morning' : 'evening';
                return (
                  <button
                    key={shift.label}
                    className={[
                      styles.shiftBtn,
                      isSelected ? styles.shiftBtnSelected : '',
                    ].join(' ')}
                    onClick={() => toggle(i, slot)}
                  >
                    <span className={styles.shiftBtnLabel}>{shift.label}</span>
                    <span className={styles.shiftBtnTime}>{shift.time}</span>
                    {isSelected && (
                      <span className={styles.shiftCheck}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Spacer so content clears the fixed button */}
        <div style={{ height: 100 }} />
      </div>

      {/* Fixed submit area */}
      <div className={styles.submitWrap}>
        {submitted && (
          <div className={styles.successMsg}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Availability submitted for {totalSelected} slot{totalSelected !== 1 ? 's' : ''}
          </div>
        )}
        <button
          className={[styles.submitBtn, totalSelected === 0 ? styles.submitBtnDisabled : ''].join(' ')}
          onClick={handleSubmit}
          disabled={totalSelected === 0}
        >
          {submitted ? 'Update Availability' : `Submit Availability${totalSelected > 0 ? ` (${totalSelected} slot${totalSelected !== 1 ? 's' : ''})` : ''}`}
        </button>
      </div>

      <BottomNav role={role} />
    </PhoneShell>
  );
}
