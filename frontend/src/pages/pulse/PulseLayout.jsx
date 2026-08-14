import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const links = [
  { to: '/pulse', label: 'Dashboard', end: true },
  { to: '/pulse/leads', label: 'Lead Finder' },
  { to: '/pulse/outreach', label: 'Outreach' },
  { to: '/pulse/pitch', label: 'Pitch Studio' },
  { to: '/pulse/meetings', label: 'Meetings' },
  { to: '/pulse/settings', label: 'Pulse Settings' },
];

export default function PulseLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="pulse-shell pulse-shell-full">
      <aside className="pulse-side">
        <div className="pulse-brand">
          <strong>PractoPulse</strong>
          <small>B2B Sales Engine</small>
        </div>
        <nav className="pulse-nav">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {l.label}
            </NavLink>
          ))}
        </nav>
        <div className="pulse-side-links">
          <Link to="/lead-generator">Lead Generator</Link>
          <Link to="/commercial-suite">Commercial Suite</Link>
        </div>
        <div className="pulse-side-foot">
          <div>
            {user?.name || 'AE / SDR'}
            <div className="muted">{user?.email}</div>
          </div>
          <button type="button" className="pulse-btn ghost" onClick={logout}>
            Sign out
          </button>
          <div style={{ marginTop: 8 }}>Reach &amp; Prime · Inside Sales</div>
        </div>
      </aside>
      <div className="pulse-main">
        <Outlet />
      </div>
    </div>
  );
}
