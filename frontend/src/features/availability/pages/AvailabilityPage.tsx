import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import { StatusBar } from '../../../shared/components/StatusBar';
import { BottomNav } from '../../../shared/components/BottomNav';
import { Spinner } from '../../../shared/components/Spinner';
import { AddShiftModal } from '../../../shared/components/AddShiftModal';
import { getStoredUser } from '../../auth/services/auth.service';
import { listEmployees, getEmployee } from '../../employees/services/employees.service';
import {
  getWeeklyAvailability,
  submitAvailability,
  updateAvailability,
  getEmployeeAvailability,
} from '../services/availability.service';
import { getWeeklySchedule, approveSchedule, autoGenerateSchedule } from '../../schedules/services/schedules.service';
import type { AvailabilityResponse, Employee, Assignment, Schedule } from '../../../shared/types/api.types';
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

// Must match the shiftTemplates in backend schedules.service.ts exactly (per role,
// first/second shift), since the solver only assigns someone to a shift if their
// submitted availability window fully covers it.
const ROLE_SHIFT_SLOTS: Record<string, { label: string; startTime: string; endTime: string }[]> = {
  WAITER:    [{ label: 'Morning Shift', startTime: '10:00', endTime: '17:00' }, { label: 'Evening Shift', startTime: '17:00', endTime: '23:00' }],
  RUNNER:    [{ label: 'Morning Shift', startTime: '12:00', endTime: '16:00' }, { label: 'Evening Shift', startTime: '18:00', endTime: '22:00' }],
  BARTENDER: [{ label: 'Morning Shift', startTime: '10:00', endTime: '17:00' }, { label: 'Evening Shift', startTime: '16:30', endTime: '23:00' }],
};
const DEFAULT_SHIFT_SLOTS = ROLE_SHIFT_SLOTS.WAITER;

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

function formatDayLabel(isoDate: string): { short: string; date: string } {
  const d = new Date(isoDate + 'T00:00:00');
  return {
    short: d.toLocaleDateString('en-GB', { weekday: 'short' }),
    date:  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
  };
}

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

function applyAvailabilityToDays(
  template: DaySlot[],
  existing: AvailabilityResponse | null,
  shiftSlots: { startTime: string; endTime: string }[],
): DaySlot[] {
  if (!existing) return template;

  return template.map((day) => {
    const morningEntry = existing.entries.find(
      (entry) => entry.date === day.isoDate && entry.startTime === shiftSlots[0].startTime,
    );
    const eveningEntry = existing.entries.find(
      (entry) => entry.date === day.isoDate && entry.startTime === shiftSlots[1].startTime,
    );

    return {
      ...day,
      morning: morningEntry?.available ?? false,
      evening: eveningEntry?.available ?? false,
    };
  });
}

const BERLIN_TIMEZONE = 'Europe/Berlin';

/** Current wall-clock time in Berlin, as a UTC-equivalent Date for arithmetic. */
function nowInBerlin(): Date {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BERLIN_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value);
  return new Date(Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')));
}

/**
 * Hours until the availability deadline: start of day, 2 days before `monday`
 * (Berlin time) — must match the backend's ensureEmployeeDeadline exactly,
 * since that's the source of truth for whether a submission is accepted.
 */
function hoursUntilDeadline(monday: Date): number {
  const deadline = new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate() - 2));
  const diffMs = deadline.getTime() - nowInBerlin().getTime();
  return Math.max(0, Math.floor(diffMs / 3600000));
}

function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
}

