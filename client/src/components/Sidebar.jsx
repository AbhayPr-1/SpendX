import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  Target,
  CalendarDays,
  TrendingUp,
  Sparkles,
  ScanLine,
  Sliders,
  User,
  LogOut,
} from 'lucide-react';

const navigationGroups = [
  {
    title: 'Workspace',
    items: [
      { label: 'Overview', to: '/', icon: LayoutDashboard, end: true },
      { label: 'Transactions', to: '/transactions', icon: Receipt },
      { label: 'Budgets', to: '/budgets', icon: PiggyBank },
      { label: 'Savings goals', to: '/goals', icon: Target },
      { label: 'Subscriptions', to: '/subscriptions', icon: CalendarDays },
    ],
  },
  {
    title: 'Insights',
    items: [
      { label: 'Forecast', to: '/forecast', icon: TrendingUp },
      { label: 'AI advisor', to: '/advisor', icon: Sparkles },
      { label: 'Receipt scanner', to: '/ocr', icon: ScanLine },
    ],
  },
  {
    title: 'Settings',
    items: [
      { label: 'Preferences', to: '/preferences', icon: Sliders },
      { label: 'Account', to: '/account', icon: User },
    ],
  },
];

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className="brand-mark-svg">
      <path d="M8 11h5a4 4 0 0 0 4-4V6m-1 20v-1a4 4 0 0 1 4-4h4M8 21h4a4 4 0 0 0 4-4v-2a4 4 0 0 1 4-4h4" />
      <circle cx="8" cy="11" r="2.5" />
      <circle cx="24" cy="6" r="2.5" />
      <circle cx="8" cy="21" r="2.5" />
      <circle cx="24" cy="26" r="2.5" />
    </svg>
  );
}

export default function Sidebar({ collapsed, user, onSignOut, onNavigate }) {
  const displayName = user?.name || user?.username || 'My account';
  const displayEmail = user?.email || 'Personal workspace';
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'U';

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} id="sidebar" aria-label="Main navigation">
      <div className="sidebar-header">
        <NavLink to="/" className="sidebar-brand" onClick={onNavigate} aria-label="SpendX overview">
          <span className="brand-mark"><BrandMark /></span>
          <span className="brand-name">SpendX</span>
        </NavLink>
      </div>

      <nav className="sidebar-nav">
        {navigationGroups.map((group) => (
          <section className="sidebar-section" key={group.title} aria-label={group.title}>
            <h2 className="sidebar-heading">{group.title}</h2>
            <ul className="nav-links">
              {group.items.map(({ label, to, icon: Icon, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    title={label}
                    aria-label={label}
                    onClick={onNavigate}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  >
                    <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                    <span className="nav-label">{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-avatar" aria-hidden="true">{initials}</div>
        <div className="user-info">
          <span className="user-name">{displayName}</span>
          <span className="user-email">{displayEmail}</span>
        </div>
        <button
          type="button"
          className="sidebar-signout"
          onClick={onSignOut}
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={18} aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
