import { useEffect, useState, useRef } from 'react';
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import { animate } from 'motion';

const navSections = [
  {
    title: 'Core CRM & Discovery',
    links: [
      { to: '/pulse', label: '📊 Command Center', end: true },
      { to: '/pulse/leads', label: '🔍 Clinic Discovery' },
      { to: '/pulse/validation', label: '✅ Lead Validation' },
      { to: '/pulse/crm', label: '🗂️ CRM Hub & Kanban' },
    ],
  },
  {
    title: 'AI Pilot & Intelligence',
    links: [
      { to: '/pulse/pitch-studio', label: '⚡ AI Pitch Studio' },
      { to: '/pulse/reports', label: '📈 Custom Reports' },
    ],
  },
  {
    title: 'Autonomous Outreach',
    links: [
      { to: '/pulse/autopilot', label: '⚡ Autopilot Center' },
      { to: '/pulse/calls', label: '📞 Autopilot Calls' },
      { to: '/pulse/whatsapp', label: '💬 Autopilot WhatsApp' },
      { to: '/pulse/email', label: '✉️ Autopilot Email' },
    ],
  },
  {
    title: 'Governance & Revenue',
    links: [
      { to: '/pulse/commercial', label: '📑 Commercial Suite' },
      { to: '/pulse/audit', label: '🛡️ Audit & Compliance' },
      { to: '/pulse/settings', label: '⚙️ Platform Settings' },
      { to: '/pulse/status', label: '🔌 API & Integrations' },
    ],
  },
];

