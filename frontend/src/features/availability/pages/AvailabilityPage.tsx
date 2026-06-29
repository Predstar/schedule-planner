import { useState, useEffect } from 'react';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import { StatusBar } from '../../../shared/components/StatusBar';
import { BottomNav } from '../../../shared/components/BottomNav';
import { getStoredUser } from '../../auth/services/auth.service';
import { listEmployees } from '../../employees/services/employees.service';
import {
  getWeeklyAvailability,
  submitAvailability,
  updateAvailability,
  getEmployeeAvailability,
} from '../services/availability.service';
import type { AvailabilityResponse, Employee } from '../../../shared/types/api.types';
import styles from './AvailabilityPage.module.css';

type NavRole = 'manager' | 'employee';

interface Props {
  role: NavRole;
}

interface DaySlot {
  isoDate: string;   // "2026-06-23"
  dayName: string;   // "Monday"
  displayDate: string; // "Jun 23"
  morning: boolean;
  evening: boolean;
}

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

/** Returns the ISO date string for the Monday of the week containing `date`. */
function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function toDisplay(d: Date): string {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

function buildWeekDays(monday: Date): DaySlot[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      isoDate: toIso(d),
      dayName: DAY_NAMES[d.getDay()],
      displayDate: toDisplay(d),
      morning: false,
      evening: false,
    };
  });
}

function buildWeekDaysFromWeekStart(weekStartDate: string): DaySlot[] {
  return buildWeekDays(new Date(`${weekStartDate}T00:00:00`));
}

function applyAvailabilityToDays(template: DaySlot[], existing: AvailabilityResponse | null): DaySlot[] {
  if (!existing) return template;

  return template.map((day) => {
    const morningEntry = existing.entries.find(
      (entry) => entry.date === day.isoDate && entry.startTime === '11:00',
    );
    const eveningEntry = existing.entries.find(
      (entry) => entry.date === day.isoDate && entry.startTime === '17:00',
    );

    return {
      ...day,
      morning: morningEntry?.available ?? false,
      evening: eveningEntry?.available ?? false,
    };
  });
}

/** Hours until Friday 23:59 Berlin time (deadline = 2 days before Monday). */
function hoursUntilDeadline(monday: Date): number {
  const deadline = new Date(monday);
  deadline.setDate(monday.getDate() - 2); // Saturday
  deadline.setHours(23, 59, 0, 0);
  return Math.max(0, Math.floor((deadline.getTime() - Date.now()) / 3600000));
}

