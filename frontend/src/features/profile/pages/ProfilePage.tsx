import { useNavigate } from 'react-router-dom';
import { logout } from '../../auth/services/auth.service';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import { StatusBar } from '../../../shared/components/StatusBar';
import { BottomNav } from '../../../shared/components/BottomNav';
import styles from './ProfilePage.module.css';

interface ProfilePageProps {
  role: 'manager' | 'employee';
}

const MANAGER_PROFILE = {
  name: 'Sarah Chen',
  role: 'Manager',
  initials: 'S',
  email: 'manager@demo.com',
  phone: '+1 555 000 0001',
  contract: '40h / week',
  workedHours: 0,
  targetHours: 160,
};

const EMPLOYEE_PROFILE = {
  name: 'James Wright',
  role: 'Waiter',
  initials: 'J',
  email: 'james@demo.com',
  phone: '+1 555 000 0042',
  contract: '32h / week',
  workedHours: 24,
  targetHours: 128,
};

export function ProfilePage({ role }: ProfilePageProps) {
  const navigate = useNavigate();
  const person = role === 'manager' ? MANAGER_PROFILE : EMPLOYEE_PROFILE;
  const pct = Math.round((person.workedHours / person.targetHours) * 100);

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
          <div className={styles.avatar}>{person.initials}</div>
          <div className={styles.heroName}>{person.name}</div>
          <div className={styles.heroRole}>{person.role}</div>
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
              <div className={styles.infoValue}>{person.email}</div>
            </div>
          </div>

          <div className={styles.infoCard}>
            <div className={styles.infoIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.07 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <div className={styles.infoContent}>
              <div className={styles.infoLabel}>Phone</div>
              <div className={styles.infoValue}>{person.phone}</div>
            </div>
          </div>

          <div className={styles.infoCard}>
            <div className={styles.infoIcon}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className={styles.infoContent}>
              <div className={styles.infoLabel}>Contract</div>
              <div className={styles.infoValue}>{person.contract}</div>
            </div>
          </div>
        </div>

        {/* Hours this month */}
        <div className={styles.hoursCard}>
          <div className={styles.hoursTitle}>Hours This Month</div>
          <div className={styles.hoursRow}>
            <span className={styles.hoursWorked}>{person.workedHours}h worked</span>
            <span className={styles.hoursTarget}>{person.targetHours}h target</span>
          </div>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Sign out */}
        <button className={styles.signOutBtn} onClick={handleSignOut}>Sign Out</button>
      </div>
      <BottomNav role={role} />
    </PhoneShell>
  );
}
