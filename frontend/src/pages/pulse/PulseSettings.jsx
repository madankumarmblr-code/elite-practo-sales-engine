import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import AutomationWorkflow from '../../components/AutomationWorkflow';

const ESSENTIAL_API_GROUPS = [
  {
    group: '🎙️ AI Voice & Script Intelligence',
    description: 'Powers turn-by-turn voice calls, Indian voice personas, and Claude pitch scripts.',
    keys: [
      {
        key: 'ELEVENLABS_API_KEY',
        label: 'ElevenLabs API Key',
        purpose: 'Generates high-definition voice calls and recordings for Priya, Rahul, Ananya & Marcus.',
      },
      {
        key: 'ANTHROPIC_API_KEY',
        label: 'Anthropic Claude API Key',
        purpose: 'Generates personalized Doctor pitch hooks, scripts, and call transcript action summaries.',
      },
      {
        key: 'OPENAI_API_KEY',
        label: 'OpenAI / Gemini API Key',
        purpose: 'Alternate LLM for fallback pitch generation and rapid qualification classification.',
      },
      {
        key: 'GAMMA_API_KEY',
        label: 'Gamma Presentation API Key',
        purpose: 'Auto-generates proposal decks and clinic pitch slides.',
      },
    ],
  },
  {
    group: '💬 Outreach & Sequencer Channels',
    description: 'Manages outbound WhatsApp, cold email drips, and LinkedIn campaigns.',
    keys: [
      {
        key: 'WHATSAPP_ACCESS_TOKEN',
        label: 'WhatsApp Cloud Access Token',
        purpose: 'Optional direct Meta WhatsApp Cloud API credentials for verified business delivery.',
      },
      {
        key: 'SMARTLEAD_API_KEY',
        label: 'Smartlead.ai API Key',
        purpose: 'Syncs discovered clinic emails directly into multi-inbox cold drip sequences.',
      },
      {
        key: 'HEYREACH_API_KEY',
        label: 'HeyReach API Key',
        purpose: 'Automates LinkedIn DM campaigns for verified managing doctors and clinic owners.',
      },
    ],
  },
  {
    group: '🔍 Discovery & Local Intelligence',
    description: 'Enriches clinics with phone numbers, Google ratings, and address coordinates.',
    keys: [
      {
        key: 'GOOGLE_MAPS_API_KEY',
        label: 'Google Maps / Places API Key',
        purpose: 'Enriches discovered clinics with precise geocoding, ratings, reviews, and place IDs.',
      },
      {
        key: 'APIFY_API_KEY',
        label: 'Apify API Key',
        purpose: 'Optional cloud web scrapers for large-scale external clinic directories.',
      },
      {
        key: 'CLAY_API_KEY',
        label: 'Clay.com API Key',
        purpose: 'Waterfall phone & email enrichment for clinic decision makers.',
      },
    ],
  },
];

const WEBHOOK_FIELDS = [
  {
    key: 'AUTOPILOT_WEBHOOK_URL',
    label: 'AI Autopilot Push Webhook URL',
    purpose: 'Receives real-time JSON events when leads are pushed into Autopilot (primary sink).',
  },
  {
    key: 'SLACK_WEBHOOK_URL',
    label: 'Slack Alerts Webhook URL',
    purpose: 'Posts instant notifications into your sales team Slack channel on qualified leads.',
  },
  {
    key: 'CUSTOM_WEBHOOK_URL',
    label: 'Custom CRM / Webhook Endpoint',
    purpose: 'Receives the master lead payload for external custom CRM synchronization.',
  },
  {
    key: 'WEBHOOK_SECRET',
    label: 'Webhook Shared Secret (X-Pulse-Secret)',
    purpose: 'Secret header sent on all outgoing webhook dispatches to authenticate requests.',
  },
];

const LOCAL_KEY = 'practopulse-settings-v2';

