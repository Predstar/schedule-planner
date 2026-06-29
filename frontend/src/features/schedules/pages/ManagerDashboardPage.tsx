import { useState, useEffect, useCallback } from 'react';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import { StatusBar } from '../../../shared/components/StatusBar';
import { BottomNav } from '../../../shared/components/BottomNav';
import { listShifts, createShift } from '../../shifts/services/shifts.service';
import { getWeeklyAvailability } from '../../availability/services/availability.service';
import { listEmployees } from '../../employees/services/employees.service';
import type { Shift, AvailabilityResponse, Employee } from '../../../shared/types/api.types';
import styles from './ManagerDashboardPage.module.css';

const MONTHS    = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_S  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const ROLES     = ['WAITER','RUNNER','BARTENDER'] as const;
const START_TIMES = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];
const END_TIMES   = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00'];

const ROLE_COLOR: Record<string, { bg: string; border: string; roleColor: string }> = {
  WAITER:    { bg:'#EEF4FF', border:'#6B8FD4', roleColor:'#2F4FA8' },
  RUNNER:    { bg:'#F0FDF4', border:'#4BAD72', roleColor:'#166534' },
  BARTENDER: { bg:'#F5F0FF', border:'#9B7FD4', roleColor:'#5B21B6' },
};

const AVAIL_COLORS = [
  { bg:'#EEF4FF', border:'#6B8FD4', text:'#2F4FA8', dot:'#6B8FD4' },
  { bg:'#F0FDF4', border:'#4BAD72', text:'#166534', dot:'#4BAD72' },
  { bg:'#F5F0FF', border:'#9B7FD4', text:'#5B21B6', dot:'#9B7FD4' },
  { bg:'#FFF8EC', border:'#F5DFB0', text:'#8B6B1A', dot:'#F5DFB0' },
  { bg:'#FFF1F2', border:'#FDA4AF', text:'#9F1239', dot:'#FDA4AF' },
];

function padDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

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

function shiftsByDate(shifts: Shift[]): Record<string, Shift[]> {
  const map: Record<string, Shift[]> = {};
  for (const s of shifts) { (map[s.date] ??= []).push(s); }
  return map;
}

type Tab = 'schedule' | 'availability';

