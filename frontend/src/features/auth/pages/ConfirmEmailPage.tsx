import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { confirmEmail } from '../services/auth.service';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import styles from './LoginPage.module.css';

export function ConfirmEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing confirmation token.');
      return;
    }
    confirmEmail({ token })
      .then(res => {
        setStatus('success');
        setMessage(res.message);
      })
      .catch(() => {
        setStatus('error');
        setMessage('This confirmation link is invalid or has expired.');
      });
  }, [token]);

  return (
    <PhoneShell>
      <div className={styles.content}>
        <div className={styles.logoArea}>
          <div className={styles.logoBox}>
            <div className={styles.logoMark}>a<span className={styles.logoDot}>.</span></div>
          </div>
          <div className={styles.logoTitle}>Authentikka</div>
          <div className={styles.logoSub}>
            {status === 'loading' ? 'Confirming…' : status === 'success' ? 'Email confirmed' : 'Confirmation failed'}
          </div>
          <div className={styles.logoRule} />
        </div>

        {status !== 'loading' && (
          <p style={{ fontSize: 14, color: 'var(--text-sub)', textAlign: 'center', lineHeight: 1.6, padding: '0 8px' }}>
            {message}
          </p>
        )}

        {status === 'success' && (
          <Link to="/login" className={styles.loginBtn} style={{ display: 'block', textAlign: 'center', textDecoration: 'none', marginTop: 20 }}>
            Sign in
          </Link>
        )}

        {status === 'error' && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Link to="/register" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-light)', textDecoration: 'none' }}>Back to registration</Link>
          </div>
        )}
      </div>
    </PhoneShell>
  );
}
