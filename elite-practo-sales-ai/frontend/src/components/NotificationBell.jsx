import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';

export default function NotificationBell({ onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef(null);

  async function fetchNotifications() {
    try {
      const res = await api.getNotifications(15);
      if (res) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unread || 0);
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  // Close when clicked outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleMarkAllRead() {
    try {
      await api.markNotificationsRead();
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
    } catch {
      // ignore
    }
  }

  function handleNotificationClick(notif) {
    if (notif.link && onNavigate) {
      const page = notif.link.replace(/^\//, '');
      onNavigate(page);
    }
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={menuRef} style={{ position: 'relative' }}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          background: isOpen ? '#EEF2F6' : '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          width: 38,
          height: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          fontSize: 16,
        }}
        title="Notifications & Autopilot Alerts"
      >
        <span>🔔</span>
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              background: '#EF4444',
              color: '#FFFFFF',
              borderRadius: 10,
              padding: '1px 5px',
              fontSize: 10,
              fontWeight: 800,
              lineHeight: 1.2,
              border: '2px solid #FFFFFF',
              boxShadow: '0 2px 4px rgba(239, 68, 68, 0.3)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="fade-in"
          style={{
            position: 'absolute',
            top: 46,
            right: 0,
            width: 360,
            maxWidth: '90vw',
            background: '#FFFFFF',
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(15, 23, 42, 0.16), 0 2px 6px rgba(15, 23, 42, 0.08)',
            border: '1px solid #E2E8F0',
            zIndex: 9999,
            overflow: 'hidden',
          }}
        >
          {/* Panel Header */}
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#F8FAFC',
            }}
          >
            <div className="flex items-center gap-2">
              <span style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>Notifications</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    background: '#FEE2E2',
                    color: '#B91C1C',
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 6,
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#1456FD',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List of Notifications */}
          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748B', fontSize: 13 }}>
                <span style={{ fontSize: 24, display: 'block', marginBottom: 6 }}>✨</span>
                No new notifications. All leads up to date!
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = notif.is_read === 0;
                const isWarn = notif.type === 'warning';
                const isSuccess = notif.type === 'success';

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #F1F5F9',
                      background: isUnread ? (isWarn ? '#FFFBEB' : '#F0FDF4') : '#FFFFFF',
                      cursor: notif.link ? 'pointer' : 'default',
                      transition: 'background 0.15s ease',
                      display: 'flex',
                      gap: 12,
                    }}
                  >
                    <div style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>
                      {isWarn ? '⚠️' : isSuccess ? '✅' : '🔔'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: isUnread ? 700 : 600,
                          fontSize: 12.5,
                          color: '#0F172A',
                          marginBottom: 3,
                        }}
                      >
                        {notif.title}
                      </div>
                      <p
                        style={{
                          fontSize: 11.5,
                          color: '#475569',
                          margin: 0,
                          lineHeight: 1.4,
                        }}
                      >
                        {notif.message}
                      </p>
                      <div
                        style={{
                          fontSize: 10,
                          color: '#94A3B8',
                          marginTop: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{notif.created_at || 'Recently'}</span>
                        {notif.link && (
                          <span style={{ color: '#1456FD', fontWeight: 600 }}>View →</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Panel Footer */}
          <div
            style={{
              padding: '8px 16px',
              borderTop: '1px solid #E2E8F0',
              background: '#F8FAFC',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: 11, color: '#64748B' }}>
              Autopilot, Sarvam Calls & WhatsApp alerts
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
