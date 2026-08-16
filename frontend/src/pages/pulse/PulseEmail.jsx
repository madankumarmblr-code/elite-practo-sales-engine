import { useEffect, useState, useMemo } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';

export default function PulseEmail() {
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [presets, setPresets] = useState({ emailDripSteps: [] });
  const [selectedStep, setSelectedStep] = useState(1);
  const [recipientEmail, setRecipientEmail] = useState('doctor@apexclinic.example');
  const [doctorName, setDoctorName] = useState('Dr. Rajesh Sharma');
  const [clinicName, setClinicName] = useState('Apex Dental & Orthodontic Clinic');
  const [specialty, setSpecialty] = useState('Dental Care');
  const [locality, setLocality] = useState('Indiranagar');
  const [city, setCity] = useState('Bangalore');
  const [customBody, setCustomBody] = useState('');
  const [customSubject, setCustomSubject] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [msgRes, presetsRes] = await Promise.all([
        api.pulseMessages({ channel: 'gmail', limit: 40 }),
        api.pulsePresets(),
      ]);
      setMessages(msgRes.messages || []);
      if (presetsRes.emailDripSteps) setPresets(presetsRes);
    } catch (err) {
      toast(err.message || 'Failed to load email logs');
    }
  }

  const activeStepObj = useMemo(() => {
    return (
      presets.emailDripSteps?.find((s) => s.step === Number(selectedStep)) ||
      presets.emailDripSteps?.[0] || {
        step: 1,
        day: 'Day 0',
        title: 'Initial Value Pitch',
        subject: 'Growing patient footfall for {{clinicName}} in {{locality}}',
        body: 'Hi Dr. {{doctorName}},\n\nOver 18,000 patients searched for {{specialty}} care in {{locality}} on Practo last month.\n\nWould you be open to a brief 12-minute walkthrough?\n\nBest regards,\nPracto Healthcare Growth Team',
      }
    );
  }, [presets, selectedStep]);

  const renderedSubject = useMemo(() => {
    const raw = customSubject || activeStepObj.subject;
    return raw
      .replaceAll('{{doctorName}}', doctorName || 'Doctor')
      .replaceAll('{{clinicName}}', clinicName || 'Clinic')
      .replaceAll('{{specialty}}', specialty || 'Specialty Care')
      .replaceAll('{{locality}}', locality || 'City Center')
      .replaceAll('{{city}}', city || 'Bangalore');
  }, [customSubject, activeStepObj, doctorName, clinicName, specialty, locality, city]);

  const renderedBody = useMemo(() => {
    const raw = customBody || activeStepObj.body;
    return raw
      .replaceAll('{{doctorName}}', doctorName || 'Doctor')
      .replaceAll('{{clinicName}}', clinicName || 'Clinic')
      .replaceAll('{{specialty}}', specialty || 'Specialty Care')
      .replaceAll('{{locality}}', locality || 'City Center')
      .replaceAll('{{city}}', city || 'Bangalore')
      .replaceAll('{{pitchDeckUrl}}', 'https://gamma.app/docs/practopulse-proposal-demo');
  }, [customBody, activeStepObj, doctorName, clinicName, specialty, locality, city]);

  async function handleSend(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.sendEmail({
        to: recipientEmail,
        doctorName,
        clinicName,
        specialty,
        locality,
        city,
        step: selectedStep,
        subject: customSubject || undefined,
        customBody: customBody || undefined,
      });
      toast(res.message || 'Outreach email dispatched with open tracking');
      loadData();
    } catch (err) {
      toast(err.message || 'Email send failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pulse-page">
      <header className="pulse-head row">
        <div>
          <span className="px-eyebrow">Cold Outreach &amp; Sequencer</span>
          <h1>Autopilot Email Studio</h1>
          <p>
            Autonomous 3-step cold drip cadence engine. Personalize subject lines, inject dynamic practice metrics, preview HTML layouts, and track opens and clicks.
          </p>
        </div>
      </header>

      {/* Cadence Timeline Stepper */}
      <div className="pulse-kpis" style={{ marginBottom: 20 }}>
        {(presets.emailDripSteps || []).map((s) => (
          <div
            key={s.step}
            className={`pulse-kpi ${selectedStep === s.step ? 'tone-teal' : 'tone-blue'}`}
            style={{ cursor: 'pointer', opacity: selectedStep === s.step ? 1 : 0.75 }}
            onClick={() => {
              setSelectedStep(s.step);
              setCustomSubject('');
              setCustomBody('');
            }}
          >
            <span>{s.day} · Step {s.step}</span>
            <strong style={{ fontSize: '1rem' }}>{s.title}</strong>
            <em>Click to select &amp; edit</em>
          </div>
        ))}
      </div>

      <div className="pulse-grid-2" style={{ gap: 20, marginBottom: 24 }}>
        {/* Email Form */}
        <section className="pulse-card">
          <h2 style={{ margin: '0 0 12px' }}>Configure Email Sequence</h2>
          <form onSubmit={handleSend}>
            <label>
              Drip Cadence Step
              <select
                value={selectedStep}
                onChange={(e) => {
                  setSelectedStep(Number(e.target.value));
                  setCustomSubject('');
                  setCustomBody('');
                }}
              >
                {(presets.emailDripSteps || []).map((s) => (
                  <option key={s.step} value={s.step}>
                    Step {s.step} ({s.day}): {s.title}
                  </option>
                ))}
              </select>
            </label>

            <div className="pulse-grid-2" style={{ gap: 10, marginTop: 12 }}>
              <label>
                Recipient Email
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="doctor@clinic.com"
                  required
                />
              </label>
              <label>
                Target Locality
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
                Doctor Name
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

            <label style={{ marginTop: 12 }}>
              Subject Line (Auto-personalized)
              <input
                type="text"
                value={customSubject || activeStepObj.subject}
                onChange={(e) => setCustomSubject(e.target.value)}
              />
            </label>

            <label style={{ marginTop: 12 }}>
              Message Body
              <textarea
                rows={5}
                value={customBody || activeStepObj.body}
                onChange={(e) => setCustomBody(e.target.value)}
              />
            </label>

            <div className="pulse-actions" style={{ marginTop: 16 }}>
              <button type="submit" className="pulse-btn" disabled={busy} style={{ width: '100%', padding: '0.75rem 1rem' }}>
                {busy ? 'Sending Email…' : `✉️ Dispatch Step ${selectedStep} Email`}
              </button>
            </div>
          </form>
        </section>

        {/* Email Preview Card */}
        <section className="pulse-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: '0 0 12px' }}>Branded Email Client Preview</h2>
          <div
            style={{
              flex: 1,
              background: 'rgba(15, 23, 42, 0.95)',
              borderRadius: 12,
              border: '1px solid rgba(148, 163, 184, 0.2)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ borderBottom: '1px solid rgba(148, 163, 184, 0.15)', paddingBottom: 10 }}>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                From: <strong style={{ color: '#f8fafc' }}>Practo Healthcare Growth &lt;growth@practo.sales&gt;</strong>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: 4 }}>
                To: <strong style={{ color: '#38bdf8' }}>{recipientEmail}</strong>
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', marginTop: 8 }}>
                Subject: {renderedSubject}
              </div>
            </div>

            <div
              style={{
                flex: 1,
                fontSize: '0.85rem',
                lineHeight: 1.6,
                color: '#e2e8f0',
                whiteSpace: 'pre-wrap',
                background: 'rgba(30, 41, 59, 0.4)',
                padding: 14,
                borderRadius: 8,
              }}
            >
              {renderedBody}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b' }}>
              <span>Smartlead / Gmail API Tracking Active</span>
              <span style={{ color: '#2dd4bf' }}>Open &amp; Click Pixel Injected</span>
            </div>
          </div>
        </section>
      </div>

      {/* Dispatched Email Logs */}
      <section className="pulse-card">
        <div className="pulse-head row" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Email Outreach Logs ({messages.length})</h2>
          <button type="button" className="pulse-btn ghost" onClick={loadData}>
            Refresh
          </button>
        </div>

        <div className="pulse-table-wrap">
          <table className="pulse-table">
            <thead>
              <tr>
                <th>Message ID / Time</th>
                <th>Recipient Email</th>
                <th>Status</th>
                <th>Subject &amp; Body Snippet</th>
                <th>Provider</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id}>
                  <td>
                    <strong>{m.id}</strong>
                    <div className="muted">{new Date(m.created_at).toLocaleString()}</div>
                  </td>
                  <td>{m.to_address || m.to || '—'}</td>
                  <td>
                    <span className="pulse-status-pill ok">
                      {m.status === 'opened' ? 'Opened 👁️' : m.status || 'sent'}
                    </span>
                  </td>
                  <td style={{ maxWidth: 460 }}>
                    <div style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>{m.body}</div>
                  </td>
                  <td>
                    <span className="pulse-chip">{m.provider || 'smartlead_api'}</span>
                  </td>
                </tr>
              ))}
              {!messages.length ? (
                <tr>
                  <td colSpan={5} className="empty">
                    No outreach emails logged yet.
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
