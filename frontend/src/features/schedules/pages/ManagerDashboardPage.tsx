import { useState } from 'react';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import { StatusBar } from '../../../shared/components/StatusBar';
import { BottomNav } from '../../../shared/components/BottomNav';
import styles from './ManagerDashboardPage.module.css';

const MONTHS     = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_LONG  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const SHIFT_DATES = new Set([9,10,11,12,13,14,16,17,18,19,20,21,23,24,25,26,27,28]);
const SECTIONS   = ['floor','bar','kitchen','delivery'];
const ROLES      = ['any','waiter','runner','chef','bartender'];
const EMPLOYEES  = ['Leave open...','James Wright','Maria Lopez','Tom Baker','Priya Patel','Carlos Ruiz'];
const START_TIMES = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];
const END_TIMES   = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00'];

type ShiftColor = 'blue' | 'purple' | 'orange' | 'green';

interface DayShift {
  start: string;
  end: string;
  section: string;
  employee: string | null; // null = unassigned
  role: string;
  color: ShiftColor;
}

// Demo shift data keyed by "YYYY-M-D"
const SHIFT_DATA: Record<string, DayShift[]> = {
  '2026-6-9': [
    { start:'09:00', end:'17:00', section:'Floor',   employee:'James',  role:'Waiter', color:'blue'   },
    { start:'14:00', end:'22:00', section:'Bar',     employee:'Maria',  role:'Waiter', color:'purple' },
    { start:'09:00', end:'17:00', section:'Kitchen', employee:null,     role:'Runner', color:'orange' },
  ],
  '2026-6-10': [
    { start:'09:00', end:'17:00', section:'Floor',    employee:'Carlos', role:'Waiter', color:'blue'   },
    { start:'11:00', end:'19:00', section:'Kitchen',  employee:'Tom',    role:'Runner', color:'green'  },
  ],
  '2026-6-11': [
    { start:'09:00', end:'17:00', section:'Floor',    employee:'James',  role:'Waiter', color:'blue'   },
    { start:'14:00', end:'22:00', section:'Bar',      employee:'Aisha',  role:'Bartender', color:'purple' },
    { start:'09:00', end:'17:00', section:'Delivery', employee:'Priya',  role:'Runner', color:'green'  },
  ],
  '2026-6-12': [
    { start:'09:00', end:'17:00', section:'Floor',   employee:'James',  role:'Waiter', color:'blue'   },
    { start:'09:00', end:'17:00', section:'Kitchen', employee:'Luca',   role:'Chef',   color:'orange' },
  ],
  '2026-6-16': [
    { start:'11:00', end:'19:00', section:'Bar',     employee:'Maria',  role:'Waiter', color:'purple' },
    { start:'11:00', end:'19:00', section:'Floor',   employee:null,     role:'Waiter', color:'orange' },
  ],
  '2026-6-24': [
    { start:'09:00', end:'17:00', section:'Floor',    employee:'Carlos', role:'Waiter', color:'blue'   },
    { start:'14:00', end:'22:00', section:'Bar',      employee:'Aisha',  role:'Bartender', color:'purple' },
    { start:'09:00', end:'17:00', section:'Kitchen',  employee:'Tom',    role:'Runner', color:'green'  },
    { start:'09:00', end:'17:00', section:'Delivery', employee:'Priya',  role:'Runner', color:'orange' },
  ],
};

const SHIFT_COLORS: Record<ShiftColor, { bg: string; border: string; roleColor: string }> = {
  blue:   { bg:'#EEF4FF', border:'#6B8FD4', roleColor:'#2F4FA8' },
  purple: { bg:'#F5F0FF', border:'#9B7FD4', roleColor:'#5B21B6' },
  orange: { bg:'#FFF8EC', border:'#D4A84B', roleColor:'#8B6B1A' },
  green:  { bg:'#F0FDF4', border:'#4BAD72', roleColor:'#166534' },
};

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

