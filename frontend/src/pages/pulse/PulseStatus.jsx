import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';

function statusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'online' || s === 'ready' || s === 'configured' || s === 'running') return 'ok';
  if (s === 'idle') return 'idle';
  return 'warn';
}

export default function PulseStatus() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setBusy(true);
    api
      .pulseStatus()
      .then(setData)
      .catch((err) => toast(err.message))
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

  if (!data) {
    return (
      <div className="pulse-page">
        <header className="pulse-head">
          <h1>Server Status</h1>
          <p>{busy ? 'Loading…' : 'Checking PractoPulse services…'}</p>
        </header>
      </div>
    );
  }

  return (
    <div className="pulse-page">
      <header className="pulse-head row">
        <div>
          <h1>Server Status</h1>
          <p>
            Live health for API, discovery, integrations, webhooks, and AI Autopilot · uptime{' '}
            {Math.floor((data.uptimeSec || 0) / 60)}m
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
          <span>Environment</span>
          <strong>{data.env}</strong>
        </div>
        <div className="pulse-kpi">
          <span>Memory (heap)</span>
          <strong>{data.memory?.heapMb ?? '—'} MB</strong>
        </div>
        <div className="pulse-kpi">
          <span>Leads in DB</span>
          <strong>{data.database?.leadsStored ?? 0}</strong>
        </div>
        <div className="pulse-kpi">
          <span>Autopilot queue</span>
          <strong>{data.autopilot?.total ?? 0}</strong>
        </div>
      </div>

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
          <h2>AI Autopilot</h2>
          <p className="muted">Level: {data.autopilot?.level || 'assist'}</p>
          <div className="pulse-kpis" style={{ marginTop: 12 }}>
            <div className="pulse-kpi">
              <span>Queued</span>
              <strong>{data.autopilot?.queued ?? 0}</strong>
            </div>
            <div className="pulse-kpi">
              <span>Running</span>
              <strong>{data.autopilot?.running ?? 0}</strong>
            </div>
            <div className="pulse-kpi">
              <span>Done</span>
              <strong>{data.autopilot?.done ?? 0}</strong>
            </div>
            <div className="pulse-kpi">
              <span>Failed</span>
              <strong>{data.autopilot?.failed ?? 0}</strong>
            </div>
          </div>
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
          <h2>Webhooks</h2>
          <ul className="pulse-status-list">
            {(data.webhooks || []).map((w) => (
              <li key={w.id}>
                <span>{w.label}</span>
                <span className={`pulse-status-pill ${w.configured ? 'ok' : 'idle'}`}>
                  {w.configured ? 'configured' : 'not set'}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
