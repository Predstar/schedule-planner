import styles from './StatusBar.module.css';

export function StatusBar() {
  return (
    <div className={styles.bar}>
      <span className={styles.time}>9:41</span>
      <div className={styles.icons}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="var(--text)">
          <rect x="1" y="15" width="4" height="6" rx="1" />
          <rect x="7" y="10" width="4" height="11" rx="1" />
          <rect x="13" y="5" width="4" height="16" rx="1" />
          <rect x="19" y="1" width="4" height="20" rx="1" opacity="0.3" />
        </svg>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round">
          <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" />
        </svg>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--text)" strokeWidth="1.5" strokeLinecap="round">
          <rect x="1" y="6" width="18" height="12" rx="2" />
          <rect x="2.5" y="7.5" width="13" height="9" rx="1" fill="var(--text)" stroke="none" />
          <path d="M20 10v4" />
        </svg>
      </div>
    </div>
  );
}
