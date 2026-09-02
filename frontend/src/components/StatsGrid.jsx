import React from 'react';
import { FolderKanban, CheckCircle2, Clock, Sparkles, TrendingUp } from 'lucide-react';

export function StatsGrid({ stats }) {
  const cards = [
    {
      title: 'Total Active Projects',
      value: stats?.totalProjects ?? 0,
      footer: `${stats?.inProgress ?? 0} currently underway`,
      icon: FolderKanban,
      color: '#6366f1'
    },
    {
      title: 'Completed Milestones',
      value: stats?.completed ?? 0,
      footer: '100% verified output',
      icon: CheckCircle2,
      color: '#10b981'
    },
    {
      title: 'In Planning Phase',
      value: stats?.planning ?? 0,
      footer: 'Architecture & specs',
      icon: Clock,
      color: '#f59e0b'
    },
    {
      title: 'Overall Velocity',
      value: `${stats?.avgProgress ?? 0}%`,
      footer: 'Across all workstreams',
      icon: TrendingUp,
      color: '#ec4899'
    }
  ];

  return (
    <div className="stats-grid">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div key={i} className="stat-card">
            <div className="stat-header">
              <span className="stat-title">{card.title}</span>
              <div className="stat-icon-wrapper" style={{ color: card.color }}>
                <Icon size={18} />
              </div>
            </div>
            <div className="stat-value">{card.value}</div>
            <div className="stat-footer">
              <Sparkles size={13} style={{ color: card.color }} />
              <span>{card.footer}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
