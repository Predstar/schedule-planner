import { useState } from 'react';
import jsPDF from 'jspdf';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import { StatusBar } from '../../../shared/components/StatusBar';
import { BottomNav } from '../../../shared/components/BottomNav';
import { TEAM, Employee, EmployeeRole } from '../types/employee';
import styles from './ManagerTeamPage.module.css';

type FilterRole = 'all' | EmployeeRole;

const FILTER_OPTIONS: Array<{ role: FilterRole; label: string; color: string }> = [
  { role: 'all',       label: 'All Roles',  color: '#A8967E' },
  { role: 'waiter',    label: 'Waiter',     color: '#B45309' },
  { role: 'runner',    label: 'Runner',     color: '#166534' },
  { role: 'bartender', label: 'Bartender',  color: '#0369A1' },
  { role: 'chef',      label: 'Chef',       color: '#5B21B6' },
];

const ROLE_BADGE: Record<EmployeeRole, { bg: string; color: string }> = {
  waiter:    { bg: '#FFF3E0', color: '#B45309' },
  runner:    { bg: '#E8F5E9', color: '#166534' },
  chef:      { bg: '#EDE9FE', color: '#5B21B6' },
  bartender: { bg: '#E0F2FE', color: '#0369A1' },
};

function barColor(pct: number) {
  if (pct >= 75) return '#22C55E';
  if (pct >= 40) return '#F59E0B';
  return '#EF4444';
}

