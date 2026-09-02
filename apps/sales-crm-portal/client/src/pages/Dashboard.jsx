import React, { useState, useEffect } from 'react';
import { useCrm } from '../context/CrmContext';
import { api } from '../services/api';
import MetricCard from '../components/MetricCard';
import { RevenueForecastChart, PipelineFunnelChart, DonutBreakdownChart } from '../components/Charts';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { addToast } = useCrm();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setData(await api.getDashboardSummary());
      } catch (err) {
        addToast(err.message || 'Error loading dashboard', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [addToast]);

  if (loading || !data) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid var(--border-subtle)', borderTopColor: 'var(--practo-cyan)', animation: 'spinnerOrbit 0.7s infinite linear', margin: '0 auto 12px' }} />
        <div style={{ fontSize: '13px', fontWeight: 500 }}>Loading analytics...</div>
      </div>
    );
  }

  const { metrics, stageBreakdown, leadsBySpecialty, revenueForecast, outreachChannels } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ── Hero Banner ──────────────────────────────────── */}
      <div
        style={{
          padding: '24px 28px',
          background: 'linear-gradient(135deg, #00A3C4 0%, #0891B2 60%, #0E7490 100%)',
          borderRadius: 'var(--radius-xl)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Ambient circle */}
        <div style={{ position: 'absolute', right: '-8%', top: '-40%', width: '340px', height: '340px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#0891B2', background: '#FFF', padding: '2px 8px', borderRadius: 'var(--radius-full)', letterSpacing: '0.3px' }}>PRACTO SALES</span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>v2.4</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#FFF', letterSpacing: '-0.5px', margin: '0 0 4px' }}>Sales Command Center</h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', margin: 0, fontWeight: 500 }}>Pipeline tracking, WhatsApp outreach & AI voice calling.</p>
        </div>

        <div style={{ display: 'flex', gap: '8px', position: 'relative', zIndex: 2 }}>
          <button onClick={() => navigate('/inventory')} style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', background: '#FFF', color: '#0891B2', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Slot Inventory →</button>
          <button onClick={() => navigate('/leads')} style={{ padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.12)', color: '#FFF', fontSize: '12px', fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(6px)' }}>Discover Leads</button>
        </div>
      </div>

      {/* ── KPI Grid ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <MetricCard title="Pipeline Value" value={`₹${(metrics.totalPipelineValue || 0).toLocaleString()}`} change="+18.4%" isPositive icon={<span>💼</span>} color="brand" />
        <MetricCard title="Monthly Revenue" value={`₹${(metrics.mrr || 0).toLocaleString()}`} change="+12.1%" isPositive icon={<span>📈</span>} color="cyan" />
        <MetricCard title="Active Leads" value={(metrics.totalLeads || 0).toString()} change="34 new" isPositive icon={<span>🩺</span>} color="emerald" />
        <MetricCard title="Weighted ARR" value={`₹${(metrics.weightedPipelineValue || 88170).toLocaleString()}`} change="High intent" isPositive icon={<span>⚡</span>} color="purple" />
      </div>

      {/* ── Charts Row ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Pipeline Funnel</h3>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Stage breakdown by volume</div>
            </div>
            <span className="badge badge-cyan">Live</span>
          </div>
          <PipelineFunnelChart data={stageBreakdown} />
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)', margin: 0 }}>Revenue Forecast</h3>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Weighted run-rate vs actuals</div>
            </div>
            <span className="badge badge-emerald">ARR</span>
          </div>
          <RevenueForecastChart data={revenueForecast} />
        </div>
      </div>

      {/* ── Bottom Row ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)', margin: '0 0 14px' }}>Leads by Specialty</h3>
          <DonutBreakdownChart data={leadsBySpecialty} />
        </div>

        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-heading)', margin: '0 0 14px' }}>Channel Performance</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {outreachChannels?.map((ch, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-heading)' }}>{ch.channel}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ch.sent?.toLocaleString()} sent · {ch.delivered} delivered</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#059669' }}>{ch.responseRate}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ch.dealsGenerated} deals</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
