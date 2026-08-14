import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';
import AutomationWorkflow from '../../components/AutomationWorkflow';

const KEY_FIELDS = [
  {
    key: 'APIFY_API_KEY',
    label: 'Apify',
    purpose: 'Lead Engine live scraping actors (clinic / directory sources when enabled).',
  },
  {
    key: 'CLAY_API_KEY',
    label: 'Clay',
    purpose: 'Enrich discovered clinics with emails, phones, and decision-maker data.',
  },
  {
    key: 'SMARTLEAD_API_KEY',
    label: 'Smartlead',
    purpose: 'Email outreach sequences pushed from Lead Engine / AI Autopilot (Reach & Prime).',
  },
  {
    key: 'HEYREACH_API_KEY',
    label: 'HeyReach',
    purpose: 'LinkedIn DM campaigns for decision-makers from Autopilot sequence/full levels.',
  },
  {
    key: 'ANTHROPIC_API_KEY',
    label: 'Claude / Anthropic',
    purpose: 'AI product-fit classify, pitch scripts, and Autopilot message personalization.',
  },
  {
    key: 'GAMMA_API_KEY',
    label: 'Gamma',
    purpose: 'Auto-generate pitch decks / proposal slides from Pitch Studio and Autopilot.',
  },
  {
    key: 'ELEVENLABS_API_KEY',
    label: 'ElevenLabs',
    purpose: 'AI Autopilot voice calls, voice notes, and call-recording voice synthesis.',
  },
  {
    key: 'FIREFLIES_API_KEY',
    label: 'Fireflies',
    purpose: 'Meeting transcripts and action items after demos / AI calls.',
  },
  {
    key: 'NOTION_API_KEY',
    label: 'Notion',
    purpose: 'Optional sync of Autopilot jobs, call logs, and playbooks to a Notion workspace.',
  },
  {
    key: 'GOOGLE_CALENDAR_CLIENT_ID',
    label: 'Google Calendar',
    purpose: 'Demo holds / calendar booking from Meetings and Full Autopilot; also Gmail channel readiness.',
  },
];

const WEBHOOK_FIELDS = [
  {
    key: 'AUTOPILOT_WEBHOOK_URL',
    label: 'AI Autopilot webhook URL',
    purpose: 'Receives pulse.autopilot.push when leads are pushed to Autopilot (primary automation sink).',
  },
  {
    key: 'N8N_WEBHOOK_URL',
    label: 'n8n / automation webhook URL',
    purpose: 'Routes Autopilot events into n8n workflows (WhatsApp, CRM, Slack bridges).',
  },
  {
    key: 'SLACK_WEBHOOK_URL',
    label: 'Slack incoming webhook URL',
    purpose: 'Posts a short alert when Autopilot push or channel tests run.',
  },
  {
    key: 'CUSTOM_WEBHOOK_URL',
    label: 'Custom webhook URL',
    purpose: 'Any extra endpoint that should receive the same Autopilot JSON payload.',
  },
  {
    key: 'WEBHOOK_SECRET',
    label: 'Webhook shared secret',
    purpose: 'Sent as X-Pulse-Secret so your automation can verify requests are from PractoPulse.',
  },
];

