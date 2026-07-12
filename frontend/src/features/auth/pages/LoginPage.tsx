import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/auth.service';
import { PhoneShell } from '../../../shared/components/PhoneShell';
import styles from './LoginPage.module.css';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPw, setShowPw]         = useState(false);
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent]   = useState(false);

  async function handleLogin() {
    setError('');
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    try {
      const res = await login({ email, password });
      if (res.user.systemRole === 'EMPLOYEE') {
        navigate('/employee/shifts');
      } else {
        navigate('/manager/schedule');
      }
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err?.code === 'EMAIL_NOT_CONFIRMED') {
        setError('Please confirm your email before logging in. Check your inbox for the confirmation link.');
      } else {
        setError('Invalid email or password. Please try again.');
      }
      setPassword('');
    } finally {
      setLoading(false);
    }
  }

  function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    if (!resetEmail) return;
    setResetSent(true);
  }

  return (
    <PhoneShell>
      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logoArea}>
          <div className={styles.logoBox}>
            <div className={styles.logoMark}>a<span className={styles.logoDot}>.</span></div>
          </div>
          <div className={styles.logoTitle}>Authentikka</div>
          <div className={styles.logoSub}>Shift planning app</div>
          <div className={styles.logoRule} />
        </div>

        {/* Error */}
        {error && (
          <div className={styles.errorBox}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </div>
        )}

        {/* Email */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="email">Email address</label>
          <div className={styles.inputWrap}>
            <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <input
              id="email"
              className={styles.input}
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>
        </div>

        {/* Password */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="password">Password</label>
          <div className={styles.inputWrap}>
            <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <input
              id="password"
              className={styles.input}
              type={showPw ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
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

        {/* Forgot */}
        <div className={styles.forgotRow}>
          <button className={styles.forgotLink} onClick={() => { setShowForgot(true); setResetEmail(email); setResetSent(false); }}>
            Forgot password?
          </button>
        </div>

        {/* Submit */}
        <button className={styles.loginBtn} onClick={handleLogin} disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>

        {/* Register */}
        <div className={styles.registerRow}>
          Don't have an account?{' '}
          <button className={styles.registerLink} onClick={() => navigate('/register')}>
            Sign up
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setShowForgot(false); }}>
          <div className={styles.sheet}>
            <div className={styles.sheetHandle} />
            {resetSent ? (
              <div className={styles.resetSuccess}>
                <div className={styles.resetIcon}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <h3 className={styles.sheetTitle}>Check your inbox</h3>
                <p className={styles.sheetSub}>We sent a reset link to <strong>{resetEmail}</strong></p>
                <button className={styles.loginBtn} onClick={() => setShowForgot(false)}>Got it</button>
              </div>
            ) : (
              <>
                <h3 className={styles.sheetTitle}>Reset password</h3>
                <p className={styles.sheetSub}>Enter your email and we'll send you a reset link.</p>
                <form onSubmit={handleForgot}>
                  <div className={styles.inputWrap} style={{ marginBottom: 16 }}>
                    <svg className={styles.inputIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                    <input
                      className={styles.input}
                      type="email"
                      placeholder="you@example.com"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                    />
                  </div>
                  <button type="submit" className={styles.loginBtn}>Send reset link</button>
                </form>
                <button className={styles.cancelBtn} onClick={() => setShowForgot(false)}>Cancel</button>
              </>
            )}
          </div>
        </div>
      )}
    </PhoneShell>
  );
}
