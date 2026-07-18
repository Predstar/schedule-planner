import { useState } from 'react';
import { createDraftSchedule, addAssignment, getWeeklySchedule } from '../../features/schedules/services/schedules.service';
import { createShift } from '../../features/shifts/services/shifts.service';
import type { Employee, EmployeeRole } from '../types/api.types';
import styles from './AddShiftModal.module.css';

const ROLES: EmployeeRole[] = ['WAITER', 'RUNNER', 'BARTENDER'];
const START_TIMES = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'];
const END_TIMES   = ['07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00','23:00'];

// ISO "YYYY-MM-DD" for the Monday of the week containing `date`
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

interface Props {
  employees: Employee[];
  defaultDate: string;
  todayIso: string;
  onClose: () => void;
  onSaved: (shiftWeekStart: string) => void;
}

export function AddShiftModal({ employees, defaultDate, todayIso, onClose, onSaved }: Props) {
  const [shiftDate, setShiftDate]       = useState(defaultDate);
  const [shiftStart, setShiftStart]     = useState('09:00');
  const [shiftEnd,   setShiftEnd]       = useState('17:00');
  const [shiftRole,    setShiftRole]    = useState<EmployeeRole>('WAITER');
  const [shiftEmployeeId, setShiftEmployeeId] = useState('');
  const [saving, setSaving]             = useState(false);
  const [error,  setError]              = useState<string | null>(null);

  const roleEmployees = employees.filter(e => e.employeeRole === shiftRole);

  async function handleAddShift() {
    if (!shiftDate || shiftDate < todayIso || shiftEnd <= shiftStart) return;
    setSaving(true);
    setError(null);
    try {
      const shift = await createShift({
        date: shiftDate,
        startTime: shiftStart,
        endTime: shiftEnd,
        employeeRole: shiftRole,
        requiredCount: 1,
      });

      const shiftWeekStart = getWeekStart(new Date(`${shiftDate}T00:00:00`));

      if (shiftEmployeeId) {
        let schedule = await getWeeklySchedule(shiftWeekStart);
        if (!schedule) {
          schedule = await createDraftSchedule(shiftWeekStart);
        }
        await addAssignment(schedule.id, { shiftId: shift.id, employeeId: shiftEmployeeId });
      }

      onSaved(shiftWeekStart);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Failed to add shift. Try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modalSheet}>
        <div className={styles.handle} />
        <h2 className={styles.modalTitle}>Add Shift Manually</h2>

        <div className={styles.formRow}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Date</label>
            <input className={styles.fieldInput} type="date" min={todayIso} value={shiftDate} onChange={e => setShiftDate(e.target.value)} />
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

        <div className={styles.formRow}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Role</label>
            <div className={styles.selectWrap}>
              <select
                className={styles.fieldSelect}
                value={shiftRole}
                onChange={e => { setShiftRole(e.target.value as EmployeeRole); setShiftEmployeeId(''); }}
              >
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0)}{r.slice(1).toLowerCase()}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Assign Employee</label>
            <div className={styles.selectWrap}>
              <select className={styles.fieldSelect} value={shiftEmployeeId} onChange={e => setShiftEmployeeId(e.target.value)}>
                <option value="">Leave open...</option>
                {roleEmployees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </select>
            </div>
          </div>
        </div>

        {error && <div className={styles.formError}>{error}</div>}

        <button className={styles.saveBtn} onClick={handleAddShift} disabled={saving || !shiftDate || shiftDate < todayIso || shiftEnd <= shiftStart}>
          {saving ? 'Adding…' : 'Add Shift'}
        </button>
      </div>
    </div>
  );
}
