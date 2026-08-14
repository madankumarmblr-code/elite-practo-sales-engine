import { Link } from 'react-router-dom';

const STEPS = [
  {
    id: 'discover',
    title: 'Lead Engine',
    detail: 'City · zone · specialty discovery',
    to: '/pulse/leads',
  },
  {
    id: 'fit',
    title: 'Product fit',
    detail: 'Reach · Prime · Hybrid classify',
    to: '/pulse/leads',
  },
  {
    id: 'autopilot',
    title: 'AI Autopilot',
    detail: 'WhatsApp · Gmail · AI calls',
    to: '/pulse/autopilot',
  },
  {
    id: 'n8n',
    title: 'n8n webhooks',
    detail: 'Automate CRM · Slack · Meta',
    to: '/pulse/settings',
  },
  {
    id: 'commercial',
    title: 'Commercial',
    detail: 'Prime · Reach proposals',
    to: '/pulse/commercial',
  },
];

export default function AutomationWorkflow({ compact = false, status }) {
  const n8nReady = Boolean(
    status?.webhooks?.some?.((w) => w.id === 'n8n' && w.configured) ||
      status?.webhooks?.find?.((w) => w.id === 'n8n')?.configured
  );

  return (
    <section className={`px-flow ${compact ? 'compact' : ''}`}>
      <div className="px-flow-head">
        <div>
          <h2>n8n sales automation workflow</h2>
          <p className="muted">
            End-to-end PractoPulse pipeline — discover clinics, classify fit, Autopilot outreach,
            then hand off to n8n for CRM and messaging.
          </p>
        </div>
        <span className={`pulse-status-pill ${n8nReady ? 'ok' : 'idle'}`}>
          n8n {n8nReady ? 'connected' : 'configure in Settings'}
        </span>
      </div>
      <div className="px-flow-track" role="list">
        {STEPS.map((step, i) => (
          <div key={step.id} className="px-flow-step" role="listitem" style={{ '--i': i }}>
            <Link to={step.to} className="px-flow-node">
              <span className="px-flow-index">{String(i + 1).padStart(2, '0')}</span>
              <strong>{step.title}</strong>
              <span>{step.detail}</span>
            </Link>
            {i < STEPS.length - 1 ? <span className="px-flow-arrow" aria-hidden /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
