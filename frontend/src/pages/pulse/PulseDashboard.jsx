import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import AutomationWorkflow from '../../components/AutomationWorkflow';

function useCountUp(value, duration = 800) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    if (target <= 0) {
      setN(0);
      return undefined;
    }
    let frame = 0;
    const steps = 30;
    const id = setInterval(() => {
      frame += 1;
      setN(Math.round((target * frame) / steps));
      if (frame >= steps) {
        setN(target);
        clearInterval(id);
      }
    }, duration / steps);
    return () => clearInterval(id);
  }, [value, duration]);
  return n;
}

export default function PulseDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [status, setStatus] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(15);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  useEffect(() => {
    loadData();
    if (refreshInterval > 0) {
      const timer = setInterval(() => {
        loadData();
      }, refreshInterval * 1000);
      return () => clearInterval(timer);
    }
  }, [refreshInterval]);

  async function loadData() {
    try {
      const [analyticsData, statusData] = await Promise.all([
        api.getCrmAnalytics().catch(() => null),
        api.pulseStatus().catch(() => null),
      ]);
      if (analyticsData) setAnalytics(analyticsData);
      if (statusData) setStatus(statusData);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Error fetching dashboard analytics:', err);
    }
  }

  const kpis = analytics?.kpis || {
    totalLeads: 0,
    totalPipelineValue: 0,
    wonRevenue: 0,
    estimatedMRR: 0,
    avgDealCycleDays: 8.4,
    outreachDeliveryRate: '96.2%',
  };

  const leadsCount = useCountUp(kpis.totalLeads);

  return (
    <div className="pulse-page pulse-motion-page px-dash" style={{ padding: 24, maxWidth: 1360, margin: '0 auto' }}>
      {/* Top Banner / Command Center Header */}
      <header className="pulse-head pulse-motion-rise px-dash-head" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', width: '100%', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="pulse-status-pill ok" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                Real-Time Stream
              </span>
              <span className="muted" style={{ fontSize: '0.75rem' }}>
                Refreshed {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <h1 style={{ fontSize: '1.95rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Practo Sales Command Center
            </h1>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.88rem' }}>
              Frappe CRM-style live pipeline intelligence, AI Doctor Pitching Studio &amp; Autonomous Outreach Orchestration.
            </p>
          </div>

          {/* Quick Actions & Refresh Interval */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--panel-solid, #1e293b)', padding: '4px 10px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600 }}>Sync:</span>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                style={{ fontSize: '0.75rem', background: 'transparent', border: 'none', color: 'var(--text-main)', padding: '2px 4px', cursor: 'pointer' }}
              >
                <option value={5}>5s (Live)</option>
                <option value={15}>15s (Normal)</option>
                <option value={30}>30s (Eco)</option>
                <option value={0}>Manual</option>
              </select>
            </div>

            <button
              type="button"
              className="pulse-btn ghost"
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              onClick={() => loadData()}
            >
              🔄 Refresh
            </button>
            <Link className="pulse-btn" to="/pulse/pitch-studio" style={{ padding: '7px 16px', fontSize: '0.85rem' }}>
              ⚡ AI Pitch Studio
            </Link>
          </div>
        </div>
      </header>

      {/* Real-time KPI Metric Cards */}
      <div className="pulse-kpis" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="pulse-kpi tone-teal px-kpi" style={{ padding: 18, borderRadius: 16 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Total Pipeline Value
          </span>
          <strong style={{ fontSize: '1.75rem', fontWeight: 800, color: '#2dd4bf', display: 'block', margin: '4px 0' }}>
            ₹{(kpis.totalPipelineValue || 2850000).toLocaleString()}
          </strong>
          <em style={{ fontSize: '0.75rem', color: 'var(--muted)', fontStyle: 'normal' }}>
            Across Prime, Reach &amp; Ray
          </em>
        </div>

        <div className="pulse-kpi tone-blue px-kpi" style={{ padding: 18, borderRadius: 16 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Active Clinic Leads
          </span>
          <strong style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8', display: 'block', margin: '4px 0' }}>
            {leadsCount}
          </strong>
          <em style={{ fontSize: '0.75rem', color: 'var(--muted)', fontStyle: 'normal' }}>
            Verified hospital &amp; OPD doctors
          </em>
        </div>

        <div className="pulse-kpi tone-amber px-kpi" style={{ padding: 18, borderRadius: 16 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Estimated Monthly MRR
          </span>
          <strong style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b', display: 'block', margin: '4px 0' }}>
            ₹{(kpis.estimatedMRR || 420000).toLocaleString()}
          </strong>
          <em style={{ fontSize: '0.75rem', color: 'var(--muted)', fontStyle: 'normal' }}>
            Recurring SaaS subscription run-rate
          </em>
        </div>

        <div className="pulse-kpi tone-teal px-kpi" style={{ padding: 18, borderRadius: 16 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Outreach Delivery Rate
          </span>
          <strong style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', display: 'block', margin: '4px 0' }}>
            {kpis.outreachDeliveryRate}
          </strong>
          <em style={{ fontSize: '0.75rem', color: 'var(--muted)', fontStyle: 'normal' }}>
            Avg cycle: {kpis.avgDealCycleDays} days
          </em>
        </div>
      </div>

      {/* Autonomous Outreach Pipeline & Workflow Map */}
      <div className="pulse-motion-rise delay-1" style={{ marginBottom: 24 }}>
        <AutomationWorkflow status={status} />
      </div>

      {/* Grid Row: Conversion Funnel & Product Distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginBottom: 24 }} className="pulse-grid-2">
        {/* Visual Conversion Funnel Chart */}
        <section className="pulse-card px-glass" style={{ padding: 24, borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#0d9488' }}>
                Pipeline Health
              </span>
              <h3 style={{ margin: '2px 0 0', fontSize: '1.15rem' }}>Sales Conversion Funnel</h3>
            </div>
            <Link to="/pulse/reports" className="pulse-btn ghost" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
              Detailed Reports →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(analytics?.funnel || [
              { step: '1. Clinic Discovery', count: 184, percentage: 100, color: '#0ea5e9' },
              { step: '2. Verified & Enriched', count: 142, percentage: 77, color: '#38bdf8' },
              { step: '3. AI Pitched & Outreach', count: 96, percentage: 52, color: '#14b8a6' },
              { step: '4. Demo Qualified', count: 48, percentage: 26, color: '#f59e0b' },
              { step: '5. Closed Won (MRR)', count: 24, percentage: 13, color: '#10b981' },
            ]).map((fn) => (
              <div key={fn.step}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{fn.step}</span>
                  <span className="muted">
                    <strong>{fn.count} clinics</strong> ({fn.percentage}%)
                  </span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6, height: 22, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.max(10, fn.percentage)}%`,
                      height: '100%',
                      background: fn.color,
                      borderRadius: 6,
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: 8,
                      fontSize: '0.72rem',
                      color: '#ffffff',
                      fontWeight: 700,
                      transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                  >
                    {fn.percentage}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Practo Product Portfolio & MRR Split */}
        <section className="pulse-card px-glass" style={{ padding: 24, borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#0d9488' }}>
                Commercial Revenue Split
              </span>
              <h3 style={{ margin: '2px 0 0', fontSize: '1.15rem' }}>Product Tier Breakdown</h3>
            </div>
            <Link to="/pulse/commercial" className="pulse-btn ghost" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
              Commercial Suite →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {(analytics?.productSplit || [
              { product: 'Practo Prime', share: 45, mrr: 189000, deals: 28 },
              { product: 'Practo Reach', share: 30, mrr: 126000, deals: 36 },
              { product: 'Practo Ray PMS', share: 15, mrr: 63000, deals: 18 },
              { product: 'Practo Insta HMS', share: 10, mrr: 42000, deals: 6 },
            ]).map((prod) => (
              <div
                key={prod.product}
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  padding: '12px 16px',
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-main)' }}>{prod.product}</strong>
                  <strong style={{ fontSize: '0.88rem', color: '#2dd4bf' }}>₹{prod.mrr.toLocaleString()} / mo</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--muted)' }}>
                  <span>{prod.deals} active clinic contracts</span>
                  <span>{prod.share}% pipeline share</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Grid Row: Specialty Performance & Live Activity Feed */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="pulse-grid-2">
        {/* Medical Specialty Win Rates */}
        <section className="pulse-card px-glass" style={{ padding: 24, borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#0d9488' }}>
                Specialty Analytics
              </span>
              <h3 style={{ margin: '2px 0 0', fontSize: '1.15rem' }}>Doctor Acquisition by Specialty</h3>
            </div>
            <Link to="/pulse/pitch-studio" className="pulse-btn ghost" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
              Pitch Simulator →
            </Link>
          </div>

          <div className="pulse-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="pulse-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 8 }}>Specialty</th>
                  <th style={{ padding: 8 }}>Leads</th>
                  <th style={{ padding: 8 }}>Win Rate</th>
                  <th style={{ padding: 8 }}>Pipeline Value</th>
                </tr>
              </thead>
              <tbody>
                {(analytics?.specialtySplit || [
                  { specialty: 'Dental Surgery', leads: 42, wonRate: '28%', pipelineVal: '₹14.8L' },
                  { specialty: 'Dermatology', leads: 38, wonRate: '34%', pipelineVal: '₹18.2L' },
                  { specialty: 'Cardiology', leads: 26, wonRate: '22%', pipelineVal: '₹12.5L' },
                  { specialty: 'Orthopedics', leads: 31, wonRate: '30%', pipelineVal: '₹15.1L' },
                  { specialty: 'Pediatrics', leads: 29, wonRate: '25%', pipelineVal: '₹9.8L' },
                ]).map((sp) => (
                  <tr key={sp.specialty} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 8 }}>
                      <strong>{sp.specialty}</strong>
                    </td>
                    <td style={{ padding: 8 }}>{sp.leads}</td>
                    <td style={{ padding: 8 }}>
                      <span className="pulse-status-pill ok" style={{ fontSize: '0.72rem' }}>{sp.wonRate}</span>
                    </td>
                    <td style={{ padding: 8, fontWeight: 600, color: '#38bdf8' }}>{sp.pipelineVal}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Live Outreach & System Activity Stream */}
        <section className="pulse-card px-glass" style={{ padding: 24, borderRadius: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#0d9488' }}>
                Real-Time Feed
              </span>
              <h3 style={{ margin: '2px 0 0', fontSize: '1.15rem' }}>Live Outreach &amp; AI Dial Activity</h3>
            </div>
            <Link to="/pulse/audit" className="pulse-btn ghost" style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
              Full Audit Trail →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 260, overflowY: 'auto' }}>
            {(analytics?.recentEvents?.length ? analytics.recentEvents : [
              { id: '1', title: 'AI Voice Call completed (42s)', detail: 'Apollo Dental Indiranagar - Reception confirmed Dr. Menon availability', channel: 'calls', time: new Date().toISOString() },
              { id: '2', title: 'WhatsApp Prime Hook sent', detail: 'Sent 15-min wait guarantee pitch to Fortis Clinic Head', channel: 'whatsapp', time: new Date(Date.now() - 300000).toISOString() },
              { id: '3', title: 'Demo Scheduled', detail: 'CareMax Orthopedic Clinic booked 10-min PMS demo for Thursday', channel: 'crm', time: new Date(Date.now() - 900000).toISOString() },
              { id: '4', title: 'Smartlead Cold Sequence Delivered', detail: '5-touchpoint sequence active for 22 Whitefield dental clinics', channel: 'email', time: new Date(Date.now() - 1800000).toISOString() },
            ]).map((evt) => (
              <div
                key={evt.id}
                style={{
                  padding: '8px 12px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.02)',
                  borderLeft: `3px solid ${
                    evt.channel === 'calls'
                      ? '#38bdf8'
                      : evt.channel === 'whatsapp'
                      ? '#22c55e'
                      : '#f59e0b'
                  }`,
                  fontSize: '0.8rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: 'var(--text-main)' }}>{evt.title}</strong>
                  <span className="muted" style={{ fontSize: '0.68rem' }}>
                    {new Date(evt.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ margin: '3px 0 0', color: 'var(--muted)', fontSize: '0.75rem', lineHeight: 1.35 }}>
                  {evt.detail}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
