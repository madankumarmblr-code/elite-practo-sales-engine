import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getDashboardStats().catch(() => null),
      api.getSystemHealth().catch(() => null),
    ]).then(([s, h]) => {
      setStats(s);
      setHealth(h);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, flexDirection: 'column', gap: 16 }}>
      <div className="spinner" />
      <p className="text-muted">Loading dashboard...</p>
    </div>
  );

  const leads = stats?.leads || {};
  const outreach = stats?.outreach || {};
  const pipeline = stats?.pipeline || [];

  const statCards = [
    { icon: '👥', label: 'Total Leads', value: leads.total ?? '—', delta: `+${leads.thisMonth ?? 0} this month`, color: '#00d4ff' },
    { icon: '🏆', label: 'Won Deals', value: leads.won ?? '—', delta: `${leads.conversionRate ?? 0}% conversion`, color: '#10b981' },
    { icon: '📞', label: 'Voice Calls', value: outreach.calls ?? '—', delta: 'Sarvam AI calls', color: '#7c3aed' },
    { icon: '💬', label: 'WhatsApp Sent', value: outreach.whatsapp ?? '—', delta: 'via Meta Cloud API', color: '#f59e0b' },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="text-sm text-muted mt-2">Real-time overview of your sales pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="status-dot" style={{ background: health?.ok ? '#10b981' : '#ef4444', boxShadow: health?.ok ? '0 0 6px #10b981' : 'none' }} />
          <span className="text-sm text-muted">{health?.ok ? 'System healthy' : 'System issue'}</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid-4 mb-4">
        {statCards.map((card) => (
          <div key={card.label} className="card" style={{ background: 'var(--bg-card)', borderColor: `${card.color}22` }}>
            <div className="flex items-center justify-between mb-4">
              <div style={{ fontSize: 28 }}>{card.icon}</div>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${card.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: card.color }} />
              </div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
            <div className="text-sm text-muted mt-2">{card.label}</div>
            <div style={{ fontSize: 11, color: card.color, opacity: 0.7, marginTop: 4 }}>{card.delta}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* Pipeline */}
        <div className="card">
          <h2 className="section-title mb-4">Pipeline Overview</h2>
          {pipeline.length === 0 ? (
            <p className="text-muted text-sm">No pipeline data yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pipeline.map((p) => {
                const max = Math.max(...pipeline.map((x) => x.count), 1);
                const pct = Math.round((p.count / max) * 100);
                const colorMap = { new: '#00d4ff', contacted: '#7c3aed', qualified: '#f59e0b', proposal: '#c45c26', won: '#10b981', lost: '#6b7280' };
                const color = colorMap[p.stage] || '#6b7280';
                return (
                  <div key={p.stage}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm" style={{ textTransform: 'capitalize' }}>{p.stage}</span>
                      <span className="text-sm font-bold" style={{ color }}>{p.count}</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Integrations status */}
        <div className="card">
          <h2 className="section-title mb-4">Integration Status</h2>
          {health?.api?.ok === false ? (
            <div className="alert alert-error">API health check failed</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { name: 'NVIDIA Nemotron 3 Ultra', icon: '⚡', desc: 'Enterprise LLM Pitch & Sales Intelligence', status: 'active' },
                { name: 'Sarvam Voice AI', icon: '🎙️', desc: 'Indus Samvaad Voice Agents', status: 'active' },
                { name: 'Meta WhatsApp', icon: '💬', desc: 'WhatsApp Cloud API', status: 'active' },
                { name: 'SQLite Database', icon: '🗄️', desc: `better-sqlite3 · ${health?.counts?.leads ?? 0} leads`, status: health?.db?.connected ? 'connected' : 'error' },
              ].map((item) => (
                <div key={item.name} className="flex items-center gap-3" style={{ padding: '10px 14px', background: 'var(--bg-surface)', borderRadius: 10, border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 22 }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</div>
                    <div className="text-xs text-muted">{item.desc}</div>
                  </div>
                  <div className="status-dot connected" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