export function ManagerDashboardPage() {
  const [viewYear,  setViewYear]  = useState(2026);
  const [viewMonth, setViewMonth] = useState(5);
  const [selectedDay, setSelectedDay] = useState<number | null>(9); // default June 9

  const [showModal, setShowModal]       = useState(false);
  const [shiftDate, setShiftDate]       = useState('');
  const [shiftStart, setShiftStart]     = useState('09:00');
  const [shiftEnd,   setShiftEnd]       = useState('17:00');
  const [shiftSection, setShiftSection] = useState('floor');
  const [shiftRole,    setShiftRole]    = useState('any');
  const [shiftEmployee, setShiftEmployee] = useState('Leave open...');

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
    const d = selectedDay ?? new Date().getDate();
    setShiftDate(`${viewYear}-${String(viewMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`);
    setShowModal(true);
  }

  function handleDayClick(day: number) {
    setSelectedDay(prev => prev === day ? null : day);
  }

  const cells      = buildCalendar(viewYear, viewMonth);
  const isJune2026 = viewYear === 2026 && viewMonth === 5;

  // Shifts for selected day
  const dayKey     = selectedDay ? `${viewYear}-${viewMonth + 1}-${selectedDay}` : null;
  const dayShifts  = dayKey ? (SHIFT_DATA[dayKey] ?? []) : [];
  const dayLabel   = selectedDay
    ? (() => {
        const dow = new Date(viewYear, viewMonth, selectedDay).getDay();
        return `${DAYS_LONG[dow]}, ${MONTHS[viewMonth]} ${selectedDay}, ${viewYear}`;
      })()
    : null;

  return (
    <PhoneShell>
      <StatusBar />

      <div className={styles.body}>
        {/* Header */}
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
        <div className={styles.statGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>2<span className={styles.statFrac}>/6</span></div>
            <div className={styles.statLabel}>Availability</div>
          </div>
          <div className={[styles.statCard, styles.statWarm].join(' ')}>
            <div className={[styles.statValue, styles.statValueWarm].join(' ')}>3</div>
            <div className={styles.statLabel}>Open Shifts</div>
          </div>
          <div className={[styles.statCard, styles.statCool].join(' ')}>
            <div className={[styles.statValue, styles.statValueCool].join(' ')}>1</div>
            <div className={styles.statLabel}>Swap Requests</div>
          </div>
        </div>

        {/* Conflict alert */}
        <div className={[styles.alert, styles.alertWarn].join(' ')}>
          <div className={[styles.alertIcon, styles.alertIconWarn].join(' ')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C49A20" strokeWidth="2.5" strokeLinecap="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <div className={styles.alertBody}>
            <div className={[styles.alertTitle, styles.alertTitleWarn].join(' ')}>3 Conflicts — AI recommendations ready</div>
            <div className={[styles.alertDesc, styles.alertDescWarn].join(' ')}>Tap to review &amp; assign with fairness ranking</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8B6B1A" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>

        {/* Swap alert */}
        <div className={[styles.alert, styles.alertInfo].join(' ')}>
          <div className={[styles.alertIcon, styles.alertIconInfo].join(' ')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3B5FBF" strokeWidth="2.5" strokeLinecap="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div className={styles.alertBody}>
            <div className={[styles.alertTitle, styles.alertTitleInfo].join(' ')}>1 swap request awaiting approval</div>
            <div className={[styles.alertDesc, styles.alertDescInfo].join(' ')}>Tap to approve or reject</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2F4FA8" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>

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
              const isToday    = isJune2026 && isCurr && cell.day === 9;
              const isSelected = isCurr && cell.day === selectedDay;
              const hasDot     = isJune2026 && isCurr && SHIFT_DATES.has(cell.day);
              const shiftCount = isJune2026 && isCurr
                ? (SHIFT_DATA[`${viewYear}-${viewMonth + 1}-${cell.day}`] ?? []).length
                : 0;
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
                  {hasDot && shiftCount > 0 && (
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
              <button className={styles.dayAddBtn} onClick={openModal}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add
              </button>
            </div>

            {dayShifts.length === 0 ? (
              <div className={styles.noShifts}>No shifts scheduled for this day.</div>
            ) : (
              dayShifts.map((shift, idx) => {
                const c = SHIFT_COLORS[shift.color];
                return (
                  <div
                    key={idx}
                    className={styles.shiftCard}
                    style={{ background: c.bg, borderColor: c.border }}
                  >
                    <div className={styles.shiftAccent} style={{ background: c.border }} />
                    <div className={styles.shiftMain}>
                      <div className={styles.shiftTop}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.border} strokeWidth="2" strokeLinecap="round">
                          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span className={styles.shiftTime}>{shift.start}–{shift.end}</span>
                        <span className={styles.shiftDuration}>
                          ({Math.round(parseInt(shift.end) - parseInt(shift.start))}h)
                        </span>
                      </div>
                      <div className={styles.shiftBottom}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c.border} strokeWidth="2" strokeLinecap="round">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                        </svg>
                        <span className={styles.shiftSection}>{shift.section}</span>
                        {shift.employee ? (
                          <span className={styles.shiftEmployee}>&middot; {shift.employee}</span>
                        ) : (
                          <span className={styles.shiftUnassigned}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8B6B1A" strokeWidth="2" strokeLinecap="round">
                              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                            </svg>
                            Unassigned
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={styles.shiftRole} style={{ color: c.roleColor }}>{shift.role}</span>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <BottomNav role="manager" />

      {/* Add Shift Modal */}
      {showModal && (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className={styles.modalSheet}>
            <div className={styles.handle} />
            <h2 className={styles.modalTitle}>Add Shift Manually</h2>

            <div className={styles.formRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Date</label>
                <input className={styles.fieldInput} type="date" value={shiftDate} onChange={e => setShiftDate(e.target.value)} />
              </div>
            </div>

            <div className={[styles.formRow, styles.formRow2].join(' ')}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Start</label>
                <div className={styles.selectWrap}>
                  <select className={styles.fieldSelect} value={shiftStart} onChange={e => setShiftStart(e.target.value)}>
                    {START_TIMES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>End</label>
                <div className={styles.selectWrap}>
                  <select className={styles.fieldSelect} value={shiftEnd} onChange={e => setShiftEnd(e.target.value)}>
                    {END_TIMES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className={[styles.formRow, styles.formRow2].join(' ')}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Section</label>
                <div className={styles.selectWrap}>
                  <select className={styles.fieldSelect} value={shiftSection} onChange={e => setShiftSection(e.target.value)}>
                    {SECTIONS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Role</label>
                <div className={styles.selectWrap}>
                  <select className={styles.fieldSelect} value={shiftRole} onChange={e => setShiftRole(e.target.value)}>
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Assign Employee</label>
                <div className={styles.selectWrap}>
                  <select className={styles.fieldSelect} value={shiftEmployee} onChange={e => setShiftEmployee(e.target.value)}>
                    {EMPLOYEES.map(e => <option key={e}>{e}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <button className={styles.saveBtn} onClick={() => { if (shiftDate) setShowModal(false); }}>
              Add Shift
            </button>
          </div>
        </div>
      )}
    </PhoneShell>
  );
}
