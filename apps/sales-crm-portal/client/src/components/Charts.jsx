import React, { useState } from 'react';

export function RevenueForecastChart({ data = [] }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data.length) return null;

  const width = 600;
  const height = 240;
  const padding = 40;

  const maxVal = Math.max(...data.map((d) => Math.max(d.projected || 0, d.actual || 0))) * 1.15;
  const stepX = (width - padding * 2) / (data.length - 1);

  const getPoints = (key) =>
    data
      .map((d, i) => {
        const val = d[key];
        if (val === null || val === undefined) return null;
        const x = padding + i * stepX;
        const y = height - padding - (val / maxVal) * (height - padding * 2);
        return { x, y, val, month: d.month };
      })
      .filter(Boolean);

  const actualPoints = getPoints('actual');
  const projectedPoints = getPoints('projected');

  const linePath = (points) =>
    points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

  const areaPath = (points) => {
    if (!points.length) return '';
    const first = points[0];
    const last = points[points.length - 1];
    const base = linePath(points);
    return `${base} L ${last.x} ${height - padding} L ${first.x} ${height - padding} Z`;
  };

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto', overflow: 'visible' }}>
        <defs>
          <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366F1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#6366F1" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = height - padding - pct * (height - padding * 2);
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="var(--border-subtle)" strokeDasharray="3 3" />
              <text x={padding - 8} y={y + 3} fill="var(--text-muted)" fontSize="9" textAnchor="end">
                ${Math.round((pct * maxVal) / 1000)}k
              </text>
            </g>
          );
        })}

        {/* Projected Area & Line */}
        <path d={areaPath(projectedPoints)} fill="url(#projGrad)" />
        <path d={linePath(projectedPoints)} fill="none" stroke="#06B6D4" strokeWidth="2.5" strokeDasharray="4 4" />

        {/* Actual Area & Line */}
        <path d={areaPath(actualPoints)} fill="url(#actualGrad)" />
        <path d={linePath(actualPoints)} fill="none" stroke="#6366F1" strokeWidth="3" />

        {/* Data Dots */}
        {actualPoints.map((p, i) => (
          <circle
            key={`act-${i}`}
            cx={p.x}
            cy={p.y}
            r={hoveredIdx === i ? 6 : 4}
            fill="#6366F1"
            stroke="#FFFFFF"
            strokeWidth="2"
            style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        ))}

        {/* Month Labels */}
        {data.map((d, i) => {
          const x = padding + i * stepX;
          return (
            <text key={i} x={x} y={height - 12} fill="var(--text-secondary)" fontSize="10" textAnchor="middle" fontWeight="600">
              {d.month}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '10px', fontSize: '11.5px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '3px', background: '#6366F1', borderRadius: '2px' }} />
          <span style={{ color: 'var(--text-secondary)' }}>Actual Closed Revenue</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '12px', height: '2px', borderTop: '2px dashed #06B6D4' }} />
          <span style={{ color: 'var(--text-secondary)' }}>AI Projected Run-Rate</span>
        </div>
      </div>
    </div>
  );
}

export function PipelineFunnelChart({ data = [] }) {
  if (!data.length) return null;

  const maxVal = Math.max(...data.map((d) => d.value || 0)) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      {data.map((item, idx) => {
        const pct = Math.max(10, Math.round(((item.value || 0) / maxVal) * 100));
        return (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.stage}</span>
              <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                ₹{(item.value || 0).toLocaleString()} <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({item.count} deals)</span>
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--bg-input)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, #6366F1, #06B6D4)`,
                  borderRadius: 'var(--radius-full)',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DonutBreakdownChart({ data = [], totalLabel = 'Total' }) {
  if (!data.length) return null;

  const colors = ['#6366F1', '#06B6D4', '#10B981', '#F59E0B', '#A855F7', '#EC4899'];
  const total = data.reduce((sum, d) => sum + (d.count || d.value || 0), 0);

  let cumulativeAngle = 0;
  const slices = data.map((d, i) => {
    const val = d.count || d.value || 0;
    const fraction = total > 0 ? val / total : 0;
    const startAngle = cumulativeAngle;
    const angle = fraction * 360;
    cumulativeAngle += angle;
    return {
      label: d.specialty || d.channel || d.city || d.label,
      val,
      pct: Math.round(fraction * 100),
      color: colors[i % colors.length],
      startAngle,
      angle,
    };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: '140px', height: '140px', margin: '0 auto' }}>
        <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
          {slices.map((slice, i) => {
            const strokeDasharray = `${(slice.pct * 251.2) / 100} 251.2`;
            const strokeDashoffset = -((slice.startAngle / 360) * 251.2);
            return (
              <circle
                key={i}
                cx="50"
                cy="50"
                r="40"
                fill="transparent"
                stroke={slice.color}
                strokeWidth="14"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: 'all 0.3s ease' }}
              />
            );
          })}
        </svg>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{total}</div>
          <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{totalLabel}</div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: '160px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {slices.slice(0, 5).map((s, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{s.label}</span>
            </div>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{s.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
