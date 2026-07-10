import { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import { StatusBar } from '../../../shared/components/StatusBar';
import { BottomNav } from '../../../shared/components/BottomNav';
import { getStoredUser } from '../../auth/services/auth.service';
import { listEmployees, createEmployee, createEmployeeAccount } from '../services/employees.service';
import type { Employee, EmployeeRole, EmploymentType } from '../../../shared/types/api.types';
import styles from './ManagerTeamPage.module.css';

type FilterRole = 'all' | EmployeeRole;

const FILTER_OPTIONS: Array<{ role: FilterRole; label: string; color: string }> = [
  { role: 'all',       label: 'All Roles',  color: '#A8967E' },
  { role: 'WAITER',    label: 'Waiter',     color: '#B45309' },
  { role: 'RUNNER',    label: 'Runner',     color: '#166534' },
  { role: 'BARTENDER', label: 'Bartender',  color: '#0369A1' },
];

const ROLE_BADGE: Record<EmployeeRole, { bg: string; color: string }> = {
  WAITER:    { bg: '#FFF3E0', color: '#B45309' },
  RUNNER:    { bg: '#E8F5E9', color: '#166534' },
  BARTENDER: { bg: '#E0F2FE', color: '#0369A1' },
};

function barColor(pct: number) {
  if (pct >= 75) return '#22C55E';
  if (pct >= 40) return '#F59E0B';
  return '#EF4444';
}

function initials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

// ── Add Employee Modal ─────────────────────────────────────────────────────────

interface AddModalProps {
  onClose: () => void;
  onAdded: (emp: Employee) => void;
}

function AddEmployeeModal({ onClose, onAdded }: AddModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 fields
  const [firstName,       setFirstName]       = useState('');
  const [lastName,        setLastName]         = useState('');
  const [email,           setEmail]            = useState('');
  const [phone,           setPhone]            = useState('');
  const [employeeRole,    setEmployeeRole]     = useState<EmployeeRole>('WAITER');
  const [employmentType,  setEmploymentType]   = useState<EmploymentType>('FULL_TIME');
  const [weeklyHourLimit, setWeeklyHourLimit]  = useState(40);

  // Step 2 fields
  const [loginEmail,    setLoginEmail]    = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Created employee (bridges step 1 → 2)
  const [createdEmployee, setCreatedEmployee] = useState<Employee | null>(null);

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  async function handleStep1() {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return;
    setSaving(true); setError(null);
    try {
      const emp = await createEmployee({
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        email:     email.trim(),
        phone:     phone.trim(),
        employeeRole,
        employmentType,
        weeklyHourLimit,
      });
      setCreatedEmployee(emp);
      setLoginEmail(email.trim());
      setStep(2);
    } catch (e: unknown) {
      const err = e as { message?: string; code?: string };
      setError(err?.code === 'EMPLOYEE_EMAIL_ALREADY_EXISTS'
        ? 'An employee with this email already exists.'
        : (err?.message ?? 'Failed to create employee. Try again.'));
    } finally { setSaving(false); }
  }

  async function handleStep2() {
    if (!createdEmployee || !loginEmail.trim() || loginPassword.length < 6) return;
    setSaving(true); setError(null);
    try {
      await createEmployeeAccount({
        email:      loginEmail.trim(),
        password:   loginPassword,
        employeeId: createdEmployee.id,
      });
      setStep(3);
      onAdded(createdEmployee);
    } catch (e: unknown) {
      const err = e as { message?: string; code?: string };
      setError(err?.code === 'USER_EMAIL_ALREADY_EXISTS'
        ? 'That login email is already taken. Try a different one.'
        : (err?.message ?? 'Failed to create login. Try again.'));
    } finally { setSaving(false); }
  }

  const step1Valid = firstName.trim() && lastName.trim() && email.trim() && weeklyHourLimit > 0;
  const step2Valid = loginEmail.trim() && loginPassword.length >= 6;

  return (
    <div className={styles.addOverlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.addSheet}>
        <div className={styles.addHandle} />
        <h2 className={styles.addTitle}>
          {step === 1 ? 'Add Employee' : step === 2 ? 'Create Login' : 'Employee Added'}
        </h2>
        <p className={styles.addStep}>
          {step === 1 ? 'Step 1 of 2 — Profile details' : step === 2 ? 'Step 2 of 2 — Login credentials' : 'Account is ready to use'}
        </p>

        {/* Progress dots */}
        <div className={styles.stepDots}>
          <div className={[styles.stepDot, step >= 1 ? styles.stepDotActive : ''].join(' ')} />
          <div className={[styles.stepDot, step >= 2 ? styles.stepDotActive : ''].join(' ')} />
        </div>

        {error && <div className={styles.formError}>{error}</div>}

        {/* ── Step 1: Profile ── */}
        {step === 1 && (
          <>
            <div className={styles.formRow2}>
              <div>
                <label className={styles.fieldLabel}>First Name</label>
                <input className={styles.fieldInput} placeholder="Alice" value={firstName} onChange={e => setFirstName(e.target.value)} />
              </div>
              <div>
                <label className={styles.fieldLabel}>Last Name</label>
                <input className={styles.fieldInput} placeholder="Müller" value={lastName} onChange={e => setLastName(e.target.value)} />
              </div>
            </div>

            <div className={styles.formRow}>
              <label className={styles.fieldLabel}>Work Email</label>
              <input className={styles.fieldInput} type="email" placeholder="alice@restaurant.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div className={styles.formRow}>
              <label className={styles.fieldLabel}>Phone (optional)</label>
              <input className={styles.fieldInput} placeholder="+49 111 222 333" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>

            <div className={styles.formRow2}>
              <div>
                <label className={styles.fieldLabel}>Role</label>
                <div className={styles.selectWrap}>
                  <select className={styles.fieldSelect} value={employeeRole} onChange={e => setEmployeeRole(e.target.value as EmployeeRole)}>
                    <option value="WAITER">Waiter</option>
                    <option value="RUNNER">Runner</option>
                    <option value="BARTENDER">Bartender</option>
                  </select>
                </div>
              </div>
              <div>
                <label className={styles.fieldLabel}>Contract</label>
                <div className={styles.selectWrap}>
                  <select className={styles.fieldSelect} value={employmentType} onChange={e => setEmploymentType(e.target.value as EmploymentType)}>
                    <option value="FULL_TIME">Full Time</option>
                    <option value="PART_TIME">Part Time</option>
                    <option value="MINI_JOB">Mini Job</option>
                  </select>
                </div>
              </div>
            </div>

            <div className={styles.formRow}>
              <label className={styles.fieldLabel}>Weekly Hour Limit</label>
              <input
                className={styles.fieldInput}
                type="number" min={1} max={60}
                value={weeklyHourLimit}
                onChange={e => setWeeklyHourLimit(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>

            <button className={styles.primaryBtn} onClick={handleStep1} disabled={!step1Valid || saving}>
              {saving ? 'Creating…' : 'Next — Set Login →'}
            </button>
            <button className={styles.secondaryBtn} onClick={onClose}>Cancel</button>
          </>
        )}

        {/* ── Step 2: Login ── */}
        {step === 2 && createdEmployee && (
          <>
            <div style={{ background:'var(--accent-pale)', border:'1.5px solid var(--border)', borderRadius:12, padding:'12px 14px', marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--accent)' }}>
                {createdEmployee.firstName} {createdEmployee.lastName}
              </div>
              <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:2 }}>
                {createdEmployee.employeeRole} · employee record created ✓
              </div>
            </div>

            <div className={styles.formRow}>
              <label className={styles.fieldLabel}>Login Email</label>
              <input
                className={styles.fieldInput}
                type="email"
                placeholder="alice@example.com"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
              />
            </div>

            <div className={styles.formRow}>
              <label className={styles.fieldLabel}>Password (min. 6 characters)</label>
              <input
                className={styles.fieldInput}
                type="password"
                placeholder="••••••••"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
              />
            </div>

            <button className={styles.primaryBtn} onClick={handleStep2} disabled={!step2Valid || saving}>
              {saving ? 'Creating login…' : 'Create Account ✓'}
            </button>
            <button className={styles.secondaryBtn} onClick={onClose}>Skip (add login later)</button>
          </>
        )}

        {/* ── Step 3: Done ── */}
        {step === 3 && createdEmployee && (
          <>
            <div className={styles.successCard}>
              <div className={styles.successIcon}>✓</div>
              <div className={styles.successTitle}>{createdEmployee.firstName} {createdEmployee.lastName} is ready</div>
              <div className={styles.successSub}>Employee profile + login account created.</div>
              <div className={styles.credBox}>
                <div className={styles.credRow}>
                  <span className={styles.credLabel}>Login</span>
                  <span className={styles.credValue}>{loginEmail}</span>
                </div>
                <div className={styles.credRow}>
                  <span className={styles.credLabel}>Password</span>
                  <span className={styles.credValue}>{loginPassword}</span>
                </div>
              </div>
            </div>
            <button className={styles.primaryBtn} onClick={onClose}>Done</button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export function ManagerTeamPage() {
  const isAdmin = getStoredUser()?.systemRole === 'ADMIN';
  const [employees,  setEmployees]  = useState<Employee[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [activeRole, setActiveRole] = useState<FilterRole>('all');
  const [dropOpen,   setDropOpen]   = useState(false);
  const [selected,   setSelected]   = useState<Employee | null>(null);
  const [showAdd,    setShowAdd]    = useState(false);

  useEffect(() => {
    listEmployees({ active: true })
      .then(setEmployees)
      .catch(() => setError('Failed to load employees.'))
      .finally(() => setLoading(false));
  }, []);

  function handleAdded(emp: Employee) {
    setEmployees(prev => [emp, ...prev]);
  }

  const filtered = activeRole === 'all'
    ? employees
    : employees.filter(e => e.employeeRole === activeRole);

  const activeOpt = FILTER_OPTIONS.find(o => o.role === activeRole)!;

  function selectFilter(opt: typeof FILTER_OPTIONS[0]) {
    setActiveRole(opt.role);
    setDropOpen(false);
  }

  function exportPDF() {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const exportLabel = activeRole === 'all' ? 'All Roles' : activeOpt.label + 's';
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 18;
    let y = 0;

    doc.setFillColor(107, 79, 42);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(245, 239, 230);
    doc.text('a.', margin, 18);
    doc.setFontSize(14);
    doc.text(`Authentikka — Team Report (${exportLabel})`, margin + 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(200, 185, 165);
    const now = new Date();
    doc.text(`Generated: ${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageW - margin, 18, { align: 'right' });

    y = 36;
    doc.setFillColor(245, 239, 230);
    doc.roundedRect(margin, y, pageW - margin * 2, 12, 2, 2, 'F');
    doc.setFontSize(10); doc.setTextColor(28, 16, 7); doc.setFont('helvetica', 'bold');
    doc.text(`Total employees: ${filtered.length}`, margin + 4, y + 8);
    const totalTarget = filtered.reduce((s, e) => s + e.weeklyHourLimit, 0);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(168, 150, 126);
    doc.text(`Weekly hour target: ${totalTarget}h`, pageW / 2, y + 8, { align: 'center' });
    y += 18;

    doc.setFillColor(107, 79, 42);
    doc.rect(margin, y, pageW - margin * 2, 8, 'F');
    doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(245, 239, 230);
    const cols = [margin + 2, margin + 56, margin + 90, margin + 124, margin + 156];
    ['Employee', 'Role', 'Contract', 'Email', 'Status'].forEach((h, i) => doc.text(h, cols[i], y + 5.5));
    y += 10;

    filtered.forEach((e, idx) => {
      if (y > 265) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) { doc.setFillColor(250, 246, 240); doc.rect(margin, y, pageW - margin * 2, 9, 'F'); }
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(28, 16, 7);
      doc.text(`${e.firstName} ${e.lastName}`, cols[0], y + 6);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(168, 150, 126);
      doc.text(e.employeeRole, cols[1], y + 6);
      doc.text(`${e.weeklyHourLimit}h/week`, cols[2], y + 6);
      doc.text(e.email, cols[3], y + 6);
      doc.setTextColor(e.active ? 22 : 153, e.active ? 101 : 27, e.active ? 52 : 27);
      doc.setFont('helvetica', 'bold');
      const pct = 0;
      const barX = cols[4] - 2; const barY = y + 7.5; const barW = 32;
      doc.setFillColor(220, 210, 200);
      doc.roundedRect(barX, barY, barW, 1.5, 0.5, 0.5, 'F');
      const col = pct >= 0.75 ? [34,197,94] as const : pct >= 0.4 ? [245,158,11] as const : [239,68,68] as const;
      doc.setFillColor(col[0], col[1], col[2]);
      doc.roundedRect(barX, barY, barW * pct, 1.5, 0.5, 0.5, 'F');
      doc.setDrawColor(232, 221, 208); doc.setLineWidth(0.2);
      doc.line(margin, y + 9, pageW - margin, y + 9);
      y += 9;
    });

    doc.setFontSize(8); doc.setFont('helvetica', 'italic'); doc.setTextColor(168, 150, 126);
    doc.text('Authentikka Shift Management · Confidential', pageW / 2, 287, { align: 'center' });
    const roleSlug = activeRole === 'all' ? 'All' : exportLabel.replace(/\s/g, '_');
    doc.save(`Authentikka_Team_${roleSlug}_${now.toISOString().slice(0, 10)}.pdf`);
  }

  return (
    <PhoneShell>
      <StatusBar />

      <div className={styles.body}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>Team ({filtered.length})</h1>
          <div style={{ display:'flex', gap:8 }}>
            {isAdmin && (
              <button
                onClick={() => setShowAdd(true)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'11px 14px', background:'var(--accent)', color:'#FAF6F0', border:'none', borderRadius:12, fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 14px var(--accent-shadow)', fontFamily:'Inter,sans-serif', whiteSpace:'nowrap', transition:'background 0.15s' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Add
              </button>
            )}
            <button className={styles.exportBtn} onClick={exportPDF}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FAF6F0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <polyline points="9 15 12 18 15 15"/>
              </svg>
              Export
            </button>
          </div>
        </div>

        {/* Filter dropdown */}
        <div className={styles.filterBar}>
          <button
            className={[styles.filterBtn, dropOpen ? styles.filterBtnOpen : ''].join(' ')}
            onClick={() => setDropOpen(v => !v)}
          >
            <div className={styles.filterBtnLeft}>
              <span className={styles.filterDot} style={{ background: activeOpt.color }} />
              <span>{activeOpt.label}</span>
              <span className={styles.filterCount}>{filtered.length}</span>
            </div>
            <svg className={[styles.filterChevron, dropOpen ? styles.filterChevronOpen : ''].join(' ')}
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {dropOpen && (
            <div className={styles.filterDrop}>
              {FILTER_OPTIONS.map(opt => {
                const count = opt.role === 'all' ? employees.length : employees.filter(e => e.employeeRole === opt.role).length;
                return (
                  <button
                    key={opt.role}
                    className={[styles.filterOpt, activeRole === opt.role ? styles.filterOptActive : ''].join(' ')}
                    onClick={() => selectFilter(opt)}
                  >
                    <span className={styles.optDot} style={{ background: opt.color }} />
                    <span>{opt.label}</span>
                    <span className={styles.optCount}>{count}</span>
                    {activeRole === opt.role && <span className={styles.optCheck}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {loading && <div className={styles.empty}>Loading team…</div>}
        {!loading && error && <div className={styles.empty} style={{ color: '#EF4444' }}>{error}</div>}
        {!loading && !error && filtered.length === 0 && (
          <div className={styles.empty}>
            <strong>No employees yet</strong>
            {isAdmin ? <>Tap <b>Add</b> above to create your first employee.</> : 'Ask an admin to add employees.'}
          </div>
        )}

        {/* Employee list */}
        {!loading && !error && filtered.map(emp => {
          const role  = emp.employeeRole;
          const badge = ROLE_BADGE[role];
          const init  = initials(emp.firstName, emp.lastName);
          const target = emp.weeklyHourLimit;
          return (
            <div key={emp.id} className={styles.empCard} onClick={() => setSelected(emp)}>
              <div className={styles.empTop}>
                <div className={styles.avatar}>{init}</div>
                <div className={styles.empInfo}>
                  <div className={styles.nameRow}>
                    <span className={styles.empName}>{emp.firstName} {emp.lastName}</span>
                    <span className={styles.roleBadge} style={{ background: badge.bg, color: badge.color }}>{role.toLowerCase()}</span>
                  </div>
                  <div className={styles.empMeta}>{target}h/week · {emp.employmentType.replace('_', ' ').toLowerCase()}</div>
                </div>
                <span className={styles.deficit} style={{ background: '#F5F0E8', color: '#A8967E' }}>{target}h</span>
              </div>
              <div className={styles.progressMeta}>
                <span>0h worked</span><span>{target}h target</span>
              </div>
              <div className={styles.barBg}>
                <div className={styles.barFill} style={{ width: '0%', background: barColor(0) }} />
              </div>
            </div>
          );
        })}
      </div>

      <BottomNav role="manager" />

      {/* Add Employee Modal */}
      {showAdd && (
        <AddEmployeeModal
          onClose={() => setShowAdd(false)}
          onAdded={handleAdded}
        />
      )}

      {/* Employee detail sheet */}
      {selected && (() => {
        const e    = selected;
        const role = e.employeeRole;
        const badge = ROLE_BADGE[role];
        const init  = initials(e.firstName, e.lastName);
        return (
          <div className={styles.detailOverlay} onClick={ev => { if (ev.target === ev.currentTarget) setSelected(null); }}>
            <div className={styles.detailSheet}>
              <div className={styles.sheetHandle} />
              <div className={styles.sheetHeader}>
                <div className={styles.sheetAvatar}>{init}</div>
                <div className={styles.sheetNameBlock}>
                  <div className={styles.sheetName}>{e.firstName} {e.lastName}</div>
                  <span className={styles.sheetBadge} style={{ background: badge.bg, color: badge.color }}>
                    {role.toLowerCase()} · {e.employmentType.replace('_', ' ').toLowerCase()}
                  </span>
                </div>
                <button className={styles.closeBtn} onClick={() => setSelected(null)}>✕</button>
              </div>
              <div className={styles.infoCard}>
                <div className={styles.infoCardLabel}>Contract</div>
                <div className={styles.infoRow}><span>Weekly Limit</span><strong>{e.weeklyHourLimit}h</strong></div>
                <div className={styles.infoRow}><span>Employment</span><strong>{e.employmentType.replace('_', ' ')}</strong></div>
                <div className={styles.infoRow}><span>Email</span><strong style={{ fontSize: 12 }}>{e.email}</strong></div>
                {e.phone && <div className={styles.infoRow}><span>Phone</span><strong>{e.phone}</strong></div>}
              </div>
              <div className={styles.infoCard}>
                <div className={styles.infoCardLabel}>This Week</div>
                <div className={styles.infoRow}><span>Hours Worked</span><strong>0h</strong></div>
                <div className={styles.infoRow}><span>Target</span><strong>{e.weeklyHourLimit}h</strong></div>
                <div className={styles.barBg} style={{ marginTop: 10 }}>
                  <div className={styles.barFill} style={{ width: '0%', background: barColor(0) }} />
                </div>
                <div className={styles.infoMeta}>
                  <span>0% of target</span>
                  <span style={{ color: '#A8967E', fontWeight: 600 }}>shifts not yet tracked</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </PhoneShell>
  );
}
