import React from 'react';

const COLORS = {
  brand:   { accent: '#6366F1', bg: '#EEF2FF', text: '#4F46E5' },
  cyan:    { accent: '#00A3C4', bg: '#E0F7FA', text: '#0891B2' },
  emerald: { accent: '#10B981', bg: '#D1FAE5', text: '#059669' },
  amber:   { accent: '#F59E0B', bg: '#FEF3C7', text: '#D97706' },
  purple:  { accent: '#8B5CF6', bg: '#EDE9FE', text: '#7C3AED' },
  rose:    { accent: '#EF4444', bg: '#FEE2E2', text: '#DC2626' },
};

export default function MetricCard({ title, value, subtext, change, trend, trendType = 'up', isPositive = true, icon, color = 'brand', accent }) {
  const scheme = COLORS[accent || color] || COLORS.brand;
  const t = trend || change || '';
  const up = isPositive !== false && trendType !== 'down';

  return (
    <div
      className="glass-panel"
      style={{
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'default',
      }}
    >
      {/* Title + icon */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', lineHeight: 1.3 }}>{title}</span>
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-sm)',
            background: scheme.bg,
            color: scheme.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>

      {/* Value */}
      <div style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-heading)', letterSpacing: '-0.5px', lineHeight: 1 }}>{value}</div>

      {/* Trend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
        {t && (
          <span style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '2px 6px',
            borderRadius: 'var(--radius-full)',
            background: up ? '#D1FAE5' : '#FEE2E2',
            color: up ? '#059669' : '#DC2626',
          }}>
            {up ? '↑' : '↓'} {t}
          </span>
        )}
        {subtext && <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{subtext}</span>}
      </div>

      {/* Bottom accent line */}
      <div style={{ position: 'absolute', bottom: 0, left: '15%', right: '15%', height: '2px', background: `linear-gradient(90deg, transparent, ${scheme.accent}40, transparent)` }} />
    </div>
  );
}
