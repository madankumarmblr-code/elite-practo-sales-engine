import React from 'react';
import { History, Radio } from 'lucide-react';

export function ActivityFeed({ activities }) {
  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMinutes = Math.floor((now - date) / (1000 * 60));
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes}m ago`;
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="activity-card">
      <div className="activity-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <History size={17} style={{ color: '#6366f1' }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Live Activity Feed</h3>
        </div>
        <Radio size={14} style={{ color: '#10b981' }} />
      </div>

      <div className="activity-list">
        {!activities || activities.length === 0 ? (
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>No recent activity recorded.</p>
        ) : (
          activities.slice(0, 8).map((act) => (
            <div key={act.id} className="activity-item">
              <div className="activity-dot" />
              <div className="activity-content">
                <p>{act.message}</p>
                <span className="activity-time">
                  {act.user} • {formatTime(act.timestamp)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
