import React from 'react';
import { NavLink } from 'react-router-dom';
import { useCrm } from '../context/CrmContext';
import { PractoLogo } from './PractoLogo';

/* Feather-style SVG icon helper */
const Icon = ({ children, size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const NAV = [
  {
    section: 'Home',
    items: [
      { to: '/', label: 'Home', icon: <Icon><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></Icon> },
      { to: '/dashboard', label: 'Dashboard', icon: <Icon><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></Icon> },
    ],
  },
  {
    section: 'Sales',
    items: [
      { to: '/leads', label: 'Lead Scraper', badge: 'NEW', icon: <Icon><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Icon> },
      { to: '/pipeline', label: 'CRM Pipeline', icon: <Icon><rect x="3" y="3" width="5" height="18" rx="1" /><rect x="10" y="8" width="5" height="13" rx="1" /><rect x="17" y="5" width="5" height="16" rx="1" /></Icon> },
      { to: '/proposal', label: 'Proposal Suite', badge: 'New', icon: <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></Icon> },
      { to: '/amoga', label: 'Amoga Work OS', badge: 'Sync', icon: <Icon><circle cx="12" cy="12" r="10" /><path d="M8 12h8M12 8v8" /></Icon> },
      { to: '/aipilot', label: 'AI Pilot', badge: 'Auto', icon: <Icon><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></Icon> },
      { to: '/inventory', label: 'Slot Inventory', badge: 'Live', icon: <Icon><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" /></Icon> },
    ],
  },
  {
    section: 'Channels',
    items: [
      { to: '/ai-calls', label: 'Voice Calling', badge: 'AI', icon: <Icon><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></Icon> },
      { to: '/ai-whatsapp', label: 'WhatsApp', icon: <Icon><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></Icon> },
      { to: '/ai-mailing', label: 'Email Pitches', icon: <Icon><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></Icon> },
      { to: '/integrations', label: 'Integrations', icon: <Icon><circle cx="12" cy="12" r="3" /><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></Icon> },
    ],
  },
  {
    section: 'Operations',
    items: [
      { to: '/team', label: 'Team & Access', badge: 'RBAC', icon: <Icon><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Icon> },
      { to: '/reports', label: 'Reports', icon: <Icon><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></Icon> },
      { to: '/audit', label: 'Audit Logs', icon: <Icon><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></Icon> },
      { to: '/privacy', label: 'Privacy & DPDP', icon: <Icon><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Icon> },
      { to: '/settings', label: 'Settings', icon: <Icon><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></Icon> },
    ],
  },
];


export default function Sidebar({ collapsed, setCollapsed }) {
  const { currentRole, currentUser, logout } = useCrm();

  return (
    <aside
      style={{
        width: collapsed ? 'var(--sidebar-collapsed-width)' : 'var(--sidebar-width)',
        height: '100vh',
        backgroundColor: '#FFFFFF',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 40,
        transition: 'width var(--transition-smooth)',
      }}
    >
      {/* ── Brand Header ──────────────────────── */}
      <div
        style={{
          height: 'var(--header-height)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0' : '0 16px',
          borderBottom: '1px solid var(--border-subtle)',
          flexShrink: 0,
        }}
      >
        {collapsed ? (
          <PractoLogo size="sm" variant="icon" />
        ) : (
          <PractoLogo size="sm" variant="full" showTag tagText="CRM" />
        )}

        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Icon size={16}><polyline points="11 17 6 12 11 7" /><polyline points="18 17 13 12 18 7" /></Icon>
          </button>
        )}
      </div>

      {/* ── Navigation ────────────────────────── */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
        {NAV.map((group, gi) => (
          <div key={gi} style={{ marginBottom: '16px' }}>
            {!collapsed && (
              <div
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  color: 'var(--text-muted)',
                  padding: '4px 12px 6px',
                }}
              >
                {group.section}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  title={collapsed ? item.label : undefined}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: collapsed ? '10px' : '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    textDecoration: 'none',
                    fontSize: '13.5px',
                    fontWeight: isActive ? 700 : 500,
                    color: isActive ? 'var(--practo-navy)' : 'var(--text-secondary)',
                    backgroundColor: isActive ? 'var(--practo-cyan-light)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--practo-cyan)' : '3px solid transparent',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    transition: 'all var(--transition-fast)',
                  })}
                >
                  {({ isActive }) => (
                    <>
                      <div style={{ color: isActive ? 'var(--practo-cyan)' : 'var(--text-muted)', display: 'flex', flexShrink: 0 }}>
                        {item.icon}
                      </div>
                      {!collapsed && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                          {item.badge && (
                            <span
                              style={{
                                fontSize: '9.5px',
                                fontWeight: 800,
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-xs)',
                                backgroundColor: isActive ? '#FFFFFF' : 'var(--practo-cyan-light)',
                                color: 'var(--practo-navy)',
                                border: '1px solid rgba(40, 184, 232, 0.25)',
                                marginLeft: '4px',
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Profile Footer ────────────────────── */}
      <div
        style={{
          padding: '12px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--practo-cyan)',
              color: '#FFF',
              fontWeight: 700,
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {currentUser?.name?.charAt(0) || 'U'}
          </div>

          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser?.name || 'Admin'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 500 }}>
                {currentRole?.replace('_', ' ') || 'superadmin'}
              </div>
            </div>
          )}
        </div>

        {!collapsed && (
          <button
            onClick={logout}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: 'var(--radius-xs)',
              display: 'flex',
            }}
            title="Sign Out"
          >
            <Icon size={16}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </Icon>
          </button>
        )}
      </div>
    </aside>
  );
}
