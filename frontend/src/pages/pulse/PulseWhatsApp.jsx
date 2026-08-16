import { useEffect, useState, useMemo } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';

export default function PulseWhatsApp() {
  const toast = useToast();
  const [messages, setMessages] = useState([]);
  const [presets, setPresets] = useState({ whatsappTemplates: [] });
  const [selectedTemplateId, setSelectedTemplateId] = useState('reach_pitch');
  const [targetPhone, setTargetPhone] = useState('+91 98765 43210');
  const [doctorName, setDoctorName] = useState('Dr. Rajesh Sharma');
  const [clinicName, setClinicName] = useState('Apex Dental & Orthodontic Clinic');
  const [specialty, setSpecialty] = useState('Dental Care');
  const [locality, setLocality] = useState('Indiranagar');
  const [city, setCity] = useState('Bangalore');
  const [product, setProduct] = useState('PRIME');
  const [customText, setCustomText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [msgRes, presetsRes] = await Promise.all([
        api.pulseMessages({ channel: 'whatsapp', limit: 40 }),
        api.pulsePresets(),
      ]);
      setMessages(msgRes.messages || []);
      if (presetsRes.whatsappTemplates) setPresets(presetsRes);
    } catch (err) {
      toast(err.message || 'Failed to load WhatsApp data');
    }
  }

  const activeTemplate = useMemo(() => {
    return (
      presets.whatsappTemplates?.find((t) => t.id === selectedTemplateId) ||
      presets.whatsappTemplates?.[0] || {
        id: 'reach_pitch',
        label: 'Reach Discovery Pitch',
        body: 'Hi Dr. {{doctorName}}, greetings from Practo! 🏥\n\nWe noticed high patient search volume for {{specialty}} in {{locality}}. Practo Reach can position {{clinicName}} in the top 3 sponsored slots.\n\nWould you like me to share our locality slot inventory?',
      }
    );
  }, [presets, selectedTemplateId]);

  const renderedPreview = useMemo(() => {
    const raw = customText || activeTemplate.body;
    return raw
      .replaceAll('{{doctorName}}', doctorName || 'Doctor')
      .replaceAll('{{clinicName}}', clinicName || 'Clinic')
      .replaceAll('{{specialty}}', specialty || 'Specialty Care')
      .replaceAll('{{locality}}', locality || 'City Center')
      .replaceAll('{{city}}', city || 'Bangalore')
      .replaceAll('{{product}}', product || 'Prime')
      .replaceAll('{{pitchDeckUrl}}', 'https://gamma.app/docs/practopulse-proposal-demo');
  }, [customText, activeTemplate, doctorName, clinicName, specialty, locality, city, product]);

  async function handleSend(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api.sendWhatsApp({
        to: targetPhone,
        doctorName,
        clinicName,
        specialty,
        locality,
        city,
        product,
        templateId: selectedTemplateId,
        customBody: customText || undefined,
      });
      toast(res.message || 'WhatsApp message dispatched with read receipt');
      loadData();
    } catch (err) {
      toast(err.message || 'WhatsApp send failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pulse-page">
      <header className="pulse-head row">
        <div>
          <span className="px-eyebrow">Direct Messaging &amp; Drips</span>
          <h1>Autopilot WhatsApp Studio</h1>
          <p>
            Autonomous WhatsApp outreach engine with high-converting templates, dynamic variable merge, realistic chat bubble preview, and real-time delivery &amp; read tracking.
          </p>
        </div>
      </header>

      <div className="pulse-grid-2" style={{ gap: 20, marginBottom: 24 }}>
        {/* Left: Template & Variables Configuration */}
        <section className="pulse-card">
          <h2 style={{ margin: '0 0 12px' }}>Configure WhatsApp Pitch</h2>
          <form onSubmit={handleSend}>
            <label>
              Select Pitch Template
              <select
                value={selectedTemplateId}
                onChange={(e) => {
                  setSelectedTemplateId(e.target.value);
                  setCustomText('');
                }}
              >
                {(presets.whatsappTemplates || []).map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="pulse-grid-2" style={{ gap: 10, marginTop: 12 }}>
              <label>
                Prospect Mobile Number
                <input
                  type="text"
                  value={targetPhone}
                  onChange={(e) => setTargetPhone(e.target.value)}
                  placeholder="+91 98765 43210"
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

            <div className="pulse-grid-2" style={{ gap: 10, marginTop: 12 }}>
              <label>
                Specialty
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Dental Care"
                />
              </label>
              <label>
                Product Focus
                <select value={product} onChange={(e) => setProduct(e.target.value)}>
                  <option value="PRIME">Practo Prime</option>
                  <option value="REACH">Practo Reach</option>
                  <option value="HYBRID">Reach + Prime Hybrid</option>
                </select>
              </label>
            </div>

            <label style={{ marginTop: 12 }}>
              Customize Message Text (Optional override)
              <textarea
                rows={3}
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Leave blank to use default template with auto-variables…"
              />
            </label>

            <div className="pulse-actions" style={{ marginTop: 16 }}>
              <button type="submit" className="pulse-btn" disabled={busy} style={{ width: '100%', padding: '0.75rem 1rem' }}>
                {busy ? 'Dispatching Message…' : '💬 Send WhatsApp Pitch Now'}
              </button>
            </div>
          </form>
        </section>

        {/* Right: Live Realistic WhatsApp Chat Mockup */}
        <section className="pulse-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ margin: '0 0 12px' }}>Live WhatsApp Mockup Preview</h2>
          <div
            style={{
              flex: 1,
              background: '#0b141a',
              backgroundImage: 'radial-gradient(rgba(148, 163, 184, 0.05) 1px, transparent 0)',
              backgroundSize: '16px 16px',
              borderRadius: 14,
              border: '1px solid rgba(148, 163, 184, 0.15)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 360,
            }}
          >
            {/* Mock Chat Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                paddingBottom: 10,
                borderBottom: '1px solid rgba(148, 163, 184, 0.12)',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: '50%',
                  background: '#00a884',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                P
              </div>
              <div>
                <strong style={{ fontSize: '0.9rem', color: '#e9edef', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Practo Healthcare Growth <span style={{ color: '#53bdeb', fontSize: '0.8rem' }}>✓</span>
                </strong>
                <div style={{ fontSize: '0.72rem', color: '#8696a0' }}>Official Business Account · {targetPhone}</div>
              </div>
            </div>

            {/* Mock Message Bubble */}
            <div style={{ margin: '20px 0', alignSelf: 'flex-end', maxWidth: '88%' }}>
              <div
                style={{
                  background: '#005c4b',
                  color: '#e9edef',
                  borderRadius: '8px 8px 0px 8px',
                  padding: '10px 14px',
                  fontSize: '0.85rem',
                  lineHeight: 1.45,
                  whiteSpace: 'pre-wrap',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
                  position: 'relative',
                }}
              >
                {renderedPreview}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '0.68rem',
                    color: '#8696a0',
                    marginTop: 6,
                  }}
                >
                  <span>10:42 AM</span>
                  <span style={{ color: '#53bdeb', fontWeight: 'bold' }}>✓✓</span>
                </div>
              </div>
            </div>

            {/* Mock Bottom Input Bar */}
            <div
              style={{
                background: '#202c33',
                borderRadius: 8,
                padding: '8px 12px',
                fontSize: '0.78rem',
                color: '#8696a0',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span>Type a reply…</span>
              <span>🔒 End-to-end encrypted</span>
            </div>
          </div>
        </section>
      </div>

      {/* WhatsApp Message Activity Log */}
      <section className="pulse-card">
        <div className="pulse-head row" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Dispatched Messages History ({messages.length})</h2>
          <button type="button" className="pulse-btn ghost" onClick={loadData}>
            Refresh
          </button>
        </div>

        <div className="pulse-table-wrap">
          <table className="pulse-table">
            <thead>
              <tr>
                <th>Message ID / Time</th>
                <th>Recipient Phone</th>
                <th>Status</th>
                <th>Message Body Preview</th>
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
                    <span
                      className={`pulse-status-pill ${
                        m.status === 'read' ? 'ok' : m.status === 'delivered' ? 'ok' : 'idle'
                      }`}
                    >
                      {m.status === 'read' ? 'Read ✓✓' : m.status === 'delivered' ? 'Delivered ✓✓' : m.status}
                    </span>
                  </td>
                  <td style={{ maxWidth: 460 }}>
                    <div style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>{m.body}</div>
                  </td>
                  <td>
                    <span className="pulse-chip">{m.provider || 'meta_cloud_api'}</span>
                  </td>
                </tr>
              ))}
              {!messages.length ? (
                <tr>
                  <td colSpan={5} className="empty">
                    No WhatsApp messages logged yet. Use the simulator above to dispatch.
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