export function ManagerDashboardPage() {
  const today = new Date();
  const [tab, setTab] = useState<Tab>('schedule');

  // ── Schedule tab state ──
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [shifts,   setShifts]   = useState<Shift[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [showModal,    setShowModal]    = useState(false);
  const [shiftDate,    setShiftDate]    = useState('');
  const [shiftStart,   setShiftStart]   = useState('09:00');
  const [shiftEnd,     setShiftEnd]     = useState('17:00');
  const [shiftRole,    setShiftRole]    = useState<typeof ROLES[number]>('WAITER');
  const [requiredCount, setRequiredCount] = useState(1);

  // ── Availability tab state ──
  const monday = getMondayOf(today);
  const weekStartDate = toIso(monday);
  const weekEnd = new Date(monday);
  weekEnd.setDate(monday.getDate() + 6);
  const weekLabel = `${MONTHS_S[monday.getMonth()]} ${monday.getDate()}–${MONTHS_S[weekEnd.getMonth()]} ${weekEnd.getDate()}, ${monday.getFullYear()}`;

  const [availabilities, setAvailabilities] = useState<AvailabilityResponse[]>([]);
  const [availLoading,   setAvailLoading]   = useState(false);
  const [availError,     setAvailError]     = useState<string | null>(null);
  const [selectedAvailDay, setSelectedAvailDay] = useState<string | null>(null);
  const [employeeMap,    setEmployeeMap]    = useState<Record<string, Employee>>({});

  // ── Fetch shifts ──
  const fetchShifts = useCallback(async (year: number, month: number) => {
    setLoading(true); setError(null);
    try {
      const from = padDate(year, month, 1);
      const to   = padDate(year, month, new Date(year, month + 1, 0).getDate());
      setShifts(await listShifts(from, to));
    } catch {
      setShifts([]);
      setError('Could not load shifts — backend offline.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchShifts(viewYear, viewMonth); }, [viewYear, viewMonth, fetchShifts]);

  // ── Fetch availability + employee names when tab opens ──
  useEffect(() => {
    if (tab !== 'availability') return;
    setAvailLoading(true); setAvailError(null);
    Promise.all([
      getWeeklyAvailability(weekStartDate),
      listEmployees(),
    ])
      .then(([avails, emps]) => {
        setAvailabilities(avails);
        setEmployeeMap(Object.fromEntries(emps.map(e => [e.id, e])));
      })
      .catch(() => setAvailError('Could not load availability — backend offline.'))
      .finally(() => setAvailLoading(false));
  }, [tab, weekStartDate]);

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
    setShiftDate(padDate(viewYear, viewMonth, d));
    setShowModal(true);
  }

  async function handleSave() {
    if (!shiftDate) return;
    setSaving(true);
    try {
      await createShift({ date: shiftDate, startTime: shiftStart, endTime: shiftEnd, employeeRole: shiftRole, requiredCount });
      setShowModal(false);
      await fetchShifts(viewYear, viewMonth);
    } catch { setError('Failed to save shift.'); }
    finally { setSaving(false); }
  }

  const cells   = buildCalendar(viewYear, viewMonth);
  const byDate  = shiftsByDate(shifts);
  const openShiftCount = shifts.filter(s => s.requiredCount > 0).length;
  const selectedDateKey = selectedDay ? padDate(viewYear, viewMonth, selectedDay) : null;
  const dayShifts = selectedDateKey ? (byDate[selectedDateKey] ?? []) : [];
  const dayLabel  = selectedDay
    ? (() => { const dow = new Date(viewYear, viewMonth, selectedDay).getDay(); return `${DAYS_LONG[dow]}, ${MONTHS[viewMonth]} ${selectedDay}, ${viewYear}`; })()
    : null;

  // ── Availability helpers ──
  // Build list of week days for the availability tab
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { iso: toIso(d), label: `${['Mo','Tu','We','Th','Fr','Sa','Su'][i]} ${d.getDate()}` };
  });

  // For the selected day, collect all (employee, slots) pairs
  const availForDay: Array<{ employeeId: string; slots: string[] }> = selectedAvailDay
    ? availabilities.map(a => ({
        employeeId: a.employeeId,
        slots: a.entries
          .filter(e => e.date === selectedAvailDay && e.available)
          .map(e => `${e.startTime}–${e.endTime}`),
      })).filter(x => x.slots.length > 0)
    : [];

  return (
    <PhoneShell>
      <StatusBar />

      <div className={styles.body}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Schedule</h1>
            <p className={styles.subtitle}>Shift management</p>
          </div>
          {tab === 'schedule' && (
            <button className={styles.addBtn} onClick={openModal}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Shift
            </button>
          )}
        </div>

        {/* Tab switcher */}
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          {(['schedule','availability'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex:1, padding:'9px 0', borderRadius:11, border:'1.5px solid',
                borderColor: tab === t ? 'var(--accent)' : 'var(--border-light)',
                background: tab === t ? 'var(--accent)' : 'var(--card)',
                color: tab === t ? '#FAF6F0' : 'var(--text-sub)',
                fontFamily:'Inter,sans-serif', fontSize:13, fontWeight:700, cursor:'pointer',
                textTransform:'capitalize', transition:'all 0.15s',
              }}
            >
              {t === 'schedule' ? 'Shifts' : 'Availability'}
            </button>
          ))}
        </div>

        {error && <div className={styles.noShifts} style={{ color:'#B91C1C' }}>{error}</div>}

        {/* ─── SCHEDULE TAB ─── */}
        {tab === 'schedule' && (
          <>
            {/* Stat cards */}
            <div className={styles.statGrid}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{loading ? '—' : shifts.length}</div>
                <div className={styles.statLabel}>Total Shifts</div>
              </div>
              <div className={[styles.statCard, styles.statWarm].join(' ')}>
                <div className={[styles.statValue, styles.statValueWarm].join(' ')}>{loading ? '—' : openShiftCount}</div>
                <div className={styles.statLabel}>Open Shifts</div>
              </div>
              <div className={[styles.statCard, styles.statCool].join(' ')}>
                <div className={[styles.statValue, styles.statValueCool].join(' ')}>—</div>
                <div className={styles.statLabel}>Swap Requests</div>
              </div>
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
                  const isCurr = cell.type === 'curr';
                  const todayObj = new Date();
                  const isToday = isCurr && cell.day === todayObj.getDate() && viewMonth === todayObj.getMonth() && viewYear === todayObj.getFullYear();
                  const isSelected = isCurr && cell.day === selectedDay;
                  const dateKey = padDate(viewYear, viewMonth, cell.day);
                  const hasDot = isCurr && (byDate[dateKey]?.length ?? 0) > 0;
                  return (
                    <div
                      key={i}
                      className={[styles.calCell, !isCurr ? styles.calCellOther : '', isToday ? styles.calCellToday : '', isSelected && !isToday ? styles.calCellSelected : ''].join(' ')}
                      onClick={() => isCurr && setSelectedDay(prev => prev === cell.day ? null : cell.day)}
                    >
                      {cell.day}
                      {hasDot && <span className={[styles.calDot, isToday ? styles.calDotToday : ''].join(' ')} />}
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
                  dayShifts.map(shift => {
                    const c = ROLE_COLOR[shift.employeeRole] ?? ROLE_COLOR['WAITER'];
                    const startH = parseInt(shift.startTime);
                    const endH   = parseInt(shift.endTime);
                    return (
                      <div key={shift.id} className={styles.shiftCard} style={{ background:c.bg, borderColor:c.border }}>
                        <div className={styles.shiftAccent} style={{ background:c.border }} />
                        <div className={styles.shiftMain}>
                          <div className={styles.shiftTop}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={c.border} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            <span className={styles.shiftTime}>{shift.startTime}–{shift.endTime}</span>
                            <span className={styles.shiftDuration}>({endH - startH}h)</span>
                          </div>
                          <div className={styles.shiftBottom}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c.border} strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
                            <span className={styles.shiftSection}>×{shift.requiredCount} needed</span>
                            <span className={styles.shiftUnassigned}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8B6B1A" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                              Unassigned
                            </span>
                          </div>
                        </div>
                        <span className={styles.shiftRole} style={{ color:c.roleColor }}>{shift.employeeRole}</span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}

        {/* ─── AVAILABILITY TAB ─── */}
        {tab === 'availability' && (
          <>
            {/* Week label + refresh */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text)' }}>Week of {weekLabel}</div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                  {availLoading ? 'Loading…' : `${availabilities.length} employee${availabilities.length !== 1 ? 's' : ''} submitted`}
                </div>
              </div>
              <button
                onClick={() => {
                  setAvailLoading(true); setAvailError(null);
                  getWeeklyAvailability(weekStartDate)
                    .then(setAvailabilities)
                    .catch(() => setAvailError('Could not load availability.'))
                    .finally(() => setAvailLoading(false));
                }}
                style={{ background:'var(--card)', border:'1.5px solid var(--border-light)', borderRadius:10, padding:'7px 12px', fontSize:12, fontWeight:700, color:'var(--accent)', cursor:'pointer', fontFamily:'Inter,sans-serif' }}
              >
                Refresh
              </button>
            </div>

            {availError && (
              <div style={{ background:'#FEF2F2', border:'1.5px solid #FCA5A5', borderRadius:12, padding:'12px 14px', fontSize:13, color:'#991B1B', marginBottom:14 }}>
                {availError}
              </div>
            )}

            {!availLoading && availabilities.length === 0 && !availError && (
              <div style={{ background:'var(--card)', border:'1.5px solid var(--border-light)', borderRadius:14, padding:'24px 16px', textAlign:'center' }}>
                <div style={{ fontSize:28, marginBottom:8 }}>📋</div>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--text)', marginBottom:4 }}>No availability yet</div>
                <div style={{ fontSize:12, color:'var(--text-muted)' }}>Employees haven't submitted for this week.</div>
              </div>
            )}

            {/* Day selector strip */}
            {availabilities.length > 0 && (
              <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:4, marginBottom:14, scrollbarWidth:'none' }}>
                {weekDays.map(wd => {
                  const hasAny = availabilities.some(a => a.entries.some(e => e.date === wd.iso && e.available));
                  const isSelected = selectedAvailDay === wd.iso;
                  return (
                    <button
                      key={wd.iso}
                      onClick={() => setSelectedAvailDay(prev => prev === wd.iso ? null : wd.iso)}
                      style={{
                        flex:'0 0 auto', padding:'8px 12px', borderRadius:10, border:'1.5px solid',
                        borderColor: isSelected ? 'var(--accent)' : hasAny ? 'var(--border)' : 'var(--border-light)',
                        background: isSelected ? 'var(--accent)' : hasAny ? 'var(--card)' : 'var(--surface)',
                        color: isSelected ? '#FAF6F0' : hasAny ? 'var(--text)' : 'var(--text-muted)',
                        fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'Inter,sans-serif',
                        position:'relative', transition:'all 0.15s',
                      }}
                    >
                      {wd.label}
                      {hasAny && !isSelected && (
                        <span style={{ position:'absolute', top:4, right:4, width:5, height:5, borderRadius:'50%', background:'var(--accent)' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Per-employee cards */}
            {availabilities.length > 0 && !selectedAvailDay && availabilities.map((a, idx) => {
              const color = AVAIL_COLORS[idx % AVAIL_COLORS.length];
              const totalSlots = a.entries.filter(e => e.available).length;
              const days = [...new Set(a.entries.filter(e => e.available).map(e => e.date))].length;
              return (
                <div
                  key={a.id}
                  style={{ background:color.bg, border:`1.5px solid ${color.border}`, borderRadius:14, padding:'14px 16px', marginBottom:10 }}
                >
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:color.text }}>
                        {employeeMap[a.employeeId] ? `${employeeMap[a.employeeId].firstName} ${employeeMap[a.employeeId].lastName}` : `ID ${a.employeeId.slice(0, 8)}…`}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>
                        {days} day{days !== 1 ? 's' : ''} · {totalSlots} slot{totalSlots !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <span style={{ fontSize:11, fontWeight:700, color:color.text, background:'#fff', border:`1px solid ${color.border}`, borderRadius:8, padding:'3px 8px' }}>
                      SUBMITTED
                    </span>
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {a.entries.filter(e => e.available).map((e, ei) => (
                      <span
                        key={ei}
                        style={{ fontSize:11, fontWeight:600, color:color.text, background:'#fff', border:`1px solid ${color.border}`, borderRadius:8, padding:'4px 8px' }}
                      >
                        {e.date.slice(5)} {e.startTime}–{e.endTime}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Day drill-down view */}
            {selectedAvailDay && (
              <>
                <div style={{ fontSize:14, fontWeight:700, color:'var(--accent)', fontFamily:"'Playfair Display',Georgia,serif", marginBottom:12 }}>
                  {DAYS_LONG[new Date(selectedAvailDay).getDay()]}, {MONTHS_S[new Date(selectedAvailDay).getMonth()]} {new Date(selectedAvailDay).getDate()}
                </div>
                {availForDay.length === 0 ? (
                  <div style={{ background:'var(--card)', border:'1.5px solid var(--border-light)', borderRadius:14, padding:'20px 16px', textAlign:'center', fontSize:13, color:'var(--text-muted)' }}>
                    No one available this day.
                  </div>
                ) : (
                  availForDay.map((a, idx) => {
                    const color = AVAIL_COLORS[idx % AVAIL_COLORS.length];
                    return (
                      <div
                        key={a.employeeId}
                        style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:color.bg, border:`1.5px solid ${color.border}`, borderRadius:12, padding:'12px 14px', marginBottom:8 }}
                      >
                        <div style={{ fontSize:13, fontWeight:700, color:color.text }}>
                          {employeeMap[a.employeeId] ? `${employeeMap[a.employeeId].firstName} ${employeeMap[a.employeeId].lastName}` : `ID ${a.employeeId.slice(0, 8)}…`}
                        </div>
                        <div style={{ display:'flex', gap:6 }}>
                          {a.slots.map(s => (
                            <span key={s} style={{ fontSize:11, fontWeight:700, color:color.text, background:'#fff', border:`1px solid ${color.border}`, borderRadius:8, padding:'3px 8px' }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </>
            )}
          </>
        )}

        <div style={{ height: 80 }} />
      </div>

      <BottomNav role="manager" />

      {/* Add Shift Modal */}
      {showModal && (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className={styles.modalSheet}>
            <div className={styles.handle} />
            <h2 className={styles.modalTitle}>Add Shift</h2>
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
                <label className={styles.fieldLabel}>Role</label>
                <div className={styles.selectWrap}>
                  <select className={styles.fieldSelect} value={shiftRole} onChange={e => setShiftRole(e.target.value as typeof ROLES[number])}>
                    {ROLES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Required #</label>
                <input
                  className={styles.fieldInput}
                  type="number" min={1} max={20}
                  value={requiredCount}
                  onChange={e => setRequiredCount(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            </div>
            <button className={styles.saveBtn} onClick={handleSave} disabled={!shiftDate || saving}>
              {saving ? 'Saving…' : 'Add Shift'}
            </button>
          </div>
        </div>
      )}
    </PhoneShell>
  );
}
