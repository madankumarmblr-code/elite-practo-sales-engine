import React, { useState, useCallback, useEffect } from 'react';
import { api, getToken, setToken } from './api/client.js';
import PractoLogo from './components/PractoLogo.jsx';
import NotificationBell from './components/NotificationBell.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LeadScraperPage from './pages/LeadScraperPage.jsx';
import LeadsPage from './pages/LeadsPage.jsx';
import AutopilotPage from './pages/AutopilotPage.jsx';
import ProposalSuitePage from './pages/ProposalSuitePage.jsx';
import ReachInventoryPage from './pages/ReachInventoryPage.jsx';
import VoiceCallsPage from './pages/VoiceCallsPage.jsx';
import WhatsAppPage from './pages/WhatsAppPage.jsx';
import EmailAIPage from './pages/EmailAIPage.jsx';
import ServerStatusPage from './pages/ServerStatusPage.jsx';
import UsersManagementPage from './pages/UsersManagementPage.jsx';
import IntegrationsPage from './pages/IntegrationsPage.jsx';
import AuditPage from './pages/AuditPage.jsx';

import EnterpriseIcon from './components/EnterpriseIcon.jsx';

const NAV = [
  { id: 'dashboard', iconName: 'bar-chart', label: 'Dashboard' },
  { id: null, label: 'DISCOVERY & CRM', section: true },
  { id: 'scraper', iconName: 'search', label: 'Lead Scraper' },
  { id: 'leads', iconName: 'users', label: 'CRM Leads' },
  { id: null, label: 'AUTOMATION & OUTREACH', section: true },
  { id: 'autopilot', iconName: 'zap', label: 'Autopilot AI' },
  { id: 'voice', iconName: 'phone', label: 'Call AI Studio' },
  { id: 'whatsapp', iconName: 'message', label: 'WhatsApp AI Studio' },
  { id: 'email', iconName: 'mail', label: 'Email AI Studio' },
  { id: null, label: 'COMMERCIAL & INVENTORY', section: true },
  { id: 'proposals', iconName: 'file-text', label: 'Proposal Suite' },
  { id: 'inventory', iconName: 'layers', label: 'Reach Inventory Check' },
  { id: null, label: 'SYSTEM & SETTINGS', section: true },
  { id: 'status', iconName: 'activity', label: 'Server Status' },
  { id: 'users', iconName: 'users', label: 'Users & Permissions' },
  { id: 'integrations', iconName: 'sliders', label: 'API & Storage' },
  { id: 'audit', iconName: 'shield', label: 'Audit & Compliance' },
];

