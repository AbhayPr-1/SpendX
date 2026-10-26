import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sun, Moon, AlertCircle } from 'lucide-react';

export default function Login({ onLoginSuccess, darkMode, onToggleDark }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: identifier, password })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid credentials. Please try again.');
        return;
      }

      localStorage.setItem('spendx_token', data.token);
      if (data.user) {
        localStorage.setItem('spendx_user', JSON.stringify(data.user));
      }
      onLoginSuccess(data.token, data.user);
      navigate('/');
    } catch {
      setError('Unable to connect to server. Please check your network.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-container">
      {/* Top Bar with Brand Logo & Theme Switcher */}
      <header className="auth-top-header">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 2 7 12 12 22 7 12 2" />
              <polyline points="2 17 12 22 22 17" />
              <polyline points="2 12 12 17 22 12" />
            </svg>
          </div>
          <span className="auth-brand-name">SpendX</span>
        </div>

        {onToggleDark && (
          <button
            type="button"
            className="theme-toggle-btn"
            onClick={onToggleDark}
            title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun size={18} style={{ color: '#fbbf24' }} /> : <Moon size={18} style={{ color: '#2563eb' }} />}
          </button>
        )}
      </header>

      {/* Centered Modern Card */}
      <main className="auth-card-wrapper">
        <div className="auth-card">
          <div className="auth-header-texts">
            <span className="auth-subtitle">Please enter your details</span>
            <h1 className="auth-title">Welcome back</h1>
          </div>

          {error && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <input
                type="text"
                className="auth-input-modern"
                placeholder="Email address or username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={submitting}
                autoComplete="username"
              />
            </div>

            <div className="auth-field auth-password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input-modern"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-eye-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="auth-meta-row">
              <label className="auth-remember-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember for 30 days</span>
              </label>
            </div>

            <button
              type="submit"
              className="auth-btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>

          </form>

          <div className="auth-bottom-switch">
            <span>Don't have an account? </span>
            <Link to="/register">Sign up</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
