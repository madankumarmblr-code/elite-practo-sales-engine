import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';

export default function PulseAutopilot() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [level, setLevel] = useState('sequence');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .pulseAutopilot()
      .then((d) => {
        setData(d);
        if (d.level) setLevel(d.level);
      })
      .catch((err) => toast(err.message));
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveLevel() {
    setBusy(true);
    try {
      await api.pulseSaveSettings({ AUTOPILOT_LEVEL: level });
      toast('Autopilot level saved');
      load();
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  }

  const jobs = data?.jobs || [];

  return (
    <div className="pulse-page">
      <header className="pulse-head row">
        <div>
          <h1>AI Autopilot</h1>
          <p>
            Queue discovered clinics into automated pitch → outreach → demo pipelines. Configure
            webhooks in Settings so n8n / Slack / custom endpoints receive every push.
          </p>
        </div>
        <Link className="pulse-btn" to="/pulse/leads">
          Open Lead Engine
        </Link>
      </header>

      <section className="pulse-card" style={{ marginBottom: 16 }}>
        <h2>Automation level</h2>
        <div className="pulse-filters">
          <label>
            Level
            <select value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="assist">Assist — enrich + pitch only</option>
              <option value="sequence">Sequence — Smartlead / HeyReach</option>
              <option value="full">Full — webhooks + sequences + demo holds</option>
            </select>
          </label>
          <button type="button" className="pulse-btn" disabled={busy} onClick={saveLevel}>
            Save level
          </button>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          Auto flags: pitch {data?.auto?.pitch ? 'on' : 'off'} · Smartlead{' '}
          {data?.auto?.smartlead ? 'on' : 'off'} · HeyReach {data?.auto?.heyreach ? 'on' : 'off'} ·
          demo {data?.auto?.demo ? 'on' : 'off'} (edit in Settings)
        </p>
      </section>

      <section className="pulse-card">
        <div className="pulse-head row" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Push queue ({jobs.length})</h2>
          <button type="button" className="pulse-btn ghost" onClick={load}>
            Refresh
          </button>
        </div>
        <div className="pulse-table-wrap">
          <table className="pulse-table">
            <thead>
              <tr>
                <th>Clinic</th>
                <th>Product</th>
                <th>Level</th>
                <th>Status</th>
                <th>Steps</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {jobs.slice(0, 50).map((job) => (
                <tr key={job.id}>
                  <td>
                    <strong>{job.clinicName}</strong>
                    <div className="muted">
                      {job.doctorName} · {job.city}
                    </div>
                  </td>
                  <td>
                    <span
                      className={`pulse-fit ${String(job.recommendedProduct || '').toLowerCase()}`}
                    >
                      {job.recommendedProduct}
                    </span>
                  </td>
                  <td>{job.level}</td>
                  <td>{String(job.status || '').replaceAll('_', ' ')}</td>
                  <td className="muted">
                    {(job.steps || []).map((s) => `${s.id}:${s.status}`).join(' · ') || '—'}
                  </td>
                  <td className="muted">
                    {job.createdAt ? new Date(job.createdAt).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
              {!jobs.length ? (
                <tr>
                  <td colSpan={6} className="empty">
                    No autopilot jobs yet. Select clinics in Lead Engine and click Push to AI
                    Autopilot.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
