import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrm } from '../context/CrmContext';

const NOTIFS = [
  { id: 1, cat: 'Deals', title: 'Deal Won — Dr. Shalini Varma', desc: 'Practo Reach slot booked for ₹4.8L/yr.', time: '2m', unread: true, icon: '🏆' },
  { id: 2, cat: 'Voice AI', title: 'Voice Bot Completed Pitch', desc: 'Dr. Aarav Mehta requested proposal walkthrough.', time: '14m', unread: true, icon: '📞' },
  { id: 3, cat: 'WhatsApp', title: 'WhatsApp Reply Received', desc: '"Reviewing contract with clinic finance."', time: '1h', unread: true, icon: '💬' },
  { id: 4, cat: 'Compliance', title: 'DPDP Consent Verified', desc: 'Consent token #DPDP-99201 generated.', time: '3h', unread: false, icon: '🛡️' },
];

import ProfilePictureModal from './ProfilePictureModal';
import ManualPushModal from './ManualPushModal';

export default function Navbar({ onOpenLeadModal, onToggleSidebar, collapsed }) {
  const navigate = useNavigate();
  const { currentRole, handleSwitchRole, availableRoles, liveActivities, currentUser, logout, isManualPushOpen, setIsManualPushOpen, isProfilePicModalOpen, setIsProfilePicModalOpen } = useCrm();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState(NOTIFS);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (liveActivities?.length > 0) {
      const l = liveActivities[0];
      setNotifs(p => [{ id: Date.now(), cat: 'System', title: l.action?.replace(/_/g, ' ') || 'Event', desc: l.entity || '', time: 'now', unread: true, icon: '⚡' }, ...p.slice(0, 19)]);
    }
  }, [liveActivities]);

  const unread = notifs.filter(n => n.unread).length;
  const filtered = activeTab === 'All' ? notifs : notifs.filter(n => n.cat === activeTab);

  /* Close menus on outside click */
  useEffect(() => {
    const h = () => { setShowRoleMenu(false); setShowUserMenu(false); };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  const stopProp = (e) => e.stopPropagation();

  return (
    <>
      <header
        style={{
          height: 'var(--header-height)',
          background: '#FFFFFF',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onToggleSidebar} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', borderRadius: 'var(--radius-xs)', display: 'flex' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div style={{ position: 'relative', width: '260px' }}>
            <svg style={{ position: 'absolute', left: '10px', top: '8px', color: 'var(--text-muted)' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search leads, doctors..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 12px 7px 32px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'border-color var(--transition-fast)',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--practo-cyan)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border-subtle)')}
            />
          </div>

          {/* Status pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#059669', fontWeight: 600, background: '#D1FAE5', padding: '3px 8px', borderRadius: 'var(--radius-full)' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#059669', animation: 'pulseHalo 2s infinite' }} />
            Live Engine
          </div>
        </div>

        {/* Right */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsManualPushOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '5px 10px',
              fontSize: '12px',
              fontWeight: 700,
              border: '1.5px solid #233876',
              color: '#233876',
              background: '#F8FAFC',
            }}
          >
            ⚡ + Manual Push
          </button>

          <button onClick={onOpenLeadModal} className="btn btn-primary btn-sm">+ New Lead</button>

          {/* Bell */}
          <button
            onClick={(e) => { stopProp(e); setShowNotifs(true); }}
            style={{ position: 'relative', background: 'none', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '6px 8px', cursor: 'pointer', color: 'var(--text-secondary)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unread > 0 && (
              <span style={{ position: 'absolute', top: '-3px', right: '-3px', background: '#EF4444', color: '#FFF', fontSize: '9px', fontWeight: 700, width: '15px', height: '15px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unread}
              </span>
            )}
          </button>

          {/* User avatar with custom picture support */}
          <div style={{ position: 'relative' }} onClick={stopProp}>
            <div
              onClick={() => setShowUserMenu(!showUserMenu)}
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#233876',
                color: '#FFF',
                fontWeight: 700,
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                border: '2px solid #E2E8F0',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              }}
              title="User Profile & Settings"
            >
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                currentUser?.name?.charAt(0) || 'U'
              )}
            </div>

            {showUserMenu && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 6px)', width: '220px', background: '#FFF', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)', padding: '10px', zIndex: 50, animation: 'fadeInUp 0.15s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '8px' }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      background: '#233876',
                      color: '#FFF',
                      fontWeight: 800,
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {currentUser?.avatar ? (
                      <img src={currentUser.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      currentUser?.name?.charAt(0) || 'U'
                    )}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-heading)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentUser?.name || 'Admin'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {currentUser?.email || 'admin@practo.sales'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setIsProfilePicModalOpen(true);
                  }}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: 'var(--radius-xs)', border: 'none', background: '#F8FAFC', color: '#233876', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>📸</span>
                  <span>Set Profile Picture</span>
                </button>

                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    setIsManualPushOpen(true);
                  }}
                  style={{ width: '100%', padding: '7px 8px', borderRadius: 'var(--radius-xs)', border: 'none', background: '#F8FAFC', color: '#0F172A', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>⚡</span>
                  <span>Manual Number Push</span>
                </button>

                <button
                  onClick={() => { setShowUserMenu(false); navigate('/settings'); }}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius-xs)', border: 'none', background: 'transparent', color: 'var(--text-primary)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}
                >
                  ⚙️ System Settings
                </button>

                <button
                  onClick={logout}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 'var(--radius-xs)', border: 'none', background: '#FEE2E2', color: '#DC2626', fontSize: '12px', fontWeight: 600, cursor: 'pointer', textAlign: 'left', marginTop: '6px' }}
                >
                  🚪 Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Global Modals */}
      {isProfilePicModalOpen && <ProfilePictureModal onClose={() => setIsProfilePicModalOpen(false)} />}
      {isManualPushOpen && <ManualPushModal onClose={() => setIsManualPushOpen(false)} />}

      {/* ── Notification Slide-Out ─────────────────── */}
      {showNotifs && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.2)' }}
          onClick={() => setShowNotifs(false)}
        >
          <div style={{ width: '100%', maxWidth: '380px', height: '100%', background: '#FFF', borderLeft: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', animation: 'slideInRight 0.2s ease' }} onClick={stopProp}>
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Notifications</h3>
              <button onClick={() => setShowNotifs(false)} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
            </div>

            {/* Tabs */}
            <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '4px', background: '#F9FAFB' }}>
              {['All', 'Deals', 'Voice AI', 'WhatsApp', 'Compliance'].map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  style={{ padding: '3px 8px', borderRadius: 'var(--radius-xs)', border: 'none', background: activeTab === t ? 'var(--practo-cyan)' : '#FFF', color: activeTab === t ? '#FFF' : 'var(--text-secondary)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                >{t}</button>
              ))}
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filtered.map(n => (
                <div key={n.id} style={{ padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: n.unread ? '#F9FAFB' : '#FFF', border: '1px solid var(--border-subtle)', display: 'flex', gap: '10px', transition: 'background var(--transition-fast)' }}>
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>{n.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-heading)' }}>{n.title}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '1px' }}>{n.desc}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>{n.time}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setNotifs(p => p.map(n => ({ ...n, unread: false })))} style={{ background: 'none', border: 'none', color: 'var(--practo-cyan)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Mark all read</button>
              <button onClick={() => setNotifs([])} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Clear</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
