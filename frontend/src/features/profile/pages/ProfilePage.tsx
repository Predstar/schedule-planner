import { useNavigate } from 'react-router-dom';
import { logout, getStoredUser } from '../../auth/services/auth.service';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import { StatusBar } from '../../../shared/components/StatusBar';
import { BottomNav } from '../../../shared/components/BottomNav';
import styles from './ProfilePage.module.css';

interface ProfilePageProps {
  role: 'manager' | 'employee';
}

export function ProfilePage({ role }: ProfilePageProps) {
  const navigate = useNavigate();
  const stored = getStoredUser();

  const email = stored?.email ?? '';
  const systemRole = stored?.systemRole ?? (role === 'manager' ? 'MANAGER' : 'EMPLOYEE');
  const displayRole = systemRole === 'EMPLOYEE' ? 'Employee' : systemRole === 'ADMIN' ? 'Admin' : 'Manager';
  const initials = email.charAt(0).toUpperCase() || '?';

  // Hours not yet available from API — show zeros until employee profile endpoint is wired
  const workedHours = 0;
  const targetHours = 0;
  const pct = targetHours > 0 ? Math.round((workedHours / targetHours) * 100) : 0;

  function handleSignOut() {
    logout();
    navigate('/login');
  }

  return (
    <PhoneShell>
      <StatusBar />
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Profile</h1>
        </div>

        {/* Avatar + name */}
        <div className={styles.hero}>
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.heroName}>{email}</div>
          <div className={styles.heroRole}>{displayRole}</div>
        </div>

        {/* Info cards */}
        <div className={styles.infoList}>
          <div className={styles.infoCard}>
            <div className={styles.infoIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className={styles.infoContent}>
              <div className={styles.infoLabel}>Email</div>
              <div className={styles.infoValue}>{email}</div>
            </div>
          </div>
        </div>

        {/* Hours this month — available once employee profile endpoint is wired */}
        <div className={styles.hoursCard}>
          <div className={styles.hoursTitle}>Hours This Month</div>
          <div className={styles.hoursRow}>
            <span className={styles.hoursWorked}>{workedHours}h worked</span>
            <span className={styles.hoursTarget}>{targetHours}h target</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Sign out / Switch Demo User */}
        {role === 'employee' ? (
          <button className={styles.switchBtn} onClick={handleSignOut}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        ) : (
          <button className={styles.signOutBtn} onClick={handleSignOut}>Sign Out</button>
        )}
      </div>
      <BottomNav role={role} />
    </PhoneShell>
  );
}
