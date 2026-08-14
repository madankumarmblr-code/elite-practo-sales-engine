import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import AutomationWorkflow from '../../components/AutomationWorkflow';

function useCountUp(value, duration = 1000) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const target = Number(value) || 0;
    if (target <= 0) {
      setN(0);
      return undefined;
    }
    let frame = 0;
    const steps = 40;
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

function MotionKpi({ label, value, tone, hint }) {
  const n = useCountUp(value);
  return (
    <div className={`pulse-kpi pulse-motion-kpi tone-${tone} px-kpi`}>
      <span>{label}</span>
      <strong>{n}</strong>
      {hint ? <em>{hint}</em> : null}
    </div>
  );
}

export default function PulseDashboard() {
  const [leads, setLeads] = useState([]);
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    api.pulseLeads().then((d) => setLeads(d.leads || [])).catch(() => setLeads([]));
    api.pulseStatus().then(setStatus).catch(() => setStatus(null));
    api.pulseSettings().then((d) => setSettings(d.settings || {})).catch(() => setSettings(null));
  }, []);

  const reach = leads.filter((l) => l.recommendedProduct !== 'PRIME').length;
  const prime = leads.filter((l) => l.recommendedProduct !== 'REACH').length;
  const demos = leads.filter((l) => l.status === 'DEMO_SCHEDULED').length;
  const n8nUrl = settings?.N8N_WEBHOOK_URL || '';

  return (
    <div className="pulse-page pulse-motion-page px-dash">
      <div className="pulse-motion-bg" aria-hidden />
      <header className="pulse-head pulse-motion-rise px-dash-head">
        <div>
          <p className="px-eyebrow">Practo · Reach &amp; Prime</p>
          <h1>Command center</h1>
          <p>Premium healthcare sales automation — discovery to Autopilot to n8n.</p>
        </div>
        <Link className="pulse-btn" to="/pulse/leads">
          Run Lead Engine
        </Link>
      </header>

      <div className="pulse-kpis">
        <MotionKpi label="Pipeline leads" value={leads.length} tone="teal" hint="mock + live" />
        <MotionKpi label="Reach-fit" value={reach} tone="blue" hint="visibility" />
        <MotionKpi label="Prime-fit" value={prime} tone="amber" hint="conversion" />
        <MotionKpi label="Demos" value={demos} tone="teal" hint="scheduled" />
      </div>

      <div className="pulse-motion-rise delay-1" style={{ marginTop: 18 }}>
        <AutomationWorkflow status={status} />
      </div>

      <div className="pulse-grid-2 pulse-motion-rise delay-1" style={{ marginTop: 18 }}>
        <section className="pulse-card pulse-feature-card px-glass">
          <h2>Practo products</h2>
          <div className="pulse-product">
            <strong>Practo Reach</strong>
            <p>Guaranteed impressions, locality &amp; specialty visibility, patient traffic.</p>
          </div>
          <div className="pulse-product">
            <strong>Practo Prime</strong>
            <p>Premier listing, 24×7 booking, smart virtual number, 15-min wait tech.</p>
          </div>
        </section>
        <section className="pulse-card pulse-feature-card px-glass">
          <h2>Automation health</h2>
          <ul className="pulse-status-list">
            <li>
              <span>Database</span>
              <span className={`pulse-status-pill ${status?.database?.ok ? 'ok' : 'warn'}`}>
                {status?.database?.ok ? 'connected' : 'checking'}
              </span>
            </li>
            <li>
              <span>Autopilot queue</span>
              <span className="pulse-status-pill ok">{status?.autopilot?.total ?? 0}</span>
            </li>
            <li>
              <span>WhatsApp / messages</span>
              <span className="pulse-status-pill ok">
                {status?.autopilot?.messagesLogged ?? 0}
              </span>
            </li>
            <li>
              <span>AI call logs</span>
              <span className="pulse-status-pill ok">{status?.autopilot?.callsLogged ?? 0}</span>
            </li>
            <li>
              <span>n8n webhook</span>
              <span className={`pulse-status-pill ${n8nUrl ? 'ok' : 'idle'}`}>
                {n8nUrl ? 'configured' : 'not set'}
              </span>
            </li>
          </ul>
          <div className="pulse-actions" style={{ marginTop: 14 }}>
            <Link className="pulse-btn ghost" to="/pulse/autopilot">
              Autopilot logs
            </Link>
            <Link className="pulse-btn navy" to="/pulse/settings">
              Configure n8n
            </Link>
            <Link className="pulse-btn ghost" to="/pulse/commercial">
              Commercial Suite
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
