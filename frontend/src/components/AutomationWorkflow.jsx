import { Link } from 'react-router-dom';

const PIPELINE_STEPS = [
  {
    id: 'discover',
    title: 'Lead Discovery',
    detail: 'City · Zone · Practo Presence',
    to: '/pulse/leads',
    icon: '🔍',
  },
  {
    id: 'validation',
    title: 'Lead Validation',
    detail: 'Phone Normalization & Scores',
    to: '/pulse/validation',
    icon: '🛡️',
  },
  {
    id: 'calls',
    title: 'AI Autopilot Calls',
    detail: 'Voice Personas & Audio Recordings',
    to: '/pulse/calls',
    icon: '🎙️',
  },
  {
    id: 'whatsapp',
    title: 'WhatsApp Engine',
    detail: 'Pitch Templates & Live Chat',
    to: '/pulse/whatsapp',
    icon: '💬',
  },
  {
    id: 'email',
    title: 'Email Sequencer',
    detail: '3-Step Cold Drip & Opens',
    to: '/pulse/email',
    icon: '✉️',
  },
  {
    id: 'crm',
    title: 'CRM Hub & Pipeline',
    detail: 'Kanban Stages & Timeline',
    to: '/pulse/crm',
    icon: '📊',
  },
];

export default function AutomationWorkflow({ compact = false, status }) {
  return (
    <section className={`px-flow ${compact ? 'compact' : ''}`}>
      <div className="px-flow-head">
        <div>
          <h2>End-to-End AI Sales Automation Pipeline</h2>
          <p className="muted">
            100% Native Autopilot Engine — discover authentic clinics, validate mobile numbers, dispatch AI voice calls &amp; WhatsApp pitches, nurture through email drips, and track stage progression in CRM.
          </p>
        </div>
        <span className="pulse-status-pill ok">
          🟢 Autopilot Engine Active
        </span>
      </div>
      <div className="px-flow-track" role="list">
        {PIPELINE_STEPS.map((step, i) => (
          <div key={step.id} className="px-flow-step" role="listitem" style={{ '--i': i }}>
            <Link to={step.to} className="px-flow-node">
              <span className="px-flow-index">{String(i + 1).padStart(2, '0')}</span>
              <div style={{ fontSize: '1.2rem', marginBottom: 2 }}>{step.icon}</div>
              <strong>{step.title}</strong>
              <span>{step.detail}</span>
            </Link>
            {i < PIPELINE_STEPS.length - 1 ? <span className="px-flow-arrow" aria-hidden /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
