import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Sun, Moon, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Register({ onLoginSuccess, darkMode, onToggleDark }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), email: email.trim(), password })
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try a different username.');
        return;
      }

      setSuccess('Account created successfully! Logging you in...');
      if (data.token) {
        localStorage.setItem('spendx_token', data.token);
        if (data.user) {
          localStorage.setItem('spendx_user', JSON.stringify(data.user));
        }
        setTimeout(() => {
          onLoginSuccess(data.token, data.user);
          navigate('/');
        }, 800);
      } else {
        setTimeout(() => navigate('/login'), 1200);
      }
    } catch {
      setError('Unable to reach server. Please check your network connection.');
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
            <h1 className="auth-title">Create an account</h1>
          </div>

          {error && (
            <div className="auth-error-banner" role="alert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="auth-success-banner" role="alert">
              <CheckCircle2 size={16} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <input
                type="text"
                className="auth-input-modern"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={submitting}
                autoComplete="username"
              />
            </div>

            <div className="auth-field">
              <input
                type="email"
                className="auth-input-modern"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={submitting}
                autoComplete="email"
              />
            </div>

            <div className="auth-field auth-password-field">
              <input
                type={showPassword ? 'text' : 'password'}
                className="auth-input-modern"
                placeholder="Password (minimum 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={submitting}
                autoComplete="new-password"
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
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                />
                <span>Agree to Terms & Privacy Policy</span>
              </label>
            </div>

            <button
              type="submit"
              className="auth-btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Creating account...' : 'Sign up'}
            </button>

          </form>

          <div className="auth-bottom-switch">
            <span>Already have an account? </span>
            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </main>
    </div>
  );
}
