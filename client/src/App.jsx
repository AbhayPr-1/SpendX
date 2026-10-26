import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

const Login = lazy(() => import('./views/Login'));
const Register = lazy(() => import('./views/Register'));
const Dashboard = lazy(() => import('./views/Dashboard'));
const OcrScanner = lazy(() => import('./views/OcrScanner'));
const Transactions = lazy(() => import('./views/Transactions'));
const Budgets = lazy(() => import('./views/Budgets'));
const Goals = lazy(() => import('./views/Goals'));
const AiAdvisor = lazy(() => import('./views/AiAdvisor'));
const Forecast = lazy(() => import('./views/Forecast'));
const Subscriptions = lazy(() => import('./views/Subscriptions'));
const Preferences = lazy(() => import('./views/Preferences'));
const Account = lazy(() => import('./views/Account'));

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('spendx_token'));
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('spendx_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // ── Dark Mode ──────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('spendx_theme');
    if (saved) return saved === 'dark';
    // Respect OS preference on first visit
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem('spendx_theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
      localStorage.setItem('spendx_theme', 'light');
    }
  }, [darkMode]);

  function toggleDarkMode() {
    setDarkMode(prev => !prev);
  }

  // ── Session ────────────────────────────────────────────────
  useEffect(() => {
    const handleExpiredSession = () => {
      setToken(null);
      setUser(null);
      localStorage.removeItem('spendx_token');
      localStorage.removeItem('spendx_user');
    };
    window.addEventListener('spendx:session-expired', handleExpiredSession);
    return () => window.removeEventListener('spendx:session-expired', handleExpiredSession);
  }, []);

  // Fetch current user if token exists but user info is missing
  useEffect(() => {
    if (token && !user) {
      fetch('/api/auth/me')
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => {
          if (data.user) {
            setUser(data.user);
            localStorage.setItem('spendx_user', JSON.stringify(data.user));
          }
        })
        .catch(() => {});
    }
  }, [token, user]);

  function handleLoginSuccess(newToken, newUser) {
    setToken(newToken);
    if (newUser) setUser(newUser);
  }

  function handleSignOut() {
    localStorage.removeItem('spendx_token');
    localStorage.removeItem('spendx_user');
    setToken(null);
    setUser(null);
  }

  return (
    <BrowserRouter>
      {!token ? (
        <Suspense fallback={<div className="route-loading">Loading…</div>}>
          <Routes>
            <Route path="/login"    element={<Login    onLoginSuccess={handleLoginSuccess} darkMode={darkMode} onToggleDark={toggleDarkMode} />} />
            <Route path="/register" element={<Register onLoginSuccess={handleLoginSuccess} darkMode={darkMode} onToggleDark={toggleDarkMode} />} />
            <Route path="*"         element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      ) : (
        <div className="app-container">
          <Sidebar
            collapsed={sidebarCollapsed}
            user={user}
            onSignOut={handleSignOut}
            onNavigate={() => setSidebarCollapsed(true)}
          />
          {!sidebarCollapsed && (
            <button
              type="button"
              className="sidebar-backdrop"
              aria-label="Close navigation"
              onClick={() => setSidebarCollapsed(true)}
            />
          )}

          <main className="main-content">
            <Navbar
              onToggleSidebar={() => setSidebarCollapsed(prev => !prev)}
              sidebarExpanded={!sidebarCollapsed}
              user={user}
              darkMode={darkMode}
              onToggleDark={toggleDarkMode}
            />

            <div className="content-body">
              <Suspense fallback={<div className="route-loading">Loading overview…</div>}>
                <Routes>
                <Route path="/"              element={<Dashboard darkMode={darkMode} />} />
                <Route path="/transactions"  element={<Transactions />} />
                <Route path="/budgets"       element={<Budgets />} />
                <Route path="/goals"         element={<Goals />} />
                <Route path="/subscriptions" element={<Subscriptions />} />
                <Route path="/forecast"      element={<Forecast />} />
                <Route path="/advisor"       element={<AiAdvisor />} />
                <Route path="/ocr"           element={<OcrScanner />} />
                <Route path="/preferences"   element={<Preferences darkMode={darkMode} onToggleDark={toggleDarkMode} />} />
                <Route path="/account"       element={<Account       user={user} onSignOut={handleSignOut} />} />
                <Route path="*"              element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </div>
          </main>
        </div>
      )}
    </BrowserRouter>
  );
}