export function ManagerTeamPage() {
  const [activeRole, setActiveRole] = useState<FilterRole>('all');
  const [dropOpen,   setDropOpen]   = useState(false);
  const [selected,   setSelected]   = useState<Employee | null>(null);

  const filtered = activeRole === 'all' ? TEAM : TEAM.filter(e => e.role === activeRole);
  const activeOpt = FILTER_OPTIONS.find(o => o.role === activeRole)!;

  function selectFilter(opt: typeof FILTER_OPTIONS[0]) {
    setActiveRole(opt.role);
    setDropOpen(false);
  }

  function exportPDF() {
    const { jsPDF: PDF } = { jsPDF };
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
    doc.text(`Generated: ${now.toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' })}`, pageW - margin, 18, { align: 'right' });

    y = 36;
    doc.setFillColor(245, 239, 230);
    doc.roundedRect(margin, y, pageW - margin * 2, 12, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setTextColor(28, 16, 7);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total employees: ${filtered.length}`, margin + 4, y + 8);
    const totalWorked = filtered.reduce((s, e) => s + e.worked, 0);
    const totalTarget = filtered.reduce((s, e) => s + e.target, 0);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(168, 150, 126);
    doc.text(`Team hours this week: ${totalWorked}h worked / ${totalTarget}h target`, pageW / 2, y + 8, { align: 'center' });
    y += 18;

    doc.setFillColor(107, 79, 42);
    doc.rect(margin, y, pageW - margin * 2, 8, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(245, 239, 230);
    const cols = [margin+2, margin+46, margin+70, margin+94, margin+116, margin+136, margin+158];
    ['Employee','Role','Section','Contract','Worked','Target','Deficit'].forEach((h, i) => doc.text(h, cols[i], y + 5.5));
    y += 10;

    filtered.forEach((e, idx) => {
      if (y > 265) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) { doc.setFillColor(250, 246, 240); doc.rect(margin, y, pageW - margin * 2, 9, 'F'); }
      const diff = e.worked - e.target;
      const sign = diff >= 0 ? '+' : '';
      doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(28, 16, 7);
      doc.text(e.name, cols[0], y + 6);
      doc.setFont('helvetica', 'normal'); doc.setTextColor(168, 150, 126);
      doc.text(e.role, cols[1], y + 6);
      doc.text(e.section, cols[2], y + 6);
      doc.text(e.contract, cols[3], y + 6);
      doc.setTextColor(28, 16, 7);
      doc.text(`${e.worked}h`, cols[4], y + 6);
      doc.text(`${e.target}h`, cols[5], y + 6);
      if (diff >= 0) doc.setTextColor(22, 101, 52);
      else if (diff > -16) doc.setTextColor(180, 83, 9);
      else doc.setTextColor(153, 27, 27);
      doc.setFont('helvetica', 'bold');
      doc.text(`${sign}${diff}h`, cols[6], y + 6);
      const pct = Math.min(e.worked / e.target, 1);
      const barX = cols[4] - 2; const barY = y + 7.5; const barW = 32;
      doc.setFillColor(220, 210, 200);
      doc.roundedRect(barX, barY, barW, 1.5, 0.5, 0.5, 'F');
      const col = pct >= 0.75 ? [34,197,94] as const : pct >= 0.4 ? [245,158,11] as const : [239,68,68] as const;
      doc.setFillColor(...col);
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
          <h1 className={styles.title}>Team ({TEAM.length})</h1>
          <button className={styles.exportBtn} onClick={exportPDF}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FAF6F0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <polyline points="9 15 12 18 15 15"/>
            </svg>
            Export Team
          </button>
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
                const count = opt.role === 'all' ? TEAM.length : TEAM.filter(e => e.role === opt.role).length;
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

        {/* Employee list */}
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <strong>No {activeRole}s found</strong>
            Try selecting a different role above.
          </div>
        ) : (
          filtered.map(emp => {
            const pct   = Math.round((emp.worked / emp.target) * 100);
            const diff  = emp.worked - emp.target;
            const sign  = diff >= 0 ? '+' : '';
            const color = barColor(pct);
            const defClass = diff >= 0 ? styles.defGood : Math.abs(diff) <= 8 ? styles.defLow : styles.defHigh;
            const badge = ROLE_BADGE[emp.role];
            return (
              <div key={emp.id} className={styles.empCard} onClick={() => setSelected(emp)}>
                <div className={styles.empTop}>
                  <div className={styles.avatar}>{emp.initial}</div>
                  <div className={styles.empInfo}>
                    <div className={styles.nameRow}>
                      <span className={styles.empName}>{emp.name}</span>
                      <span className={styles.roleBadge} style={{ background: badge.bg, color: badge.color }}>{emp.role}</span>
                    </div>
                    <div className={styles.empMeta}>{emp.contract} &middot; {emp.section}</div>
                  </div>
                  <span className={[styles.deficit, defClass].join(' ')}>{sign}{diff}h</span>
                </div>
                <div className={styles.progressMeta}>
                  <span>{emp.worked}h worked</span><span>{emp.target}h target</span>
                </div>
                <div className={styles.barBg}>
                  <div className={styles.barFill} style={{ width: `${pct}%`, background: color }} />
                </div>
              </div>
            );
          })
        )}
      </div>

      <BottomNav role="manager" />

      {/* Employee detail sheet */}
      {selected && (() => {
        const e = selected;
        const weekPct  = Math.round((e.worked / e.target) * 100);
        const monthPct = Math.round((e.monthWorked / e.monthTarget) * 100);
        const under    = e.target - e.worked;
        const badge    = ROLE_BADGE[e.role];
        return (
          <div className={styles.detailOverlay} onClick={ev => { if (ev.target === ev.currentTarget) setSelected(null); }}>
            <div className={styles.detailSheet}>
              <div className={styles.sheetHandle} />
              <div className={styles.sheetHeader}>
                <div className={styles.sheetAvatar}>{e.initial}</div>
                <div className={styles.sheetNameBlock}>
                  <div className={styles.sheetName}>{e.name}</div>
                  <span className={styles.sheetBadge} style={{ background: badge.bg, color: badge.color }}>
                    {e.role} &middot; {e.section}
                  </span>
                </div>
                <button className={styles.closeBtn} onClick={() => setSelected(null)}>✕</button>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.infoCardLabel}>This Week</div>
                <div className={styles.infoRow}><span>Actual Hours</span><strong>{e.worked}h</strong></div>
                <div className={styles.infoRow}><span>Target Hours</span><strong>{e.target}h</strong></div>
                <div className={styles.barBg} style={{ marginTop: 10 }}>
                  <div className={styles.barFill} style={{ width: `${weekPct}%`, background: barColor(weekPct) }} />
                </div>
                <div className={styles.infoMeta}>
                  <span>{weekPct}% of target</span>
                  <span style={{ color: '#EF4444', fontWeight: 600 }}>{under > 0 ? `${under}h under` : 'On target ✓'}</span>
                </div>
              </div>

              <div className={styles.infoCard}>
                <div className={styles.infoCardLabel}>This Month (Total)</div>
                <div className={styles.infoRow}><span>Total Worked</span><strong>{e.monthWorked}h</strong></div>
                <div className={styles.infoRow}><span>Monthly Target</span><strong>{e.monthTarget}h</strong></div>
                <div className={styles.barBg} style={{ marginTop: 10 }}>
                  <div className={styles.barFill} style={{ width: `${monthPct}%`, background: barColor(monthPct) }} />
                </div>
                <div className={styles.infoMeta}>
                  <span>{monthPct}% of monthly target</span>
                </div>
              </div>

              <div className={styles.shiftsRow}>
                <span>Shifts this week</span>
                <strong>{e.shifts}</strong>
              </div>
            </div>
          </div>
        );
      })()}
    </PhoneShell>
  );
}
