import styles from './Spinner.module.css';

interface Props {
  size?: 'small' | 'medium' | 'large';
  label?: string;
  inline?: boolean;
  onAccent?: boolean;
}

export function Spinner({ size = 'medium', label, inline = false, onAccent = false }: Props) {
  return (
    <div className={inline ? styles.inlineWrap : styles.wrap} role="status" aria-live="polite">
      <span className={[styles.ring, styles[size], onAccent ? styles.onAccent : ''].join(' ')} />
      {label && <span className={styles.label}>{label}</span>}
      <span className={styles.srOnly}>{label ?? 'Loading'}</span>
    </div>
  );
}
