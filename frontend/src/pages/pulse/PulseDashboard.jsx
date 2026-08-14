import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';

function useCountUp(value, duration = 900) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    if (target <= 0) {
      setN(0);
      return undefined;
    }
    let frame = 0;
    const steps = 36;
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

function MotionKpi({ label, value, tone }) {
  const n = useCountUp(value);
  return (
    <div className={`pulse-kpi pulse-motion-kpi tone-${tone}`}>
      <span>{label}</span>
      <strong>{n}</strong>
    </div>
  );
}

export default function PulseDashboard() {
  const [leads, setLeads] = useState([]);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    api.pulseLeads().then((d) => setLeads(d.leads || [])).catch(() => setLeads([]));
    api.pulseStatus().then(setStatus).catch(() => setStatus(null));
  }, []);

  const reach = leads.filter((l) => l.recommendedProduct !== 'PRIME').length;
  const prime = leads.filter((l) => l.recommendedProduct !== 'REACH').length;
  const demos = leads.filter((l) => l.status === 'DEMO_SCHEDULED').length;

  return (
    <div className="pulse-page pulse-motion-page">
      <div className="pulse-motion-bg" aria-hidden />
      <header className="pulse-head pulse-motion-rise">
        <h1>Dashboard</h1>
        <p>PractoPulse motion command center for Reach &amp; Prime inside sales.</p>
      </header>

      <div className="pulse-banner pulse-motion-rise" style={{ marginBottom: 16 }}>
        Live now: Lead Engine (multi-select) · AI Autopilot message/call logs · Server &amp; API
        Status · Super Admin users · Dashboard motion
      </div>

      <div className="pulse-kpis">
        <MotionKpi label="Pipeline leads" value={leads.length} tone="teal" />
        <MotionKpi label="Reach-fit" value={reach} tone="blue" />
        <MotionKpi label="Prime-fit" value={prime} tone="amber" />
        <MotionKpi label="Demos scheduled" value={demos} tone="teal" />
      </div>

      <div className="pulse-grid-2 pulse-motion-rise delay-1">
        <section className="pulse-card pulse-feature-card">
          <h2>Core products</h2>
          <div className="pulse-product">
            <strong>Practo Reach</strong>
            <p>Guaranteed impressions, locality &amp; specialty visibility, patient traffic.</p>
          </div>
          <div className="pulse-product">
            <strong>Practo Prime</strong>
            <p>Premier listing, 24×7 booking, smart virtual number, 15-min wait tech.</p>
          </div>
        </section>
        <section className="pulse-card pulse-feature-card">
          <h2>Next actions</h2>
          <div className="pulse-actions">
            <Link className="pulse-btn" to="/pulse/leads">
              Open Lead Engine
            </Link>
            <Link className="pulse-btn ghost" to="/pulse/autopilot">
              AI Autopilot logs
            </Link>
            <Link className="pulse-btn ghost" to="/pulse/commercial">
              Commercial Suite
            </Link>
            <Link className="pulse-btn ghost" to="/pulse/status">
              Server &amp; API Status
            </Link>
            <Link className="pulse-btn navy" to="/pulse/settings">
              Settings &amp; API keys
            </Link>
          </div>
          {status ? (
            <p className="muted" style={{ marginTop: 14, fontSize: '0.85rem' }}>
              DB {status.database?.ok ? 'connected' : 'error'} · Autopilot queue{' '}
              {status.autopilot?.total ?? 0} · Messages {status.autopilot?.messagesLogged ?? 0} ·
              Calls {status.autopilot?.callsLogged ?? 0}
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
