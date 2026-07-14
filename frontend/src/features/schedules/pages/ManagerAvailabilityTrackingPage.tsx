import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import { StatusBar } from '../../../shared/components/StatusBar';
import { Spinner } from '../../../shared/components/Spinner';
import { getWeeklyAvailability } from '../../availability/services/availability.service';
import { listEmployees } from '../../employees/services/employees.service';
import type { AvailabilityResponse, Employee } from '../../../shared/types/api.types';
import styles from './ManagerAvailabilityTrackingPage.module.css';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  const dow = DAY_LABELS[(d.getDay() + 6) % 7];
  return `${dow} ${d.getDate()}/${d.getMonth() + 1}`;
}

// ISO "YYYY-MM-DD" for the Monday of the week containing `date`
function getWeekStart(date: Date): string {
  const d = new Date(date);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function ManagerAvailabilityTrackingPage() {
  const navigate = useNavigate();
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const weekEnd = addDays(weekStart, 6);

  const [availQuery, empsQuery] = useQueries({
    queries: [
      { queryKey: ['weekly-availability', weekStart], queryFn: () => getWeeklyAvailability(weekStart) },
      { queryKey: ['employees', { active: true }], queryFn: () => listEmployees({ active: true }) },
    ],
  });

  const loading = availQuery.isLoading || empsQuery.isLoading;
  const error = availQuery.isError || empsQuery.isError;

  const employees: Employee[] = empsQuery.data ?? [];
  const availabilities: AvailabilityResponse[] = availQuery.data ?? [];
  const byEmployeeId = new Map(availabilities.map((a) => [a.employeeId, a]));

  const submitted = employees.filter((e) => byEmployeeId.has(e.id));
  const notSubmitted = employees.filter((e) => !byEmployeeId.has(e.id));

  return (
    <PhoneShell>
      <StatusBar />
      <div className={styles.body}>
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={() => navigate('/manager/schedule')} aria-label="Back">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <h1 className={styles.title}>Availability</h1>
            <p className={styles.subtitle}>{submitted.length}/{employees.length} submitted</p>
          </div>
        </div>

        <div className={styles.weekNav}>
          <button className={styles.weekArrow} onClick={() => setWeekStart((w) => addDays(w, -7))} aria-label="Previous week">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className={styles.weekLabel}>{formatDateShort(weekStart)} – {formatDateShort(weekEnd)}</span>
          <button className={styles.weekArrow} onClick={() => setWeekStart((w) => addDays(w, 7))} aria-label="Next week">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {loading && <Spinner size="medium" label="Loading availability…" />}
        {!loading && error && <div className={styles.empty} style={{ color: '#EF4444' }}>Failed to load availability.</div>}

        {!loading && !error && (
          <>
            {submitted.length > 0 && (
              <>
                <div className={styles.sectionLabel}>Submitted</div>
                {submitted.map((emp) => {
                  const avail = byEmployeeId.get(emp.id)!;
                  return (
                    <div key={emp.id} className={styles.empCard}>
                      <div className={styles.empTop}>
                        <div className={styles.avatar}>{initials(emp.firstName, emp.lastName)}</div>
                        <div className={styles.empInfo}>
                          <div className={styles.empName}>{emp.firstName} {emp.lastName}</div>
                          <div className={styles.empMeta}>{emp.employeeRole.toLowerCase()}</div>
                        </div>
                        <span className={styles.statusBadge} data-status="submitted">Submitted</span>
                      </div>
                      <div className={styles.entryList}>
                        {avail.entries.map((entry, i) => (
                          <div key={i} className={styles.entryRow}>
                            <span className={styles.entryDate}>{formatDateShort(entry.date)}</span>
                            <span className={styles.entryTime}>
                              {entry.available ? `${entry.startTime}–${entry.endTime}` : 'Unavailable'}
                            </span>
                            {entry.available && entry.preferred && (
                              <span className={styles.preferredTag}>Preferred</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {notSubmitted.length > 0 && (
              <>
                <div className={styles.sectionLabel}>Not submitted</div>
                {notSubmitted.map((emp) => (
                  <div key={emp.id} className={styles.empCard}>
                    <div className={styles.empTop}>
                      <div className={styles.avatar}>{initials(emp.firstName, emp.lastName)}</div>
                      <div className={styles.empInfo}>
                        <div className={styles.empName}>{emp.firstName} {emp.lastName}</div>
                        <div className={styles.empMeta}>{emp.employeeRole.toLowerCase()}</div>
                      </div>
                      <span className={styles.statusBadge} data-status="pending">Not submitted</span>
                    </div>
                  </div>
                ))}
              </>
            )}

            {employees.length === 0 && (
              <div className={styles.empty}>
                <strong>No employees yet</strong>
                Add employees to start tracking their availability.
              </div>
            )}
          </>
        )}
      </div>
    </PhoneShell>
  );
}