export function AvailabilityPage({ role }: Props) {
  const isManager = role === 'manager';
  const monday = getMondayOf(new Date());
  const weekStartDate = toIso(monday);
  const weekEnd = new Date(monday);
  weekEnd.setDate(monday.getDate() + 6);

  const weekLabel = `${toDisplay(monday)}–${toDisplay(weekEnd)}, ${monday.getFullYear()}`;
  const hoursLeft = hoursUntilDeadline(monday);
  const deadlinePassed = false; // TODO: remove — temporarily forced off for testing
  void hoursLeft;

  const initialDays = buildWeekDaysFromWeekStart(weekStartDate);
  const [days, setDays] = useState<DaySlot[]>(initialDays);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [weeklyAvailability, setWeeklyAvailability] = useState<AvailabilityResponse[]>([]);

  const storedUser = getStoredUser();
  const employeeId = isManager ? (selectedEmployeeId || null) : (storedUser?.employeeId ?? null);
  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId) ?? null;
  const submittedCount = new Set(weeklyAvailability.map((availability) => availability.employeeId)).size;
  const canEdit = Boolean(employeeId) && !isManager && !deadlinePassed;

  useEffect(() => {
    if (!isManager) return;

    setLoading(true);
    Promise.all([
      listEmployees({ active: true }),
      getWeeklyAvailability(weekStartDate),
    ])
      .then(([employeeList, availabilities]) => {
        setEmployees(employeeList);
        setWeeklyAvailability(availabilities);
        setSelectedEmployeeId((current) => {
          if (current && employeeList.some((employee) => employee.id === current)) {
            return current;
          }

          return employeeList[0]?.id ?? '';
        });
      })
      .catch(() => {
        setError('Failed to load employees or weekly availability. Try again.');
      })
      .finally(() => setLoading(false));
  }, [isManager, weekStartDate]);

  useEffect(() => {
    if (isManager || !storedUser?.employeeId) return;

    setLoading(true);
    setError(null);
    getEmployeeAvailability(storedUser.employeeId, weekStartDate)
      .then((existing: AvailabilityResponse | null) => {
        setExistingId(existing?.id ?? null);
        setSaved(Boolean(existing));
        setDays(applyAvailabilityToDays(buildWeekDaysFromWeekStart(weekStartDate), existing));
      })
      .catch(() => {
        setError('Failed to load your availability. Try again.');
      })
      .finally(() => setLoading(false));
  }, [isManager, storedUser?.employeeId, weekStartDate]);

  useEffect(() => {
    if (!isManager) return;

    setError(null);
    setExistingId(null);
    setSaved(false);
    setDays(buildWeekDaysFromWeekStart(weekStartDate));

    if (!employeeId) return;

    setLoading(true);
    getEmployeeAvailability(employeeId, weekStartDate)
      .then((existing: AvailabilityResponse | null) => {
        setExistingId(existing?.id ?? null);
        setSaved(Boolean(existing));
        setDays(applyAvailabilityToDays(buildWeekDaysFromWeekStart(weekStartDate), existing));
      })
      .catch(() => {
        setError('Failed to load employee availability. Try again.');
      })
      .finally(() => setLoading(false));
  }, [employeeId, isManager, weekStartDate]);

  function toggle(index: number, slot: 'morning' | 'evening') {
    if (!canEdit) return;
    setDays(prev => prev.map((d, i) => i === index ? { ...d, [slot]: !d[slot] } : d));
    setSaved(false);
  }

  async function handleSubmit() {
    if (!employeeId) { setError('No employee account linked to this login.'); return; }

    const entries = days.flatMap(day => {
      const result = [];
      if (day.morning) result.push({ date: day.isoDate, startTime: '11:00', endTime: '17:00', available: true, preferred: false });
      if (day.evening) result.push({ date: day.isoDate, startTime: '17:00', endTime: '23:00', available: true, preferred: false });
      return result;
    });

    if (entries.length === 0) return;

    setSaving(true);
    setError(null);
    try {
      if (existingId) {
        await updateAvailability(existingId, { entries });
      } else {
        const res = await submitAvailability({ employeeId, weekStartDate, entries });
        setExistingId(res.id);
      }
      if (isManager) {
        setWeeklyAvailability(await getWeeklyAvailability(weekStartDate));
      }
      setSaved(true);
    } catch (e: unknown) {
      const err = e as { message?: string; code?: string };
      if (err?.code === 'AVAILABILITY_DEADLINE_PASSED') {
        setError('The submission deadline for this week has passed.');
      } else {
        setError(err?.message ?? 'Failed to save availability. Try again.');
      }
    } finally {
      setSaving(false);
    }
  }

  const totalSelected = days.reduce((sum, d) => sum + (d.morning ? 1 : 0) + (d.evening ? 1 : 0), 0);

  return (
    <PhoneShell>
      <StatusBar />

      <div className={styles.body}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>{isManager ? 'Team Availability' : 'My Availability'}</h1>
            <p className={styles.subtitle}>Week of {weekLabel}</p>
          </div>
          {isManager && (
            <div className={styles.timerBadge}>
              {submittedCount}/{employees.length} submitted
            </div>
          )}
          {!isManager && !deadlinePassed && (
            <div className={styles.timerBadge}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              {hoursLeft}h left
            </div>
          )}
          {!isManager && deadlinePassed && (
            <div className={styles.timerBadge} style={{ background: '#FEE2E2', borderColor: '#FCA5A5', color: '#991B1B' }}>
              Deadline passed
            </div>
          )}
        </div>

        {!employeeId && !isManager && (
          <div className={styles.capacityCard} style={{ borderColor: '#FCA5A5', background: '#FEF2F2' }}>
            <div className={styles.capacityTitle} style={{ color: '#991B1B' }}>No employee account linked</div>
            <div className={styles.capacityText}>Ask your manager to link this login to an employee profile.</div>
          </div>
        )}

        {isManager && (
          <div className={styles.capacityCard}>
            <div className={styles.capacityTitle}>Employee</div>
            <label className={styles.selectLabel} htmlFor="availability-employee-select">
              Employee
            </label>
            <select
              id="availability-employee-select"
              className={styles.selectInput}
              value={selectedEmployeeId}
              onChange={(event) => setSelectedEmployeeId(event.target.value)}
            >
              {employees.length === 0 && <option value="">No active employees</option>}
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.firstName} {employee.lastName}
                </option>
              ))}
            </select>
            <div className={styles.capacityText}>View weekly availability for any active employee.</div>
            {selectedEmployee && (
              <div className={styles.capacityText}>
                {selectedEmployee.employeeRole} • {selectedEmployee.employmentType.toLowerCase().replace('_', ' ')}
              </div>
            )}
          </div>
        )}

        {/* Info card */}
        <div className={styles.capacityCard}>
          <div className={styles.capacityTitle}>{isManager ? 'Availability Legend' : 'Shift Times'}</div>
          <div className={styles.capacityRow}>
            <span>🌤</span>
            <span className={styles.capacityText}>Morning Shift — 11:00 – 17:00</span>
          </div>
          <div className={styles.capacityRow}>
            <span>🌙</span>
            <span className={styles.capacityText}>Evening Shift — 17:00 – 23:00</span>
          </div>
          {isManager && (
            <div className={styles.capacityText}>Managers can review availability here, but only employees can submit or update it.</div>
          )}
        </div>

        {isManager && error && (
          <div className={styles.capacityCard} style={{ borderColor: '#FCA5A5', background: '#FEF2F2' }}>
            <div className={styles.capacityTitle} style={{ color: '#991B1B' }}>Availability unavailable</div>
            <div className={styles.capacityText}>{error}</div>
          </div>
        )}

        {loading ? (
          <div className={styles.capacityCard}>
            <div className={styles.capacityText}>Loading your availability…</div>
          </div>
        ) : (
          days.map((day, i) => (
            <div key={day.isoDate} className={styles.dayCard}>
              <div className={styles.dayHeader}>
                <span className={styles.dayName}>{day.dayName},</span>
                <span className={styles.dayDate}>{day.displayDate}</span>
              </div>
              <div className={styles.shiftRow}>
                {(['morning', 'evening'] as const).map(slot => {
                  const isSelected = day[slot];
                  const label = slot === 'morning' ? 'Morning Shift' : 'Evening Shift';
                  const time  = slot === 'morning' ? '11:00 – 17:00' : '17:00 – 23:00';
                  return (
                    <button
                      key={slot}
                      className={[styles.shiftBtn, isSelected ? styles.shiftBtnSelected : ''].join(' ')}
                      onClick={() => toggle(i, slot)}
                      disabled={!canEdit}
                    >
                      <span className={styles.shiftBtnLabel}>{label}</span>
                      <span className={styles.shiftBtnTime}>{time}</span>
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
          ))
        )}

        <div style={{ height: 160 }} />
      </div>

      {!isManager && (
        <div className={styles.submitWrap}>
          {error && (
            <div className={styles.successMsg} style={{ background: '#FEF2F2', borderColor: '#FCA5A5', color: '#991B1B' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}
          {saved && !error && (
            <div className={styles.successMsg}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Availability saved — {totalSelected} slot{totalSelected !== 1 ? 's' : ''} selected
            </div>
          )}
          <button
            className={[styles.submitBtn, (totalSelected === 0 || !canEdit) ? styles.submitBtnDisabled : ''].join(' ')}
            onClick={handleSubmit}
            disabled={totalSelected === 0 || !canEdit || saving}
          >
            {saving
              ? 'Saving…'
              : existingId
                ? `Update Availability (${totalSelected} slot${totalSelected !== 1 ? 's' : ''})`
                : `Submit Availability${totalSelected > 0 ? ` (${totalSelected} slot${totalSelected !== 1 ? 's' : ''})` : ''}`}
          </button>
        </div>
      )}

      <BottomNav role={role} />
    </PhoneShell>
  );
}
