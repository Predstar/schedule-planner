import { useState } from 'react';
import { Link } from 'react-router-dom';
import { register } from '../services/auth.service';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import styles from './LoginPage.module.css';

export function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleRegister() {
    setError('');
    if (!firstName || !lastName || !email || !password || !confirmPw) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPw) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await register({ firstName, lastName, email, password });
      setSubmitted(true);
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err?.code === 'USER_EMAIL_ALREADY_EXISTS') {
        setError('This email is already registered.');
      } else {
        setError('Registration failed. Try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <PhoneShell>
        <div className={styles.content}>
          <div className={styles.logoArea}>
            <div className={styles.logoBox}>
              <div className={styles.logoMark}>a<span className={styles.logoDot}>.</span></div>
            </div>
            <div className={styles.logoTitle}>Authentikka</div>
            <div className={styles.logoSub}>Check your email</div>
            <div className={styles.logoRule} />
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-sub)', textAlign: 'center', lineHeight: 1.6, padding: '0 8px' }}>
            We've sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.
          </p>
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Link to="/login" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-light)', textDecoration: 'none' }}>Back to sign in</Link>
          </div>
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell>
      <div className={styles.content}>
        <div className={styles.logoArea}>
          <div className={styles.logoBox}>
            <div className={styles.logoMark}>a<span className={styles.logoDot}>.</span></div>
          </div>
          <div className={styles.logoTitle}>Authentikka</div>
          <div className={styles.logoSub}>Create your account</div>
          <div className={styles.logoRule} />
        </div>

        {error && (
          <div className={styles.errorBox}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="firstName">First name</label>
          <div className={styles.inputWrap}>
            <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            <input id="firstName" className={styles.input} type="text" placeholder="Jane" autoComplete="given-name" value={firstName} onChange={e => setFirstName(e.target.value)} />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="lastName">Last name</label>
          <div className={styles.inputWrap}>
            <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            <input id="lastName" className={styles.input} type="text" placeholder="Smith" autoComplete="family-name" value={lastName} onChange={e => setLastName(e.target.value)} />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="email">Email address</label>
          <div className={styles.inputWrap}>
            <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <input id="email" className={styles.input} type="email" placeholder="you@example.com" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="password">Password</label>
          <div className={styles.inputWrap}>
            <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input id="password" className={styles.input} type={showPw ? 'text' : 'password'} placeholder="At least 8 characters" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
            <button className={styles.pwToggle} onClick={() => setShowPw(v => !v)} type="button" aria-label="Toggle password">
              {showPw ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="confirmPw">Confirm password</label>
          <div className={styles.inputWrap}>
            <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input id="confirmPw" className={styles.input} type={showPw ? 'text' : 'password'} placeholder="Repeat your password" autoComplete="new-password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRegister()} />
          </div>
        </div>

        <button className={styles.loginBtn} onClick={handleRegister} disabled={loading} style={{ marginTop: 6 }}>
          {loading ? 'Creating account…' : 'Create Account'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 18 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Already have an account? </span>
          <Link to="/login" style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent-light)', textDecoration: 'none' }}>Sign in</Link>
        </div>
      </div>
    </PhoneShell>
  );
}
