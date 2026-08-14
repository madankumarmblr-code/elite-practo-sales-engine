import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const links = [
  { to: '/pulse', label: 'Dashboard', end: true },
  { to: '/pulse/leads', label: 'Lead Engine' },
  { to: '/pulse/outreach', label: 'Outreach' },
  { to: '/pulse/pitch', label: 'Pitch Studio' },
  { to: '/pulse/meetings', label: 'Meetings' },
  { to: '/pulse/autopilot', label: 'AI Autopilot' },
  { to: '/pulse/commercial', label: 'Commercial Suite' },
  { to: '/pulse/status', label: 'Server & API' },
  { to: '/pulse/settings', label: 'Settings · n8n' },
];

export default function PulseLayout() {
  const { user, logout, can } = useAuth();
  const isSuper = can('users:write') || user?.role === 'superadmin';

  return (
    <div className="pulse-shell pulse-shell-full px-shell">
      <aside className="pulse-side px-side">
        <div className="pulse-brand px-brand">
          <img src="/practo-logo-light.svg" alt="" className="px-side-logo" />
          <strong>PractoPulse</strong>
          <small>Healthcare B2B sales</small>
          <svg className="px-ecg" viewBox="0 0 120 24" aria-hidden>
            <path
              d="M0 12 H18 L24 12 L28 4 L34 20 L40 8 L46 12 H120"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <nav className="pulse-nav px-nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
            </NavLink>
          ))}
          {isSuper ? <NavLink to="/pulse/superadmin">Super Admin</NavLink> : null}
        </nav>
        <div className="pulse-side-foot px-side-foot">
          <div>
            <strong style={{ color: '#e2e8f0', fontWeight: 600 }}>{user?.name || 'AE / SDR'}</strong>
            <div className="muted">{user?.email}</div>
            <div className="muted" style={{ marginTop: 4 }}>
              {user?.roleLabel || user?.role}
            </div>
          </div>
          <button type="button" className="pulse-btn ghost" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <div className="pulse-main px-main">
        <Outlet />
      </div>
    </div>
  );
}
