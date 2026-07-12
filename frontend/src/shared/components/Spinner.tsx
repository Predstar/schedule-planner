import styles from './Spinner.module.css';

interface Props {
  size?: 'small' | 'medium' | 'large';
  label?: string;
}

export function Spinner({ size = 'medium', label }: Props) {
  return (
    <div className={styles.wrap} role="status" aria-live="polite">
      <span className={`${styles.ring} ${styles[size]}`} />
      {label && <span className={styles.label}>{label}</span>}
      <span className={styles.srOnly}>{label ?? 'Loading'}</span>
    </div>
  );
}
