import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';

export default function PulseAutopilot() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [calls, setCalls] = useState([]);
  const [level, setLevel] = useState('sequence');
  const [tab, setTab] = useState('queue');
  const [busy, setBusy] = useState(false);
  const [msgFilter, setMsgFilter] = useState('all');

  const load = useCallback(() => {
    Promise.allSettled([
      api.pulseAutopilot(),
      api.pulseMessages({ limit: 80 }),
      api.pulseCallLogs({ limit: 80 }),
    ]).then(([ap, msgs, callsRes]) => {
      if (ap.status === 'fulfilled') {
        setData(ap.value);
        if (ap.value.level) setLevel(ap.value.level);
      } else toast(ap.reason?.message || 'Failed to load autopilot');
      if (msgs.status === 'fulfilled') setMessages(msgs.value.messages || []);
      if (callsRes.status === 'fulfilled') setCalls(callsRes.value.calls || []);
    });
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

  async function runChannelTest(channel) {
    setBusy(true);
    try {
      const res = await api.pulseTestChannel({ channel });
      toast(res.message || `${channel} tested`);
      load();
      if (channel === 'calls') setTab('calls');
      else setTab('messages');
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  }

  const jobs = data?.jobs || [];
  const filteredMessages =
    msgFilter === 'all' ? messages : messages.filter((m) => m.channel === msgFilter);

  return (
    <div className="pulse-page">
      <header className="pulse-head row">
        <div>
          <h1>AI Autopilot</h1>
          <p>
            Manage the full outreach pipeline — WhatsApp pitches, AI voice call recordings &amp;
            transcripts, and cold email drips. Configure webhook endpoints in Platform Settings.
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
              <option value="assist">Assist — WhatsApp pitch only</option>
              <option value="sequence">Sequence — WhatsApp + Gmail + Smartlead</option>
              <option value="full">Full — + AI calls + recordings + demo holds</option>
            </select>
          </label>
          <button type="button" className="pulse-btn" disabled={busy} onClick={saveLevel}>
            Save level
          </button>
        </div>
        <div className="pulse-actions" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="pulse-btn ghost"
            disabled={busy}
            onClick={() => runChannelTest('whatsapp')}
          >
            Test WhatsApp send
          </button>
          <button
            type="button"
            className="pulse-btn ghost"
            disabled={busy}
            onClick={() => runChannelTest('gmail')}
          >
            Test Gmail
          </button>
          <button
            type="button"
            className="pulse-btn navy"
            disabled={busy}
            onClick={() => runChannelTest('calls')}
          >
            Test AI call + recording
          </button>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          Auto flags: pitch {data?.auto?.pitch ? 'on' : 'off'} · Cold Email{' '}
          {data?.auto?.smartlead ? 'on' : 'off'} · WhatsApp on · AI Calls on
        </p>
      </section>


      <div className="pulse-actions" style={{ marginBottom: 12 }}>
        {[
          ['queue', 'Push queue'],
          ['messages', 'Sent messages'],
          ['calls', 'AI call logs'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`pulse-btn ${tab === id ? '' : 'ghost'}`}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
        <button type="button" className="pulse-btn ghost" onClick={load}>
          Refresh
        </button>
      </div>

      {tab === 'queue' ? (
        <section className="pulse-card">
          <h2 style={{ marginTop: 0 }}>Push queue ({jobs.length})</h2>
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
                      No jobs yet. Select clinics in Lead Engine → Push to AI Autopilot.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === 'messages' ? (
        <section className="pulse-card">
          <div className="pulse-head row" style={{ marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Sent messages ({filteredMessages.length})</h2>
            <select value={msgFilter} onChange={(e) => setMsgFilter(e.target.value)}>
              <option value="all">All channels</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="gmail">Gmail</option>
            </select>
          </div>
          <div className="pulse-table-wrap">
            <table className="pulse-table">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>To</th>
                  <th>Status</th>
                  <th>Body</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {filteredMessages.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <span className="pulse-chip">{m.channel}</span>
                      <div className="muted">{m.provider}</div>
                    </td>
                    <td>{m.to_address || '—'}</td>
                    <td>{m.status}</td>
                    <td className="muted" style={{ maxWidth: 320, whiteSpace: 'pre-wrap' }}>
                      {(m.body || '').slice(0, 180)}
                      {(m.body || '').length > 180 ? '…' : ''}
                    </td>
                    <td className="muted">
                      {m.created_at ? new Date(m.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
                {!filteredMessages.length ? (
                  <tr>
                    <td colSpan={5} className="empty">
                      No messages yet. Push leads or run Test WhatsApp / Gmail.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {tab === 'calls' ? (
        <section className="pulse-card">
          <h2 style={{ marginTop: 0 }}>AI Autopilot call logs ({calls.length})</h2>
          <div className="pulse-table-wrap">
            <table className="pulse-table">
              <thead>
                <tr>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Recording</th>
                  <th>Summary / transcript</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((c) => (
                  <tr key={c.id}>
                    <td>{c.phone || '—'}</td>
                    <td>{c.status}</td>
                    <td>{c.duration_sec ? `${c.duration_sec}s` : '—'}</td>
                    <td>
                      {c.recording_url ? (
                        <a href={c.recording_url} target="_blank" rel="noreferrer">
                          Open recording
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="muted" style={{ maxWidth: 280 }}>
                      <div>{c.summary || '—'}</div>
                      {c.transcript ? (
                        <div style={{ marginTop: 4, fontSize: '0.8rem' }}>
                          {(c.transcript || '').slice(0, 140)}…
                        </div>
                      ) : null}
                    </td>
                    <td className="muted">
                      {c.created_at ? new Date(c.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
                {!calls.length ? (
                  <tr>
                    <td colSpan={6} className="empty">
                      No AI calls yet. Use Full autopilot level or Test AI call.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