const LOCAL_KEY = 'practopulse-settings-v1';

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
      .then((d) => {
        setSettings({ ...(d.settings || {}), ...local });
      })
      .catch(() => setSettings(local));
  }, []);

  function update(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setBusy(true);
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(settings));
      const data = await api.pulseSaveSettings(settings);
      setSettings(data.settings || settings);
      setSaved(true);
      toast('Settings saved (server + browser)');
    } catch (err) {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(settings));
      setSaved(true);
      toast(err.message || 'Saved locally');
    } finally {
      setBusy(false);
    }
  }

  async function testWebhooks() {
    setBusy(true);
    try {
      await api.pulseSaveSettings(settings);
      const res = await api.pulseTestWebhooks();
      const parts = Object.entries(res.results || {}).map(([k, v]) => {
        if (v.skipped) return `${k}: not set`;
        return `${k}: ${v.ok ? 'ok' : 'fail'}`;
      });
      toast(parts.join(' · ') || 'Test complete');
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pulse-page">
      <header className="pulse-head">
        <h1>Settings</h1>
        <p>
          Integration API keys (with purpose), webhooks, and Autopilot flags — one PractoPulse
          surface for the whole sales engine.
        </p>
      </header>

      <div style={{ marginBottom: 16 }}>
        <AutomationWorkflow
          compact
          status={{
            webhooks: [
              { id: 'n8n', configured: Boolean(settings.N8N_WEBHOOK_URL) },
            ],
          }}
        />
      </div>

      <section className="pulse-card px-glass" style={{ marginBottom: 16 }}>
        <h2>n8n workflow recipe</h2>
        <p className="muted" style={{ marginBottom: 10 }}>
          Recommended automation graph for Practo inside sales:
        </p>
        <ol className="px-recipe">
          <li>
            <strong>Webhook</strong> — listen on <code>N8N_WEBHOOK_URL</code> for{' '}
            <code>pulse.autopilot.push</code>
          </li>
          <li>
            <strong>Switch</strong> — route by <code>recommendedProduct</code> (REACH / PRIME /
            HYBRID)
          </li>
          <li>
            <strong>WhatsApp / Gmail / Voice</strong> — send channel templates; store message IDs
          </li>
          <li>
            <strong>CRM upsert</strong> — HubSpot / Sheets / Salesforce with clinic + score
          </li>
          <li>
            <strong>Slack</strong> — notify AE when Full Autopilot call completes
          </li>
        </ol>
        <p className="muted" style={{ marginTop: 10, fontSize: '0.82rem' }}>
          Paste your production n8n webhook below, save, then use Test webhooks or push leads from
          Lead Engine.
        </p>
      </section>

      <section className="pulse-card" style={{ marginBottom: 16 }}>
        <h2>AI Autopilot</h2>
        <div className="pulse-filters">
          <label>
            Default level
            <select
              value={settings.AUTOPILOT_LEVEL || 'assist'}
              onChange={(e) => update('AUTOPILOT_LEVEL', e.target.value)}
            >
              <option value="assist">Assist</option>
              <option value="sequence">Sequence</option>
              <option value="full">Full</option>
            </select>
          </label>
          <label>
            Default product filter
            <select
              value={settings.DEFAULT_PRODUCT || 'BOTH'}
              onChange={(e) => update('DEFAULT_PRODUCT', e.target.value)}
            >
              <option value="BOTH">Both</option>
              <option value="REACH">Reach</option>
              <option value="PRIME">Prime</option>
            </select>
          </label>
        </div>
        <div className="pulse-specs" style={{ marginTop: 12 }}>
          {[
            ['AUTOPILOT_AUTO_PITCH', 'Auto pitch deck'],
            ['AUTOPILOT_AUTO_SMARTLEAD', 'Auto Smartlead'],
            ['AUTOPILOT_AUTO_HEYREACH', 'Auto HeyReach'],
            ['AUTOPILOT_AUTO_DEMO', 'Auto demo hold'],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={settings[key] ? 'on' : ''}
              onClick={() => update(key, !settings[key])}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="pulse-card" style={{ marginBottom: 16 }}>
        <h2>Channel tests</h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          Test WhatsApp, Gmail, and AI Calls. Results land in Autopilot → Sent messages / Call logs.
        </p>
        <div className="pulse-actions">
          <button
            type="button"
            className="pulse-btn ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await api.pulseTestChannel({ channel: 'whatsapp' });
                toast(r.message);
              } catch (e) {
                toast(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Test WhatsApp
          </button>
          <button
            type="button"
            className="pulse-btn ghost"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await api.pulseTestChannel({ channel: 'gmail' });
                toast(r.message);
              } catch (e) {
                toast(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Test Gmail
          </button>
          <button
            type="button"
            className="pulse-btn navy"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await api.pulseTestChannel({ channel: 'calls' });
                toast(r.message);
              } catch (e) {
                toast(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Test AI Call
          </button>
        </div>
      </section>

      <section className="pulse-card" style={{ marginBottom: 16 }}>
        <h2>API webhooks</h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          When leads are pushed to Autopilot, these URLs receive JSON (
          <code>pulse.autopilot.push</code>).
        </p>
        <div className="pulse-settings-grid">
          {WEBHOOK_FIELDS.map(({ key, label, purpose }) => (
            <label key={key} className="pulse-key-field">
              <span className="pulse-key-label">{label}</span>
              <span className="pulse-key-purpose">{purpose}</span>
              <input
                type={key === 'WEBHOOK_SECRET' ? 'password' : 'url'}
                autoComplete="off"
                value={settings[key] || ''}
                onChange={(e) => update(key, e.target.value)}
                placeholder={key.includes('SECRET') ? 'Optional shared secret' : 'https://…'}
              />
            </label>
          ))}
        </div>
        <div className="pulse-actions" style={{ marginTop: 12 }}>
          <button type="button" className="pulse-btn ghost" disabled={busy} onClick={testWebhooks}>
            Test webhooks
          </button>
        </div>
      </section>

      <section className="pulse-card">
        <h2>Integration API keys</h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          Each key powers a specific function in Lead Engine, Autopilot, Pitch, or Meetings.
        </p>
        <div className="pulse-settings-grid">
          {KEY_FIELDS.map(({ key, label, purpose }) => (
            <label key={key} className="pulse-key-field">
              <span className="pulse-key-label">
                {label} <code>{key}</code>
              </span>
              <span className="pulse-key-purpose">{purpose}</span>
              <input
                type="password"
                autoComplete="off"
                value={settings[key] || ''}
                onChange={(e) => update(key, e.target.value)}
                placeholder={`Enter ${key}`}
              />
            </label>
          ))}
        </div>
        <div className="pulse-actions" style={{ marginTop: 16 }}>
          <button type="button" className="pulse-btn" disabled={busy} onClick={save}>
            {busy ? 'Saving…' : 'Save settings'}
          </button>
        </div>
        {saved ? <p className="pulse-banner">Saved</p> : null}
      </section>
    </div>
  );
}
