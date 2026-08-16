import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';

export default function PulseCalls() {
  const toast = useToast();
  const [calls, setCalls] = useState([]);
  const [presets, setPresets] = useState({ voices: [], scripts: [] });
  const [selectedVoice, setSelectedVoice] = useState('elevenlabs_priya');
  const [selectedScript, setSelectedScript] = useState('prime_conversion');
  const [dialPhone, setDialPhone] = useState('+91 98765 43210');
  const [doctorName, setDoctorName] = useState('Dr. Rajesh Sharma');
  const [clinicName, setClinicName] = useState('Apex Dental & Orthodontic Clinic');
  const [locality, setLocality] = useState('Indiranagar');
  const [product, setProduct] = useState('PRIME');
  const [busy, setBusy] = useState(false);
  const [activeCallResult, setActiveCallResult] = useState(null);

  useEffect(() => {
    loadCallData();
  }, []);

  async function loadCallData() {
    try {
      const [logsRes, presetsRes] = await Promise.all([
        api.pulseCallLogs({ limit: 40 }),
        api.pulsePresets(),
      ]);
      setCalls(logsRes.calls || []);
      if (presetsRes.voices) setPresets(presetsRes);
    } catch (err) {
      toast(err.message || 'Failed to load call logs');
    }
  }

  async function handleDial(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.dialAiCall({
        phone: dialPhone,
        doctorName,
        clinicName,
        locality,
        product,
        voice: selectedVoice,
        scriptPreset: selectedScript,
      });
      setActiveCallResult(res);
      toast(res.message || 'AI Voice call completed successfully!');
      loadCallData();
    } catch (err) {
      toast(err.message || 'Dial failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pulse-page">
      <header className="pulse-head row">
        <div>
          <span className="px-eyebrow">Conversational AI Engine</span>
          <h1>Autopilot Calls Studio</h1>
          <p>
            Autonomous AI Voice calling for Practo Reach &amp; Prime. Select specialized Indian accents, simulate realistic clinic discovery dialogues, playback call recordings, inspect transcripts, and auto-dispatch post-call WhatsApp follow-ups.
          </p>
        </div>
      </header>

      {/* Interactive Call Studio Dialer */}
      <section className="pulse-card" style={{ marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 12px' }}>AI Voice Dialer &amp; Pitch Simulator</h2>
        <form onSubmit={handleDial} className="pulse-grid-2" style={{ gap: 16 }}>
          <div>
            <label>
              Voice Agent Persona
              <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)}>
                {(presets.voices || []).map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ marginTop: 12 }}>
              Pitch Script Preset
              <select value={selectedScript} onChange={(e) => setSelectedScript(e.target.value)}>
                {(presets.scripts || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ marginTop: 12 }}>
              Target Product Fit
              <select value={product} onChange={(e) => setProduct(e.target.value)}>
                <option value="PRIME">Practo Prime (Instant Booking &amp; Smart Number)</option>
                <option value="REACH">Practo Reach (Top Locality Sponsor Placement)</option>
                <option value="HYBRID">Hybrid Bundle (Reach + Prime + Ray PMS)</option>
              </select>
            </label>
          </div>

          <div>
            <div className="pulse-grid-2" style={{ gap: 10 }}>
              <label>
                Prospect Phone Number
                <input
                  type="text"
                  value={dialPhone}
                  onChange={(e) => setDialPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  required
                />
              </label>
              <label>
                Locality / Zone
                <input
                  type="text"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="Indiranagar"
                  required
                />
              </label>
            </div>

            <div className="pulse-grid-2" style={{ gap: 10, marginTop: 12 }}>
              <label>
                Doctor / Decision Maker
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="Dr. Rajesh Sharma"
                  required
                />
              </label>
              <label>
                Clinic Name
                <input
                  type="text"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  placeholder="Apex Dental Clinic"
                  required
                />
              </label>
            </div>

            <div className="pulse-actions" style={{ marginTop: 20 }}>
              <button type="submit" className="pulse-btn" disabled={busy} style={{ width: '100%', padding: '0.75rem 1rem' }}>
                {busy ? 'Connecting AI Voice Agent…' : '📞 Start Autonomous AI Call'}
              </button>
            </div>
          </div>
        </form>

        {/* Live Call Result Card */}
        {activeCallResult ? (
          <div
            style={{
              marginTop: 20,
              padding: 16,
              background: 'rgba(45, 212, 191, 0.08)',
              border: '1px solid rgba(45, 212, 191, 0.3)',
              borderRadius: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: '#2dd4bf', fontSize: '1rem' }}>
                ✓ Call Completed: {activeCallResult.durationSec}s · {activeCallResult.voice}
              </h3>
              <span className="pulse-status-pill ok">WhatsApp Dispatched ✓</span>
            </div>

            <p style={{ margin: '8px 0', fontSize: '0.85rem', color: '#e2e8f0' }}>
              {activeCallResult.summary}
            </p>

            {/* Audio Recording */}
            <div style={{ margin: '10px 0', background: 'rgba(15, 23, 42, 0.8)', padding: 8, borderRadius: 8 }}>
              <strong style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                Play Audio Recording
              </strong>
              <audio controls src={activeCallResult.recordingUrl} style={{ width: '100%', height: 36 }} />
            </div>

            {/* Transcript */}
            <details open style={{ marginTop: 8, fontSize: '0.82rem' }}>
              <summary style={{ cursor: 'pointer', color: '#38bdf8' }}>Interactive Dialogue Transcript</summary>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  marginTop: 6,
                  fontFamily: 'inherit',
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: 10,
                  borderRadius: 8,
                  lineHeight: 1.5,
                  color: '#cbd5e1',
                }}
              >
                {activeCallResult.transcript}
              </pre>
            </details>
          </div>
        ) : null}
      </section>

      {/* Call Logs & Audio Recording Archive */}
      <section className="pulse-card">
        <div className="pulse-head row" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Call Logs &amp; Recordings ({calls.length})</h2>
          <button type="button" className="pulse-btn ghost" onClick={loadCallData}>
            Refresh Logs
          </button>
        </div>

        <div className="pulse-table-wrap">
          <table className="pulse-table">
            <thead>
              <tr>
                <th>Call ID / Time</th>
                <th>Phone Number</th>
                <th>Voice Agent</th>
                <th>Duration</th>
                <th>Audio Recording</th>
                <th>Summary &amp; Transcript</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.id}</strong>
                    <div className="muted">{new Date(c.created_at).toLocaleString()}</div>
                  </td>
                  <td>{c.phone || '—'}</td>
                  <td>
                    <span className="pulse-chip">{c.provider || 'AI Voice'}</span>
                  </td>
                  <td>{c.duration_sec ? `${c.duration_sec}s` : '—'}</td>
                  <td style={{ minWidth: 220 }}>
                    {c.recording_url ? (
                      <audio controls src={c.recording_url} style={{ width: '100%', height: 32 }} />
                    ) : (
                      <span className="muted">No audio</span>
                    )}
                  </td>
                  <td style={{ maxWidth: 360 }}>
                    <div style={{ fontSize: '0.82rem', color: '#e2e8f0', marginBottom: 4 }}>
                      {c.summary || 'AI Call completed'}
                    </div>
                    {c.transcript ? (
                      <details style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        <summary style={{ cursor: 'pointer', color: '#38bdf8' }}>View Transcript</summary>
                        <pre style={{ whiteSpace: 'pre-wrap', marginTop: 4, fontFamily: 'inherit', background: 'rgba(15, 23, 42, 0.4)', padding: 6, borderRadius: 6 }}>
                          {c.transcript}
                        </pre>
                      </details>
                    ) : null}
                  </td>
                  <td>
                    <span className="pulse-status-pill ok">{c.status || 'completed'}</span>
                  </td>
                </tr>
              ))}
              {!calls.length ? (
                <tr>
                  <td colSpan={7} className="empty">
                    No calls recorded yet. Use the dialer above or push leads to Autopilot.
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