/** ISO-8601 week number for the week containing `date`. */
function getIsoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function AvailabilityPage({ role }: Props) {
  const isManager = role === 'manager';
  const [monday, setMonday] = useState<Date>(() => getMondayOf(new Date()));
  const weekStartDate = toIso(monday);
  const weekEnd = new Date(monday);
  weekEnd.setDate(monday.getDate() + 6);
  const [showAddShift, setShowAddShift] = useState(false);
  const todayIso = toIso(new Date());

  function prevWeek() { setMonday((d) => addDays(d, -7)); }
  function nextWeek() { setMonday((d) => addDays(d, 7)); }

  const weekLabel = `${toDisplay(monday)}–${toDisplay(weekEnd)}, ${monday.getFullYear()}`;
  const hoursLeft = hoursUntilDeadline(monday);
  const deadlinePassed = hoursLeft <= 0;

  const [days, setDays] = useState<DaySlot[]>(() => buildWeekDaysFromWeekStart(weekStartDate));
  const [existingId, setExistingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'availability' | 'scheduleTable'>('availability');
  const [approving, setApproving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [scheduleToast, setScheduleToast] = useState('');

  const storedUser = getStoredUser();
  const queryClient = useQueryClient();

  const managerListQuery = useQuery({
    queryKey: ['employees', { active: true }],
    queryFn: () => listEmployees({ active: true }),
    enabled: isManager,
  });
  const employees = managerListQuery.data ?? [];

  const weeklyAvailabilityQuery = useQuery({
    queryKey: ['weekly-availability', weekStartDate],
    queryFn: () => getWeeklyAvailability(weekStartDate),
    enabled: isManager,
  });
  const weeklyAvailability = weeklyAvailabilityQuery.data ?? [];

  // Keep the selected employee valid as the roster loads/changes.
  useEffect(() => {
    if (!isManager || !employees.length) return;
    setSelectedEmployeeId((current) =>
      current && employees.some((e) => e.id === current) ? current : employees[0]?.id ?? '',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isManager, employees.map((e) => e.id).join(',')]);

  const employeeId = isManager ? (selectedEmployeeId || null) : (storedUser?.employeeId ?? null);
  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId) ?? null;
  const submittedCount = new Set(weeklyAvailability.map((availability) => availability.employeeId)).size;
  const canEdit = Boolean(employeeId) && (isManager || !deadlinePassed);

  const myEmployeeQuery = useQuery({
    queryKey: ['employee', storedUser?.employeeId],
    queryFn: () => getEmployee(storedUser!.employeeId!),
    enabled: !isManager && Boolean(storedUser?.employeeId),
  });
  const myEmployee = myEmployeeQuery.data ?? null;

  const activeEmployeeRole = (isManager ? selectedEmployee?.employeeRole : myEmployee?.employeeRole) ?? null;
  const shiftSlots = activeEmployeeRole ? ROLE_SHIFT_SLOTS[activeEmployeeRole] ?? DEFAULT_SHIFT_SLOTS : DEFAULT_SHIFT_SLOTS;

  const employeeAvailabilityQuery = useQuery({
    queryKey: ['employee-availability', employeeId, weekStartDate],
    queryFn: () => getEmployeeAvailability(employeeId!, weekStartDate),
    enabled: Boolean(employeeId),
  });
  const loading = isManager
    ? managerListQuery.isLoading || weeklyAvailabilityQuery.isLoading || (Boolean(employeeId) && employeeAvailabilityQuery.isLoading)
    : employeeAvailabilityQuery.isLoading;

  // days/existingId/saved mirror editable form state seeded from the loaded
  // availability — re-sync whenever the underlying week/employee/data changes.
  useEffect(() => {
    if (!employeeId) {
      setDays(buildWeekDaysFromWeekStart(weekStartDate));
      setExistingId(null);
      setSaved(false);
      return;
    }
    if (employeeAvailabilityQuery.isLoading) return;

    const existing = employeeAvailabilityQuery.data ?? null;
    setExistingId(existing?.id ?? null);
    setSaved(Boolean(existing));
    setDays(applyAvailabilityToDays(buildWeekDaysFromWeekStart(weekStartDate), existing, shiftSlots));
  }, [employeeId, weekStartDate, shiftSlots, employeeAvailabilityQuery.data, employeeAvailabilityQuery.isLoading]);

  useEffect(() => {
    if (managerListQuery.isError || weeklyAvailabilityQuery.isError) {
      setError('Failed to load employees or weekly availability. Try again.');
    } else if (employeeAvailabilityQuery.isError) {
      setError(isManager ? 'Failed to load employee availability. Try again.' : 'Failed to load your availability. Try again.');
    }
  }, [managerListQuery.isError, weeklyAvailabilityQuery.isError, employeeAvailabilityQuery.isError, isManager]);

  const scheduleQuery = useQuery({
    queryKey: ['weekly-schedule', weekStartDate],
    queryFn: () => getWeeklySchedule(weekStartDate),
    enabled: isManager && activeTab === 'scheduleTable',
  });
  const schedule = scheduleQuery.data ?? null;
  const scheduleLoading = scheduleQuery.isLoading;
  const [scheduleActionError, setScheduleActionError] = useState<string | null>(null);
  const scheduleError = scheduleActionError ?? (scheduleQuery.isError ? 'Failed to load the weekly schedule. Try again.' : null);

  const scheduleAssignments: Assignment[] = schedule?.assignments ?? [];
  const weekDates = days.map(d => d.isoDate);

  type EmpRow = { name: string; role: string; days: Record<string, Assignment[]> };
  const empMap: Record<string, EmpRow> = {};
  for (const a of scheduleAssignments) {
    if (!empMap[a.employeeId]) {
      empMap[a.employeeId] = { name: a.employeeName, role: a.employeeRole, days: {} };
    }
    if (!empMap[a.employeeId].days[a.date]) empMap[a.employeeId].days[a.date] = [];
    empMap[a.employeeId].days[a.date].push(a);
  }
  const scheduleRows = Object.entries(empMap);

  function exportSchedulePDF() {
    // Single combined table across all roles — rows are time bands (grouped
    // purely by startTime/endTime, so whatever actual shift times exist that
    // week show up, including custom manager-added ones), columns are days,
    // cells stack the names working that time band. No role grouping/labels.
    type SlotRow = { startTime: string; endTime: string; days: Record<string, string[]> };
    const slotMap: Record<string, SlotRow> = {};
    for (const a of scheduleAssignments) {
      const key = `${a.startTime}|${a.endTime}`;
      if (!slotMap[key]) {
        slotMap[key] = { startTime: a.startTime, endTime: a.endTime, days: {} };
      }
      (slotMap[key].days[a.date] ??= []).push(a.employeeName);
    }
    const rows = Object.values(slotMap).sort((a, b) => a.startTime.localeCompare(b.startTime));

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 10;
    const headerOrange: [number, number, number] = [237, 125, 49];
    const headerRowOrange: [number, number, number] = [244, 176, 132];
    const nameColW = 28;
    const dayColW = (pageW - margin * 2 - nameColW) / 7;
    const lineH = 4;
    const rowPadding = 3;

    function drawPageHeader(): number {
      doc.setFillColor(...headerOrange);
      doc.rect(margin, 10, pageW - margin * 2, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text(`Authentikka Mitte Service Plan — KW${getIsoWeekNumber(monday)} (${weekLabel})`, pageW / 2, 17, { align: 'center' });

      let y = 24;
      doc.setFillColor(...headerRowOrange);
      doc.rect(margin, y, pageW - margin * 2, 8, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(90, 45, 10);
      doc.text('Shift / Time', margin + 2, y + 5.5);
      weekDates.forEach((date, i) => {
        const lbl = formatDayLabel(date);
        doc.text(`${lbl.short} ${lbl.date}`, margin + nameColW + dayColW * i + dayColW / 2, y + 5.5, { align: 'center' });
      });
      y += 8;
      return y;
    }

    function drawFooter() {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(150, 150, 150);
      doc.text('Authentikka Shift Management · Confidential', pageW / 2, pageH - 6, { align: 'center' });
    }

    let y = drawPageHeader();

    if (rows.length === 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text('No shifts scheduled for this week.', pageW / 2, y + 14, { align: 'center' });
    }

    rows.forEach((row, idx) => {
      const maxNames = Math.max(1, ...weekDates.map(d => (row.days[d] ?? []).length));
      const rowHeight = rowPadding * 2 + maxNames * lineH;
      const textY = y + rowPadding + lineH - 1.2; // baseline for the first line, vertically centered

      if (y + rowHeight > pageH - 14) {
        doc.addPage();
        y = drawPageHeader();
      }

      if (idx % 2 === 0) {
        doc.setFillColor(253, 245, 235);
        doc.rect(margin, y, pageW - margin * 2, rowHeight, 'F');
      }

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(90, 45, 10);
      doc.text(`${row.startTime} - ${row.endTime}`, margin + 2, textY);

      doc.setFontSize(7.5);
      weekDates.forEach((date, i) => {
        const names = row.days[date] ?? [];
        const x = margin + nameColW + dayColW * i + dayColW / 2;
        if (names.length === 0) {
          doc.setTextColor(215, 205, 195);
          doc.setFont('helvetica', 'normal');
          doc.text('—', x, textY, { align: 'center' });
        } else {
          doc.setTextColor(28, 16, 7);
          doc.setFont('helvetica', 'normal');
          names.forEach((name, ni) => doc.text(name, x, textY + ni * lineH, { align: 'center' }));
        }
      });

      doc.setDrawColor(235, 215, 195);
      doc.setLineWidth(0.15);
      doc.line(margin, y + rowHeight, pageW - margin, y + rowHeight);
      y += rowHeight;
    });

    drawFooter();

    doc.save(`Authentikka_Schedule_KW${getIsoWeekNumber(monday)}_${weekStartDate}.pdf`);
  }

  async function handleApproveSchedule() {
    if (!schedule) return;
    setApproving(true);
    setScheduleActionError(null);
    try {
      const updated = await approveSchedule(schedule.id);
      queryClient.setQueryData(['weekly-schedule', weekStartDate], updated);
    } catch (e: unknown) {
      setScheduleActionError((e as { message?: string })?.message ?? 'Approve failed');
    } finally {
      setApproving(false);
    }
  }

  async function handleGenerateSchedule() {
    setGenerating(true);
    setScheduleActionError(null);
    try {
      const s = await autoGenerateSchedule(weekStartDate);
      queryClient.setQueryData(['weekly-schedule', weekStartDate], s);
      setScheduleToast(`Schedule generated — ${s.assignments.length} assignment${s.assignments.length !== 1 ? 's' : ''} created`);
      setTimeout(() => setScheduleToast(''), 3000);
    } catch (e: unknown) {
      setScheduleActionError((e as { message?: string })?.message ?? 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  function toggle(index: number, slot: 'morning' | 'evening') {
    if (!canEdit) return;
    setDays(prev => prev.map((d, i) => i === index ? { ...d, [slot]: !d[slot] } : d));
    setSaved(false);
  }

  async function handleSubmit() {
    if (!employeeId) { setError('No employee account linked to this login.'); return; }

    const entries = days.flatMap(day => {
      const result = [];
      if (day.morning) result.push({ date: day.isoDate, startTime: shiftSlots[0].startTime, endTime: shiftSlots[0].endTime, available: true, preferred: false });
      if (day.evening) result.push({ date: day.isoDate, startTime: shiftSlots[1].startTime, endTime: shiftSlots[1].endTime, available: true, preferred: false });
      return result;
    });

    setSaving(true);
    setError(null);
    try {
      if (existingId) {
        await updateAvailability(existingId, { entries });
      } else {
        const res = await submitAvailability({ employeeId, weekStartDate, entries });
        setExistingId(res.id);
      }
      queryClient.invalidateQueries({ queryKey: ['employee-availability', employeeId, weekStartDate] });
      if (isManager) {
        queryClient.invalidateQueries({ queryKey: ['weekly-availability', weekStartDate] });
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

  const scheduleAssignmentCount = schedule?.assignments.length ?? 0;
  const canGenerateSchedule = !schedule
    || schedule.status === 'DRAFT'
    || schedule.status === 'REJECTED'
    || scheduleAssignmentCount === 0;

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

        <div className={styles.weekNav}>
          <button className={styles.navArrow} onClick={prevWeek} aria-label="Previous week">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <span className={styles.weekLabel}>{weekLabel}</span>
          <button className={styles.navArrow} onClick={nextWeek} aria-label="Next week">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {isManager && (
          <div className={styles.addShiftRow}>
            <button className={styles.addBtn} onClick={() => setShowAddShift(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Shift
            </button>
          </div>
        )}

        {isManager && (
          <div className={styles.tabRow}>
            <button
              className={[styles.tabBtn, activeTab === 'availability' ? styles.tabBtnActive : ''].join(' ')}
              onClick={() => setActiveTab('availability')}
            >
              Availability
            </button>
            <button
              className={[styles.tabBtn, activeTab === 'scheduleTable' ? styles.tabBtnActive : ''].join(' ')}
              onClick={() => setActiveTab('scheduleTable')}
            >
              Schedule Table
            </button>
          </div>
        )}

        {!employeeId && !isManager && (
          <div className={styles.capacityCard} style={{ borderColor: '#FCA5A5', background: '#FEF2F2' }}>
            <div className={styles.capacityTitle} style={{ color: '#991B1B' }}>No employee account linked</div>
            <div className={styles.capacityText}>Ask your manager to link this login to an employee profile.</div>
          </div>
        )}

        {isManager && activeTab === 'availability' && (
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

        {(!isManager || activeTab === 'availability') && (
          <>
            {/* Info card */}
            <div className={styles.capacityCard}>
              <div className={styles.capacityTitle}>{isManager ? 'Availability Legend' : 'Shift Times'}</div>
              <div className={styles.capacityRow}>
                <span>🌤</span>
                <span className={styles.capacityText}>{shiftSlots[0].label} — {shiftSlots[0].startTime} – {shiftSlots[0].endTime}</span>
              </div>
              <div className={styles.capacityRow}>
                <span>🌙</span>
                <span className={styles.capacityText}>{shiftSlots[1].label} — {shiftSlots[1].startTime} – {shiftSlots[1].endTime}</span>
              </div>
              {isManager && (
                <div className={styles.capacityText}>Managers can edit any employee's availability here, including after their submission deadline has passed.</div>
              )}
            </div>

            {isManager && error && (
              <div className={styles.capacityCard} style={{ borderColor: '#FCA5A5', background: '#FEF2F2' }}>
                <div className={styles.capacityTitle} style={{ color: '#991B1B' }}>Availability unavailable</div>
                <div className={styles.capacityText}>{error}</div>
              </div>
            )}

            {loading ? (
              <Spinner size="medium" label="Loading your availability…" />
            ) : (
              days.map((day, i) => (
                <div key={day.isoDate} className={styles.dayCard}>
                  <div className={styles.dayHeader}>
                    <span className={styles.dayName}>{day.dayName},</span>
                    <span className={styles.dayDate}>{day.displayDate}</span>
                  </div>
                  <div className={styles.shiftRow}>
                    {(['morning', 'evening'] as const).map((slot, slotIndex) => {
                      const isSelected = day[slot];
                      const label = shiftSlots[slotIndex].label;
                      const time  = `${shiftSlots[slotIndex].startTime} – ${shiftSlots[slotIndex].endTime}`;
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
          </>
        )}

        {isManager && activeTab === 'scheduleTable' && (
          <>
            <div className={styles.scheduleTableHeader}>
              {schedule?.status && (
                <span
                  className={styles.statusBadge}
                  style={{ background: STATUS_COLOR[schedule.status]?.bg, color: STATUS_COLOR[schedule.status]?.color }}
                >
                  {STATUS_LABEL[schedule.status]}
                </span>
              )}
              <div className={styles.scheduleTableActions}>
                {canGenerateSchedule && (
                  <button
                    className={styles.generateBtn}
                    onClick={handleGenerateSchedule}
                    disabled={generating}
                  >
                    {generating ? '…' : '⚙ Generate'}
                  </button>
                )}
                {schedule?.status === 'DRAFT' && (
                  <button
                    className={styles.approveBtn}
                    onClick={handleApproveSchedule}
                    disabled={approving}
                  >
                    {approving ? '…' : '✓ Approve'}
                  </button>
                )}
                <button
                  className={styles.exportBtn}
                  onClick={exportSchedulePDF}
                  disabled={scheduleRows.length === 0}
                  title={scheduleRows.length === 0 ? 'No schedule to export' : 'Export schedule as PDF'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="18" x2="12" y2="12"/>
                    <polyline points="9 15 12 18 15 15"/>
                  </svg>
                  Export as PDF
                </button>
              </div>
            </div>

            {scheduleToast && (
              <div className={styles.successMsg}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                {scheduleToast}
              </div>
            )}

            {scheduleError && (
              <div className={styles.capacityCard} style={{ borderColor: '#FCA5A5', background: '#FEF2F2' }}>
                <div className={styles.capacityTitle} style={{ color: '#991B1B' }}>Schedule unavailable</div>
                <div className={styles.capacityText}>{scheduleError}</div>
              </div>
            )}

            {scheduleLoading ? (
              <div className={styles.capacityCard}>
                <div className={styles.capacityText}>Loading weekly schedule…</div>
              </div>
            ) : scheduleRows.length === 0 ? (
              <div className={styles.capacityCard}>
                <div className={styles.capacityText}>
                  {schedule ? 'No shifts assigned for this week yet. Tap Generate to auto-assign.' : 'No schedule for this week yet. Tap Generate to create one.'}
                </div>
              </div>
            ) : (
              <>
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
                      {scheduleRows.map(([empId, row]) => {
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
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        <div style={{ height: 160 }} />
      </div>

      {(!isManager || activeTab === 'availability') && (
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
            className={[styles.submitBtn, !canEdit ? styles.submitBtnDisabled : ''].join(' ')}
            onClick={handleSubmit}
            disabled={!canEdit || saving}
          >
            {saving
              ? 'Saving…'
              : totalSelected === 0
                ? (existingId ? 'Update — Mark Unavailable' : 'Submit — Unavailable This Week')
                : existingId
                  ? `Update Availability (${totalSelected} slot${totalSelected !== 1 ? 's' : ''})`
                  : `Submit Availability (${totalSelected} slot${totalSelected !== 1 ? 's' : ''})`}
          </button>
        </div>
      )}

      <BottomNav role={role} />

      {showAddShift && (
        <AddShiftModal
          employees={employees}
          defaultDate={weekStartDate}
          todayIso={todayIso}
          onClose={() => setShowAddShift(false)}
          onSaved={(shiftWeekStart) => {
            queryClient.invalidateQueries({ queryKey: ['weekly-schedule', shiftWeekStart] });
            queryClient.invalidateQueries({ queryKey: ['shifts'] });
            setShowAddShift(false);
          }}
        />
      )}
    </PhoneShell>
  );
}
