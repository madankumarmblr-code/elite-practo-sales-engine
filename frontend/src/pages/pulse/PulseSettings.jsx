import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';

const KEY_FIELDS = [
  'APIFY_API_KEY',
  'CLAY_API_KEY',
  'SMARTLEAD_API_KEY',
  'HEYREACH_API_KEY',
  'ANTHROPIC_API_KEY',
  'GAMMA_API_KEY',
  'ELEVENLABS_API_KEY',
  'FIREFLIES_API_KEY',
  'NOTION_API_KEY',
  'GOOGLE_CALENDAR_CLIENT_ID',
];

const WEBHOOK_FIELDS = [
  { key: 'AUTOPILOT_WEBHOOK_URL', label: 'AI Autopilot webhook URL' },
  { key: 'N8N_WEBHOOK_URL', label: 'n8n / automation webhook URL' },
  { key: 'SLACK_WEBHOOK_URL', label: 'Slack incoming webhook URL' },
  { key: 'CUSTOM_WEBHOOK_URL', label: 'Custom webhook URL' },
  { key: 'WEBHOOK_SECRET', label: 'Webhook shared secret (X-Pulse-Secret)' },
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
      // still keep local
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
        <h1>Pulse Settings</h1>
        <p>
          API keys, webhook endpoints, and Autopilot automation flags. Server-persisted when
          available; also mirrored in this browser.
        </p>
      </header>

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
          When leads are pushed to Autopilot, these URLs receive a JSON payload (
          <code>pulse.autopilot.push</code>).
        </p>
        <div className="pulse-settings-grid">
          {WEBHOOK_FIELDS.map(({ key, label }) => (
            <label key={key}>
              {label}
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
        <div className="pulse-settings-grid">
          {KEY_FIELDS.map((key) => (
            <label key={key}>
              {key}
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
