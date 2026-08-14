import { useState } from 'react';

const FIELDS = [
  'APIFY_API_KEY',
  'CLAY_API_KEY',
  'SMARTLEAD_API_KEY',
  'HEYREACH_API_KEY',
  'N8N_WEBHOOK_URL',
  'ANTHROPIC_API_KEY',
  'GAMMA_API_KEY',
  'ELEVENLABS_API_KEY',
  'FIREFLIES_API_KEY',
  'NOTION_API_KEY',
  'GOOGLE_CALENDAR_CLIENT_ID',
];

const STORAGE_KEY = 'practopulse-settings-v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

export default function PulseSettings() {
  const [settings, setSettings] = useState(load);
  const [saved, setSaved] = useState(false);

  function update(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
  }

  return (
    <div className="pulse-page">
      <header className="pulse-head">
        <h1>Pulse Settings</h1>
        <p>API keys stored in this browser. Live connectors simulate until keys are set.</p>
      </header>
      <section className="pulse-card">
        <div className="pulse-settings-grid">
          {FIELDS.map((key) => (
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
        <button type="button" className="pulse-btn" onClick={save}>
          Save locally
        </button>
        {saved ? <p className="pulse-banner">Saved in browser storage</p> : null}
      </section>
    </div>
  );
}