export default function PulseLayout() {
  const { user, logout, can } = useAuth();
  const toast = useToast();
  const isSuper = can('users:write') || user?.role === 'superadmin';
  const location = useLocation();
  const mainRef = useRef(null);

  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  // Theme Management: 'dark' | 'light'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('practo_theme') || 'dark';
  });

  // Mobile drawer state
  const [mobileSideOpen, setMobileSideOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('practo_theme', theme);
  }, [theme]);

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    toast(next === 'dark' ? '🌙 Dark Mode Activated' : '☀️ Light Mode Activated');
  }

  // Motion: page transition on route change
  useEffect(() => {
    if (mainRef.current) {
      animate(
        mainRef.current,
        { opacity: [0, 1], y: [12, 0] },
        { duration: 0.35, easing: [0.22, 1, 0.36, 1] }
      );
    }
    setMobileSideOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  async function loadNotifications() {
    try {
      const data = await api.getNotifications({ limit: 15 });
      setNotifications(data.notifications || []);
    } catch {
      // ignore in polling
    }
  }

  async function handleMarkRead(ids) {
    try {
      await api.markNotificationsRead(ids);
      loadNotifications();
      toast('Notifications marked as read');
    } catch (err) {
      toast(err.message || 'Failed to mark read');
    }
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="pulse-shell pulse-shell-full px-shell">
      {/* Mobile Drawer Overlay Backdrop */}
      {mobileSideOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 998,
          }}
          onClick={() => setMobileSideOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`pulse-side px-side ${mobileSideOpen ? 'open' : ''}`}>
        <div className="pulse-brand px-brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img
              src={theme === 'dark' ? '/practo-logo.svg' : '/practo-logo-light.svg'}
              alt="Practo"
              className="px-side-logo"
              style={{ height: 26 }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <strong style={{ fontSize: '1.05rem', letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
              PractoPulse
            </strong>
          </div>
          <small>Autonomous Healthcare B2B Sales</small>
          <svg className="px-ecg" viewBox="0 0 120 24" aria-hidden style={{ color: '#2dd4bf' }}>
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

        <nav className="pulse-nav px-nav" style={{ gap: 14 }}>
          {navSections.map((sec) => (
            <div key={sec.title} className="pulse-nav-group">
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--muted, #64748b)',
                  padding: '4px 10px 2px',
                }}
              >
                {sec.title}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {sec.links.map((l) => (
                  <NavLink key={l.to} to={l.to} end={l.end}>
                    {l.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {isSuper ? (
            <div className="pulse-nav-group">
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: '#fbbf24',
                  padding: '4px 10px 2px',
                }}
              >
                Super Admin
              </div>
              <NavLink to="/pulse/superadmin" style={{ color: '#fbbf24' }}>
                ⭐ Super Admin Suite
              </NavLink>
            </div>
          ) : null}
        </nav>

        <div className="pulse-side-foot px-side-foot">
          <div>
            <strong style={{ color: 'var(--text-main, #e2e8f0)', fontWeight: 600 }}>
              {user?.name || 'Practo AE'}
            </strong>
            <div className="muted">{user?.email}</div>
            <div className="muted" style={{ marginTop: 2, fontSize: '0.72rem' }}>
              {user?.roleLabel || user?.role}
            </div>
          </div>
          <button type="button" className="pulse-btn ghost" onClick={logout} style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem' }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="pulse-main px-main" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Top Control Bar */}
        <header
          className="pulse-topbar"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 24px',
            backdropFilter: 'blur(16px)',
            position: 'sticky',
            top: 0,
            zIndex: 90,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="pulse-btn ghost mobile-only"
              onClick={() => setMobileSideOpen(!mobileSideOpen)}
              style={{ padding: '4px 8px', fontSize: '1.1rem' }}
            >
              ☰
            </button>

            <span className="pulse-status-pill ok" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>
              🟢 Autopilot Engine Online
            </span>
            <span className="muted desktop-only" style={{ fontSize: '0.8rem' }}>
              AI Pitch Studio · WhatsApp Drips · HIPAA/DPDP Compliant
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Theme Toggle Button */}
            <button
              type="button"
              className="pulse-btn ghost"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
              style={{
                padding: '0.4rem 0.75rem',
                fontSize: '0.9rem',
                borderRadius: 8,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
            </button>

            {/* Notifications Bell Dropdown */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button
                type="button"
                className="pulse-btn ghost"
                onClick={() => setNotifOpen((o) => !o)}
                title="Notifications"
                style={{
                  position: 'relative',
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.9rem',
                  borderRadius: 8,
                }}
              >
                🔔
                {unreadCount > 0 ? (
                  <span
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      background: '#ef4444',
                      color: '#fff',
                      fontSize: '0.65rem',
                      fontWeight: 'bold',
                      borderRadius: '50%',
                      width: 16,
                      height: 16,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    {unreadCount}
                  </span>
                ) : null}
              </button>

              {/* Notification Menu Dropdown */}
              {notifOpen ? (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 360,
                    background: 'var(--card-bg, #0f172a)',
                    border: '1px solid var(--border-subtle, rgba(148, 163, 184, 0.2))',
                    borderRadius: 12,
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                    padding: 12,
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6, borderBottom: '1px solid var(--border-subtle, rgba(148, 163, 184, 0.15))' }}>
                    <strong style={{ fontSize: '0.85rem' }}>System Notifications</strong>
                    {unreadCount > 0 ? (
                      <button
                        type="button"
                        className="pulse-btn ghost"
                        style={{ padding: '0.15rem 0.45rem', fontSize: '0.72rem' }}
                        onClick={() => handleMarkRead(notifications.map((n) => n.id))}
                      >
                        Mark all read
                      </button>
                    ) : null}
                  </div>

                  <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        style={{
                          padding: '8px 10px',
                          borderRadius: 8,
                          background: n.is_read ? 'transparent' : 'rgba(45, 212, 191, 0.08)',
                          borderLeft: `3px solid ${
                            n.type === 'success'
                              ? '#2dd4bf'
                              : n.type === 'warn'
                              ? '#f59e0b'
                              : '#38bdf8'
                          }`,
                          fontSize: '0.8rem',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: 'var(--text-main, #f8fafc)' }}>{n.title}</strong>
                          <span className="muted" style={{ fontSize: '0.68rem' }}>
                            {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p style={{ margin: '3px 0 0', color: 'var(--muted, #cbd5e1)', fontSize: '0.75rem' }}>
                          {n.message}
                        </p>
                        {n.link ? (
                          <Link
                            to={n.link}
                            onClick={() => setNotifOpen(false)}
                            style={{ fontSize: '0.72rem', color: '#38bdf8', display: 'inline-block', marginTop: 3 }}
                          >
                            View details →
                          </Link>
                        ) : null}
                      </div>
                    ))}
                    {!notifications.length ? (
                      <div className="muted" style={{ textAlign: 'center', padding: '1rem 0', fontSize: '0.8rem' }}>
                        No new notifications
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        {/* Page Content — Motion animates opacity+y on route change */}
        <div ref={mainRef} style={{ flex: 1 }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