function Sidebar({ user, activePage, setActivePage, onLogout, onShowLogin }) {
  return (
    <aside className="sidebar">
      {/* Official Practo Brand Logo Header */}
      <div className="sidebar-logo" style={{ padding: '20px 18px', borderBottom: '1px solid var(--border)' }}>
        <PractoLogo size="md" showTagline={true} tagline="Sales Intelligence AI" />
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV.map((item, i) => {
          if (item.section) {
            return (
              <div key={`section-${i}`} className="nav-section-label">
                {item.label}
              </div>
            );
          }
          return (
            <button
              key={item.id}
              className={`nav-item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => setActivePage(item.id)}
            >
              <span className="nav-icon" style={{ display: 'inline-flex', alignItems: 'center' }}>
                <EnterpriseIcon name={item.iconName} size={17} />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* User Profile & Sign Out */}
      <div style={{ padding: '16px 18px', borderTop: '1px solid var(--border)', background: '#FAFAFC' }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #1456FD, #0D9488)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 800,
              color: '#FFFFFF',
              flexShrink: 0,
            }}
          >
            {(user?.name || '?')[0].toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }} className="truncate">
              {user?.name || 'User'}
            </div>
            <div style={{ fontSize: 11, color: '#64748B', textTransform: 'capitalize' }}>
              {user?.role?.replace('_', ' ') || 'agent'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            className="btn btn-secondary btn-sm w-full"
            style={{ justifyContent: 'center', fontSize: 12, gap: 6 }}
            onClick={onShowLogin}
            title="Switch user or review login"
          >
            <EnterpriseIcon name="users" size={14} /> Switch User
          </button>
          <button
            className="btn btn-ghost btn-sm w-full"
            style={{ justifyContent: 'center', fontSize: 12, color: '#64748B', gap: 6 }}
            onClick={onLogout}
          >
            <EnterpriseIcon name="shield" size={14} /> Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [activePage, setActivePage] = useState('scraper');
  const [showLoginScreen, setShowLoginScreen] = useState(() => {
    return window.location.search.includes('login=true');
  });

  // Check stored token on load
  useEffect(() => {
    if (window.location.search.includes('login=true')) {
      setAuthChecked(true);
      setShowLoginScreen(true);
      return;
    }

    if (!getToken()) {
      setAuthChecked(true);
      setShowLoginScreen(true);
      return;
    }

    api.getMe()
      .then((me) => {
        setUser(me);
        setAuthChecked(true);
      })
      .catch(() => {
        setToken(null);
        setAuthChecked(true);
        setShowLoginScreen(true);
      });
  }, []);

  const handleLogin = useCallback((u) => {
    setUser(u);
    setShowLoginScreen(false);
    if (window.location.search.includes('login=true')) {
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleLogout = useCallback(() => {
    api.logout().catch(() => {});
    setToken(null);
    setUser(null);
    setShowLoginScreen(true);
  }, []);

  const handleShowLogin = useCallback(() => {
    setShowLoginScreen(true);
  }, []);

  if (!authChecked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 16 }}>
        <div className="spinner" style={{ width: 44, height: 44, borderWidth: 3.5 }} />
        <p className="text-secondary" style={{ fontSize: 13, fontWeight: 500 }}>Starting Practo Sales Engine...</p>
      </div>
    );
  }

  // Show Login Page if requested or not logged in
  if (!user || showLoginScreen) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const PAGE_MAP = {
    dashboard: <DashboardPage />,
    scraper: <LeadScraperPage />,
    leads: <LeadsPage />,
    autopilot: <AutopilotPage />,
    proposals: <ProposalSuitePage />,
    inventory: <ReachInventoryPage />,
    voice: <VoiceCallsPage />,
    whatsapp: <WhatsAppPage />,
    email: <EmailAIPage />,
    status: <ServerStatusPage />,
    users: <UsersManagementPage />,
    integrations: <IntegrationsPage />,
    audit: <AuditPage />,
  };

  const currentNav = NAV.find((n) => n.id === activePage) || { label: 'Practo Sales Engine', icon: '⚡' };

  return (
    <div className="app-layout">
      <Sidebar
        user={user}
        activePage={activePage}
        setActivePage={setActivePage}
        onLogout={handleLogout}
        onShowLogin={handleShowLogin}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar across all views */}
        <header
          style={{
            height: 60,
            background: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          {/* Left: Active Breadcrumb */}
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 18 }}>{currentNav.icon}</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>
              {currentNav.label}
            </span>
          </div>

          {/* Right: Quick actions, notifications, status, user */}
          <div className="flex items-center gap-4">
            {/* Live Server Status Quick Link */}
            <button
              type="button"
              onClick={() => setActivePage('status')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 20,
                background: '#F0FDF4',
                border: '1px solid #BBF7D0',
                fontSize: 11,
                fontWeight: 700,
                color: '#166534',
                cursor: 'pointer',
              }}
              title="View Google AI Studio Style Server Health"
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#10B981' }} />
              <span>All Systems Operational</span>
            </button>

            {/* Interactive Notification Bell */}
            <NotificationBell onNavigate={setActivePage} />

            {/* User Avatar & Login Screen Switcher */}
            <button
              type="button"
              onClick={handleShowLogin}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                padding: '4px 10px',
                borderRadius: 20,
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
                color: '#334155',
              }}
              title="Click to Switch Account or view Login Screen"
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1456FD, #0D9488)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 800,
                  color: '#FFFFFF',
                }}
              >
                {(user?.name || 'U')[0].toUpperCase()}
              </div>
              <span>{user?.name?.split(' ')[0] || 'User'}</span>
              <span style={{ fontSize: 10, color: '#94A3B8' }}>🔒 Switch</span>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="main-content" style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
          <ErrorBoundary key={activePage}>
            {PAGE_MAP[activePage] || <LeadScraperPage />}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
