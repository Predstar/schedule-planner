import { useState } from 'react';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import { StatusBar } from '../../../shared/components/StatusBar';
import { BottomNav } from '../../../shared/components/BottomNav';
import styles from './EmployeeShiftsPage.module.css';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS = ['Mo','Tu','We','Th','Fr','Sa','Su'];

interface Shift {
  id: string;
  date: string;        // "2026-6-9"
  dayLabel: string;    // "Tuesday"
  dateLabel: string;   // "Jun 9"
  start: string;
  end: string;
  hours: number;
  section: string;
  status: 'assigned' | 'open';
}

const MY_SHIFTS: Shift[] = [
  { id:'s1',  date:'2026-6-9',  dayLabel:'Tuesday',  dateLabel:'Jun 9',  start:'09:00', end:'17:00', hours:8, section:'Floor', status:'assigned' },
  { id:'s2',  date:'2026-6-12', dayLabel:'Friday',   dateLabel:'Jun 12', start:'09:00', end:'17:00', hours:8, section:'Floor', status:'assigned' },
  { id:'s3',  date:'2026-6-16', dayLabel:'Tuesday',  dateLabel:'Jun 16', start:'09:00', end:'17:00', hours:8, section:'Floor', status:'assigned' },
  { id:'s4',  date:'2026-6-19', dayLabel:'Friday',   dateLabel:'Jun 19', start:'09:00', end:'17:00', hours:8, section:'Floor', status:'assigned' },
  { id:'s5',  date:'2026-6-23', dayLabel:'Tuesday',  dateLabel:'Jun 23', start:'09:00', end:'17:00', hours:8, section:'Floor', status:'assigned' },
  { id:'s6',  date:'2026-6-26', dayLabel:'Friday',   dateLabel:'Jun 26', start:'09:00', end:'17:00', hours:8, section:'Floor', status:'assigned' },
  { id:'s7',  date:'2026-6-30', dayLabel:'Tuesday',  dateLabel:'Jun 30', start:'09:00', end:'17:00', hours:8, section:'Floor', status:'assigned' },
];

const SHIFT_DAYS = new Set(MY_SHIFTS.map(s => {
  const [,m,d] = s.date.split('-');
  return `${m}-${d}`;
}));

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  // 0=Sun,1=Mon,...6=Sat → convert to Mon-first index
  const raw = new Date(year, month, 1).getDay();
  return raw === 0 ? 6 : raw - 1;
}

export function EmployeeShiftsPage() {
  const [calYear,  setCalYear]  = useState(2026);
  const [calMonth, setCalMonth] = useState(5); // June = 5
  const [selectedDate, setSelectedDate] = useState<string>('2026-6-12');

  const totalHours  = MY_SHIFTS.reduce((s, sh) => s + sh.hours, 0);
  const totalShifts = MY_SHIFTS.length;

  const daysInMonth  = getDaysInMonth(calYear, calMonth);
  const firstWeekDay = getFirstDayOfWeek(calYear, calMonth);

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  }

  const selectedShifts = MY_SHIFTS.filter(s => s.date === selectedDate);
  const selectedShift  = selectedShifts[0] ?? null;

  const upcomingShifts = MY_SHIFTS.filter(s => {
    const [y,m,d] = s.date.split('-').map(Number);
    const sd = new Date(y, m - 1, d);
    return sd >= new Date(2026, 5, 12); // on or after Jun 12
  });

  function formatSelectedLabel() {
    if (!selectedDate) return '';
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  function hasShift(day: number) {
    return SHIFT_DAYS.has(`${calMonth + 1}-${day}`);
  }

  function isSelected(day: number) {
    return selectedDate === `${calYear}-${calMonth + 1}-${day}`;
  }

  function isToday(day: number) {
    const t = new Date();
    return t.getFullYear() === calYear && t.getMonth() === calMonth && t.getDate() === day;
  }

  function selectDay(day: number) {
    setSelectedDate(`${calYear}-${calMonth + 1}-${day}`);
  }

  // Build calendar grid (Mon-first)
  const calCells: Array<number | null> = [
    ...Array(firstWeekDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (calCells.length % 7 !== 0) calCells.push(null);

  return (
    <PhoneShell>
      <StatusBar />
      <div className={styles.page}>

        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>My Shifts</h1>
          <p className={styles.subtitle}>{totalHours}h total · {totalShifts} shifts</p>
        </div>

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
                    onClick={() => selectDay(day)}
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

            {selectedShift ? (
              <div className={styles.selectedShiftCard}>
                <div className={styles.selectedShiftAccent} />
                <div className={styles.selectedShiftBody}>
                  <div className={styles.selectedShiftTime}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {selectedShift.start} – {selectedShift.end} ({selectedShift.hours}h)
                  </div>
                  <div className={styles.selectedShiftSection}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {selectedShift.section.toLowerCase()}
                  </div>
                </div>
                <span className={styles.assignedBadge}>{selectedShift.status}</span>
              </div>
            ) : (
              <p className={styles.noShift}>No shift on this day.</p>
            )}
          </div>
        )}

        {/* Upcoming shifts */}
        <div className={styles.upcomingSection}>
          <p className={styles.upcomingLabel}>UPCOMING ({upcomingShifts.length})</p>
          <div className={styles.upcomingList}>
            {upcomingShifts.map(shift => {
              const [,m,d] = shift.date.split('-');
              const monthShort = MONTHS[Number(m) - 1].slice(0, 3);
              return (
                <div key={shift.id} className={styles.upcomingCard} onClick={() => setSelectedDate(shift.date)}>
                  <div className={styles.upcomingDateBadge}>
                    <span className={styles.upcomingMonth}>{monthShort}</span>
                    <span className={styles.upcomingDay}>{d}</span>
                  </div>
                  <div className={styles.upcomingInfo}>
                    <div className={styles.upcomingTime}>{shift.start} – {shift.end} ({shift.hours}h)</div>
                    <div className={styles.upcomingMeta}>{shift.section} · {shift.dayLabel}</div>
                  </div>
                  <span className={styles.sectionBadge}>{shift.section.toLowerCase()}</span>
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
