import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { translateApiError } from '../api/errorMessages';
import styles from './Login.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? '/';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('נא למלא שם משתמש וסיסמה');
      return;
    }

    setSubmitting(true);
    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(translateApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <img src="/logo.svg" alt="Masters Studio" className={styles.logo} />
        <h1>
          התחברות<span className="dot" />
        </h1>
        {error && <p className={styles.error}>{error}</p>}
        {/* noValidate: we show our own Hebrew validation messages above —
            the browser's native "please fill out this field" tooltip
            renders in the OS/browser locale, not ours. Same convention
            every future form in this app should follow. */}
        <form onSubmit={handleSubmit} noValidate>
          <label className={styles.field}>
            שם משתמש
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </label>
          <label className={styles.field}>
            סיסמה
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={submitting}>
            {submitting ? 'מתחבר…' : 'התחברות'}
          </button>
        </form>
      </div>
    </div>
  );
}
