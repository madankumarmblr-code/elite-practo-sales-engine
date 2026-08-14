import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';

function statusClass(status) {
  const s = String(status || '').toLowerCase();
  if (['online', 'ready', 'configured', 'running', 'active', 'ok'].includes(s)) return 'ok';
  if (s === 'idle' || s === 'missing') return 'idle';
  return 'warn';
}

export default function PulseStatus() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [apiHealth, setApiHealth] = useState(null);
  const [sysHealth, setSysHealth] = useState(null);
  const [busy, setBusy] = useState(false);
  const [channelBusy, setChannelBusy] = useState('');

  const load = useCallback(() => {
    setBusy(true);
    Promise.allSettled([
      api.pulseStatus(),
      api.getApiHealth(),
      api.getSystemHealth().catch(() => null),
      api.pulseDbProbe(),
    ])
      .then(([pulse, health, sys, probe]) => {
        if (pulse.status === 'fulfilled') setData(pulse.value);
        else toast(pulse.reason?.message || 'Status failed');
        if (health.status === 'fulfilled') setApiHealth(health.value);
        if (sys.status === 'fulfilled') setSysHealth(sys.value);
        if (probe.status === 'fulfilled' && pulse.status === 'fulfilled') {
          setData((d) =>
            d
              ? {
                  ...d,
                  database: {
                    ...d.database,
                    probe: probe.value?.database || d.database?.probe,
                  },
                }
              : d
          );
        }
      })
      .finally(() => setBusy(false));
  }, [toast]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  async function testHooks() {
    setBusy(true);
    try {
      const res = await api.pulseTestWebhooks();
      const parts = Object.entries(res.results || {}).map(([k, v]) => {
        if (v.skipped) return `${k}: not set`;
        return `${k}: ${v.ok ? 'ok' : 'fail'}${v.status ? ` (${v.status})` : ''}`;
      });
      toast(parts.join(' · ') || 'Test complete');
      load();
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function testChannel(channel) {
    setChannelBusy(channel);
    try {
      const res = await api.pulseTestChannel({ channel });
      toast(res.message || `${channel} test ok`);
      load();
    } catch (err) {
      toast(err.message);
    } finally {
      setChannelBusy('');
    }
  }

  async function testAllChannels() {
    setChannelBusy('all');
    try {
      const res = await api.pulseTestAllChannels();
      toast(res.message || 'All channel tests done');
      load();
    } catch (err) {
      toast(err.message);
    } finally {
      setChannelBusy('');
    }
  }

  if (!data) {
    return (
      <div className="pulse-page">
        <header className="pulse-head">
          <h1>Server &amp; API Status</h1>
          <p>{busy ? 'Loading…' : 'Checking PractoPulse services…'}</p>
        </header>
      </div>
    );
  }

  const dbOk = data.database?.ok ?? data.database?.probe?.ok;

  return (
    <div className="pulse-page">
      <header className="pulse-head row">
        <div>
          <h1>Server &amp; API Status</h1>
          <p>
            Live health for API, SQLite database, discovery, WhatsApp / Gmail / Calls tests, and AI
            Autopilot · uptime {Math.floor((data.uptimeSec || 0) / 60)}m
          </p>
        </div>
        <div className="pulse-actions">
          <button type="button" className="pulse-btn ghost" disabled={busy} onClick={load}>
            Refresh
          </button>
          <button type="button" className="pulse-btn" disabled={busy} onClick={testHooks}>
            Test webhooks
          </button>
        </div>
      </header>

      <div className="pulse-kpis">
        <div className="pulse-kpi">
          <span>API</span>
          <strong>{apiHealth?.ok ? 'OK' : '—'}</strong>
        </div>
        <div className="pulse-kpi">
          <span>Database</span>
          <strong>{dbOk ? 'Connected' : 'Error'}</strong>
        </div>
        <div className="pulse-kpi">
          <span>DB latency</span>
          <strong>{data.database?.probe?.latencyMs ?? sysHealth?.db?.probe?.latencyMs ?? 0} ms</strong>
        </div>
        <div className="pulse-kpi">
          <span>Leads in DB</span>
          <strong>{data.database?.leadsStored ?? 0}</strong>
        </div>
      </div>

      <section className="pulse-card" style={{ marginBottom: 16 }}>
        <h2>Channel tests</h2>
        <p className="muted" style={{ marginBottom: 12 }}>
          Dry-run WhatsApp, Gmail, and AI Calls — results appear in Autopilot message / call logs.
        </p>
        <div className="pulse-actions">
          <button
            type="button"
            className="pulse-btn"
            disabled={!!channelBusy}
            onClick={() => testChannel('whatsapp')}
          >
            {channelBusy === 'whatsapp' ? 'Testing…' : 'Test WhatsApp'}
          </button>
          <button
            type="button"
            className="pulse-btn ghost"
            disabled={!!channelBusy}
            onClick={() => testChannel('gmail')}
          >
            {channelBusy === 'gmail' ? 'Testing…' : 'Test Gmail'}
          </button>
          <button
            type="button"
            className="pulse-btn ghost"
            disabled={!!channelBusy}
            onClick={() => testChannel('calls')}
          >
            {channelBusy === 'calls' ? 'Testing…' : 'Test AI Call'}
          </button>
          <button
            type="button"
            className="pulse-btn navy"
            disabled={!!channelBusy}
            onClick={testAllChannels}
          >
            {channelBusy === 'all' ? 'Testing…' : 'Test all channels'}
          </button>
        </div>
        <ul className="pulse-status-list" style={{ marginTop: 14 }}>
          {(data.channels || []).map((c) => (
            <li key={c.id}>
              <span>{c.label}</span>
              <span className={`pulse-status-pill ${c.configured ? 'ok' : 'idle'}`}>
                {c.configured ? 'keys ready' : 'simulated'}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="pulse-grid-2">
        <section className="pulse-card">
          <h2>Components</h2>
          <ul className="pulse-status-list">
            {(data.components || []).map((c) => (
              <li key={c.id}>
                <span>{c.label}</span>
                <span className={`pulse-status-pill ${statusClass(c.status)}`}>{c.status}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="pulse-card">
          <h2>API &amp; database</h2>
          <ul className="pulse-status-list">
            <li>
              <span>Public /api/health</span>
              <span className={`pulse-status-pill ${apiHealth?.ok ? 'ok' : 'warn'}`}>
                {apiHealth?.ok ? 'online' : 'down'}
              </span>
            </li>
            <li>
              <span>SELECT 1 probe</span>
              <span className={`pulse-status-pill ${dbOk ? 'ok' : 'warn'}`}>
                {dbOk ? 'pass' : 'fail'}
              </span>
            </li>
            <li>
              <span>System health</span>
              <span className={`pulse-status-pill ${sysHealth?.ok ? 'ok' : 'idle'}`}>
                {sysHealth ? (sysHealth.ok ? 'pass' : 'issues') : 'no access'}
              </span>
            </li>
            <li>
              <span>Outreach messages</span>
              <span className="pulse-status-pill ok">{data.database?.outreachMessages ?? 0}</span>
            </li>
            <li>
              <span>Call recordings logged</span>
              <span className="pulse-status-pill ok">{data.database?.callLogs ?? 0}</span>
            </li>
          </ul>
          {sysHealth?.checks ? (
            <div style={{ marginTop: 12 }}>
              <p className="muted" style={{ fontSize: '0.82rem' }}>
                System checks:{' '}
                {sysHealth.checks.map((c) => `${c.name}:${c.ok ? 'ok' : 'fail'}`).join(' · ')}
              </p>
            </div>
          ) : null}
        </section>
      </div>

      <div className="pulse-grid-2" style={{ marginTop: 16 }}>
        <section className="pulse-card">
          <h2>Integrations</h2>
          <ul className="pulse-status-list">
            {(data.integrations || []).map((i) => (
              <li key={i.id}>
                <span>
                  {i.label}
                  {i.configured && i.preview ? (
                    <span className="muted"> · {i.preview}</span>
                  ) : null}
                </span>
                <span className={`pulse-status-pill ${i.configured ? 'ok' : 'idle'}`}>
                  {i.configured ? 'configured' : 'missing'}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="pulse-card">
          <h2>AI Autopilot</h2>
          <p className="muted">Level: {data.autopilot?.level || 'assist'}</p>
          <div className="pulse-kpis" style={{ marginTop: 12 }}>
            <div className="pulse-kpi">
              <span>Queued</span>
              <strong>{data.autopilot?.queued ?? 0}</strong>
            </div>
            <div className="pulse-kpi">
              <span>Done</span>
              <strong>{data.autopilot?.done ?? 0}</strong>
            </div>
            <div className="pulse-kpi">
              <span>Msgs</span>
              <strong>{data.autopilot?.messagesLogged ?? 0}</strong>
            </div>
            <div className="pulse-kpi">
              <span>Calls</span>
              <strong>{data.autopilot?.callsLogged ?? 0}</strong>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