export default function PulseSettings() {
  const toast = useToast();
  const [settings, setSettings] = useState({});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let local = {};
    try {
      local = JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}');
    } catch {
      local = {};
    }
    api
      .pulseSettings()
      .then((data) => {
        setSettings({ ...data.defaults, ...data.settings, ...local });
      })
      .catch(() => setSettings(local));
  }, []);

  function handleChange(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setBusy(true);
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(settings));
      const res = await api.pulseSaveSettings(settings);
      setSettings((s) => ({ ...s, ...(res.settings || {}) }));
      setSaved(true);
      toast('Settings saved successfully!');
    } catch (err) {
      toast(err.message || 'Failed to save settings');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pulse-page">
      {/* Header */}
      <header className="pulse-head row">
        <div>
          <span className="px-eyebrow">Platform Configuration</span>
          <h1>API Settings &amp; Integrations</h1>
          <p>
            Configure AI Voice synthesis, WhatsApp gateway, Cold email sequence engines, and Webhook dispatchers.
          </p>
        </div>
        <div className="pulse-actions">
          <Link to="/pulse/status" className="pulse-btn ghost" style={{ textDecoration: 'none' }}>
            ⚡ Live Server &amp; API Status
          </Link>
          <button type="submit" form="settings-form" className="pulse-btn" disabled={busy}>
            {busy ? 'Saving…' : saved ? '✓ Saved' : 'Save All Settings'}
          </button>
        </div>
      </header>

      {/* Embedded Automation Pipeline Indicator */}
      <div style={{ marginBottom: 20 }}>
        <AutomationWorkflow compact />
      </div>

      <form id="settings-form" onSubmit={handleSave}>
        {/* Core API Groups */}
        {ESSENTIAL_API_GROUPS.map((group) => (
          <section key={group.group} className="pulse-card" style={{ marginBottom: 18, padding: '20px 24px' }}>
            <h2 style={{ margin: '0 0 4px', fontSize: '1.05rem' }}>{group.group}</h2>
            <p className="muted" style={{ fontSize: '0.84rem', marginBottom: 16 }}>
              {group.description}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
              {group.keys.map((f) => (
                <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: 0 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{f.label}</span>
                  <input
                    type="password"
                    placeholder="Enter API Key / Token…"
                    value={settings[f.key] || ''}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    style={{
                      padding: '0.6rem 0.8rem',
                      borderRadius: 8,
                      background: 'var(--surface-2, #0b1220)',
                      border: '1px solid var(--border-subtle, rgba(148, 163, 184, 0.2))',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                    }}
                  />
                  <span className="muted" style={{ fontSize: '0.74rem', lineHeight: 1.3 }}>
                    {f.purpose}
                  </span>
                </label>
              ))}
            </div>
          </section>
        ))}

        {/* Webhooks & Alert Dispatchers */}
        <section className="pulse-card" style={{ marginBottom: 18, padding: '20px 24px' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.05rem' }}>📡 Webhooks &amp; Alert Dispatchers</h2>
          <p className="muted" style={{ fontSize: '0.84rem', marginBottom: 16 }}>
            Broadcast real-time qualified lead events and autopilot executions to external platforms.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {WEBHOOK_FIELDS.map((f) => (
              <label key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: 0 }}>
                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{f.label}</span>
                <input
                  type={f.key.includes('SECRET') ? 'password' : 'url'}
                  placeholder={f.key.includes('SECRET') ? 'Secret key…' : 'https://…'}
                  value={settings[f.key] || ''}
                  onChange={(e) => handleChange(f.key, e.target.value)}
                  style={{
                    padding: '0.6rem 0.8rem',
                    borderRadius: 8,
                    background: 'var(--surface-2, #0b1220)',
                    border: '1px solid var(--border-subtle, rgba(148, 163, 184, 0.2))',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                  }}
                />
                <span className="muted" style={{ fontSize: '0.74rem', lineHeight: 1.3 }}>
                  {f.purpose}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Action Save Bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
          <button type="submit" className="pulse-btn" disabled={busy} style={{ padding: '0.7rem 1.8rem' }}>
            {busy ? 'Saving Changes…' : saved ? '✓ Saved All Settings' : '💾 Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
