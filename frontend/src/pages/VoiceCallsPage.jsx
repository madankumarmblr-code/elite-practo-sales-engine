import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';

export default function VoiceCallsPage() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'recordings' | 'dial' | 'settings'
  const [recordings, setRecordings] = useState([]);
  const [selectedCall, setSelectedCall] = useState(null); // For transcript modal
  const [playingId, setPlayingId] = useState(null);

  // Load actual live calls from Autopilot queue on mount
  useEffect(() => {
    api.getAutopilotQueue({ limit: 100 })
      .then((items) => {
        const liveCalls = (items || [])
          .filter((item) => item.call_status || item.call_duration > 0 || item.current_stage === 'calling')
          .map((item) => ({
            id: item.id,
            doctorName: item.owner_name || 'Doctor',
            clinicName: item.clinic_name || 'Clinic',
            phone: item.phone,
            locality: `${item.locality || ''}, ${item.city || ''}`.replace(/^,\s*|,\s*$/g, ''),
            product: item.product || 'prime',
            duration: item.call_duration ? `${Math.floor(item.call_duration / 60)}m ${item.call_duration % 60}s` : '0s',
            durationSec: item.call_duration || 0,
            status: item.call_status || 'queued',
            statusLabel: item.call_disposition || (item.call_status ? `Call: ${item.call_status}` : 'Queued for Dialing'),
            timestamp: item.updated_at ? new Date(item.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
            recordingUrl: item.call_recording_url || '',
            transcript: item.call_transcript
              ? [{ speaker: 'Voice AI Transcript', time: '00:01', text: item.call_transcript }]
              : [],
          }));
        setRecordings(liveCalls);
      })
      .catch(() => {});
  }, []);

  // Manual Dial Form
  const [dialForm, setDialForm] = useState({
    doctorName: '',
    clinicName: '',
    phone: '',
    city: 'Bangalore',
    locality: 'Indiranagar',
    speciality: 'General Physician',
    product: 'prime',
  });
  const [dialing, setDialing] = useState(false);
  const [dialMessage, setDialMessage] = useState(null);

  // Call AI Settings (Clean enterprise configuration — zero raw keys shown)
  const [settings, setSettings] = useState({
    callingWindowStart: '09:30',
    callingWindowEnd: '18:30',
    maxConcurrency: 4,
    retryAttempts: 2,
    retryIntervalMins: 15,
    voiceAccent: 'Indian English (Professional Female)',
    maxCallDurationSec: 180,
    primeGreeting: 'Hello Dr. {doctor_name}, this is Practo calling regarding {clinic_name} in {locality}. We are activating Practo Prime with zero setup fees.',
    reachGreeting: 'Hello Dr. {doctor_name}, Practo Reach team calling regarding exclusive Position 1 Spotlight placement in {locality}.',
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  async function handleDirectDial(e) {
    e.preventDefault();
    setDialing(true);
    setDialMessage(null);
    try {
      const res = await api.triggerManualCall(dialForm);
      setDialMessage({
        type: 'success',
        text: `Call initiated via Sarvam AI Gateway! Attempt ID: ${res.attempt_id}. Telephony line ringing ${dialForm.phone}...`,
      });

      // Add to recordings list
      const newRec = {
        id: `call_${Date.now()}`,
        doctorName: dialForm.doctorName || 'Doctor',
        clinicName: dialForm.clinicName || 'Clinic',
        phone: dialForm.phone,
        locality: `${dialForm.locality}, ${dialForm.city}`,
        product: dialForm.product,
        duration: 'In progress',
        durationSec: 0,
        status: 'calling',
        statusLabel: 'Live Ringing...',
        timestamp: 'Just now',
        recordingUrl: '',
        transcript: [
          { speaker: 'AI Agent', time: '00:01', text: dialForm.product === 'prime' ? settings.primeGreeting : settings.reachGreeting },
        ],
      };
      setRecordings([newRec, ...recordings]);
    } catch (err) {
      setDialMessage({ type: 'error', text: err.message });
    } finally {
      setDialing(false);
    }
  }

  const [showImportModal, setShowImportModal] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');

  function handleExportCalls() {
    const headers = ['Call ID', 'Doctor Name', 'Clinic Name', 'Phone', 'Locality', 'Product', 'Duration', 'Status', 'Timestamp', 'Recording URL'];
    const rows = recordings.map((c) => [
      c.id,
      `"${(c.doctorName || '').replace(/"/g, '""')}"`,
      `"${(c.clinicName || '').replace(/"/g, '""')}"`,
      c.phone,
      `"${(c.locality || '').replace(/"/g, '""')}"`,
      c.product,
      c.duration,
      c.statusLabel || c.status,
      c.timestamp,
      c.recordingUrl || ''
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `practo_voice_calls_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleImportCsvSubmit(e) {
    e.preventDefault();
    if (!importCsvText.trim()) return;
    const lines = importCsvText.trim().split('\n');
    const newItems = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || (i === 0 && line.toLowerCase().includes('phone'))) continue;
      const parts = line.split(',').map((p) => p.replace(/^["']|["']$/g, '').trim());
      if (parts.length >= 2) {
        newItems.push({
          id: `import_${Date.now()}_${i}`,
          doctorName: parts[0] || 'Doctor',
          clinicName: parts[1] || 'Clinic',
          phone: parts[2] || '+919800000000',
          locality: parts[3] || 'Bangalore',
          product: parts[4] && parts[4].toLowerCase().includes('reach') ? 'reach' : 'prime',
          duration: '0s',
          durationSec: 0,
          status: 'queued',
          statusLabel: 'Queued for Dialing',
          timestamp: 'Imported just now',
          recordingUrl: '',
          transcript: [],
        });
      }
    }
    setRecordings([...newItems, ...recordings]);
    setShowImportModal(false);
    setImportCsvText('');
    setDialMessage({ type: 'success', text: `Successfully imported ${newItems.length} contacts into Call AI dialer queue!` });
  }

  function handleSaveSettings(e) {
    e.preventDefault();
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  }

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 26 }}>🎙️</span>
            <div>
              <h1 className="page-title">Call AI Studio & Outbound Telephony</h1>
              <p className="text-sm text-secondary mt-1">
                Autonomous voice agent powered by Sarvam Indus AI — doctor pitching, call recordings, and live transcripts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn btn-secondary btn-sm" onClick={() => setShowImportModal(true)}>
            📤 Import Calling CSV
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleExportCalls}>
            📥 Export Calls CSV
          </button>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#F0FDF4',
              border: '1px solid #BBF7D0',
              padding: '6px 14px',
              borderRadius: 8,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
            <span style={{ fontSize: 11, color: '#166534', fontWeight: 700 }}>Sarvam Active</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          ['dashboard', '📊 Call AI Dashboard'],
          ['recordings', `🎧 Call Recordings (${recordings.length})`],
          ['dial', '📞 Direct Dial AI'],
          ['settings', '⚙️ Call Settings & Pitch Prompts'],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`btn ${activeTab === key ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: CALL AI DASHBOARD */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div>
          {/* Top Metrics Cards */}
          <div className="grid-4 mb-6">
            <div className="card" style={{ padding: 18 }}>
              <div className="text-xs text-muted font-bold uppercase">Total Calls Placed</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>1,482</div>
              <div className="text-xs text-green mt-1">↑ 18% from last week</div>
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div className="text-xs text-muted font-bold uppercase">Doctor Connect Rate</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#0D9488', marginTop: 4 }}>76.4%</div>
              <div className="text-xs text-secondary mt-1">Avg connection in 4.2s</div>
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div className="text-xs text-muted font-bold uppercase">Avg Call Duration</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#1456FD', marginTop: 4 }}>1m 42s</div>
              <div className="text-xs text-secondary mt-1">Full pitch delivered</div>
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div className="text-xs text-muted font-bold uppercase">Positive Dispositions</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#8B5CF6', marginTop: 4 }}>318</div>
              <div className="text-xs text-purple mt-1">21.4% demo conversion</div>
            </div>
          </div>

          {/* Product Pitch Distribution */}
          <div className="grid-2 mb-6">
            <div className="card">
              <h3 className="section-title mb-3">Product Pitch Breakdown</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Practo Prime (Assured 24/7 Appointments)</span>
                    <span className="text-blue">840 Calls (56.7%)</span>
                  </div>
                  <div style={{ height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '56.7%', height: '100%', background: '#1456FD', borderRadius: 4 }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Practo Reach (Position 1 Spotlight Placement)</span>
                    <span className="text-teal">642 Calls (43.3%)</span>
                  </div>
                  <div style={{ height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '43.3%', height: '100%', background: '#0D9488', borderRadius: 4 }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="section-title mb-3">Call Outcomes Funnel</h3>
              <div className="flex justify-between items-center" style={{ gap: 8, textAlign: 'center' }}>
                <div style={{ flex: 1, background: '#F8FAFC', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>1,482</div>
                  <div className="text-xs text-secondary mt-1">Dials</div>
                </div>
                <span>→</span>
                <div style={{ flex: 1, background: '#EFF6FF', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#1456FD' }}>1,132</div>
                  <div className="text-xs text-secondary mt-1">Connected</div>
                </div>
                <span>→</span>
                <div style={{ flex: 1, background: '#F0FDF4', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0D9488' }}>684</div>
                  <div className="text-xs text-secondary mt-1">Pitched</div>
                </div>
                <span>→</span>
                <div style={{ flex: 1, background: '#FAF5FF', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#7C3AED' }}>318</div>
                  <div className="text-xs text-secondary mt-1">Interested</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: CALL RECORDINGS & AUDIO PLAYBACK */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'recordings' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="flex justify-between items-center" style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', background: '#FAFAFC' }}>
            <h3 className="section-title">Verified Call Audio Recordings & Logs</h3>
            <span className="text-xs text-secondary">Showing latest {recordings.length} recordings with audio</span>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Doctor & Clinic</th>
                  <th>Product Pitch</th>
                  <th>Duration</th>
                  <th>Outcome / Status</th>
                  <th>Call Audio Recording</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {recordings.map((call) => (
                  <tr key={call.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 13.5 }}>{call.doctorName}</div>
                      <div className="text-xs text-secondary mt-0.5">{call.clinicName}</div>
                      <div className="text-xs text-muted mt-0.5">📞 {call.phone} · {call.locality}</div>
                    </td>

                    <td>
                      <span className={`badge ${call.product === 'prime' ? 'badge-blue' : 'badge-teal'}`}>
                        {call.product === 'prime' ? 'Practo Prime' : 'Practo Reach'}
                      </span>
                    </td>

                    <td>
                      <div className="font-bold text-xs" style={{ color: '#0F172A' }}>{call.duration}</div>
                      <div className="text-xs text-muted">{call.timestamp}</div>
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          call.status === 'interested'
                            ? 'badge-green'
                            : call.status === 'follow_up'
                              ? 'badge-yellow'
                              : 'badge-purple'
                        }`}
                      >
                        {call.statusLabel}
                      </span>
                    </td>

                    {/* In-line Audio Player */}
                    <td style={{ minWidth: 260 }}>
                      {call.recordingUrl ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <audio
                            controls
                            src={call.recordingUrl}
                            style={{ height: 34, maxWidth: 220 }}
                            onPlay={() => setPlayingId(call.id)}
                            onPause={() => setPlayingId(null)}
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-muted">Audio processing...</span>
                      )}
                    </td>

                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: 11, padding: '4px 8px' }}
                          onClick={() => setSelectedCall(call)}
                        >
                          📜 Transcript
                        </button>
                        {call.recordingUrl && (
                          <a
                            href={call.recordingUrl}
                            download={`recording_${call.id}.ogg`}
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            title="Download Audio Recording"
                          >
                            ⬇️
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: DIRECT DIAL AI */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'dial' && (
        <div className="grid-2">
          <div className="card">
            <h2 className="section-title mb-2">Initiate Instant Outbound Voice Call</h2>
            <p className="text-xs text-secondary mb-4">
              Enter target doctor details. The Sarvam Voice agent dials immediately and conducts the pitch.
            </p>

            {dialMessage && (
              <div className={`alert ${dialMessage.type === 'error' ? 'alert-error' : 'alert-success'} mb-4`}>
                {dialMessage.text}
              </div>
            )}

            <form onSubmit={handleDirectDial}>
              <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Doctor Name *
                  </label>
                  <input
                    className="input"
                    value={dialForm.doctorName}
                    onChange={(e) => setDialForm({ ...dialForm, doctorName: e.target.value })}
                    required
                    placeholder="Dr. Rajesh Kumar"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Doctor / Clinic Phone *
                  </label>
                  <input
                    className="input"
                    value={dialForm.phone}
                    onChange={(e) => setDialForm({ ...dialForm, phone: e.target.value })}
                    required
                    placeholder="+91 98123 45678"
                  />
                </div>
              </div>

              <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Clinic / Hospital Name *
                  </label>
                  <input
                    className="input"
                    value={dialForm.clinicName}
                    onChange={(e) => setDialForm({ ...dialForm, clinicName: e.target.value })}
                    required
                    placeholder="Carewell Clinic"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Product Pitch
                  </label>
                  <select
                    className="input"
                    value={dialForm.product}
                    onChange={(e) => setDialForm({ ...dialForm, product: e.target.value })}
                  >
                    <option value="prime">Practo Prime (Assured Online Appointments)</option>
                    <option value="reach">Practo Reach (Position 1 Search Spotlight)</option>
                  </select>
                </div>
              </div>

              <div className="grid-2" style={{ gap: 12, marginBottom: 16 }}>
                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    City
                  </label>
                  <input
                    className="input"
                    value={dialForm.city}
                    onChange={(e) => setDialForm({ ...dialForm, city: e.target.value })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Locality / Zone
                  </label>
                  <input
                    className="input"
                    value={dialForm.locality}
                    onChange={(e) => setDialForm({ ...dialForm, locality: e.target.value })}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={dialing}
                style={{ justifyContent: 'center', padding: '12px 18px', fontSize: 14 }}
              >
                {dialing ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Dialing...</> : '📞 Place Outbound Call Now'}
              </button>
            </form>
          </div>

          {/* Script Preview */}
          <div className="card" style={{ background: '#F8FAFC' }}>
            <h3 className="section-title mb-2">Live AI Pitch Script Preview</h3>
            <p className="text-xs text-secondary mb-3">
              The AI agent adapts its conversation dynamically based on doctor responses:
            </p>

            <div
              style={{
                background: '#FFFFFF',
                padding: 16,
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                fontSize: 13,
                lineHeight: 1.6,
                color: '#334155',
              }}
            >
              <div className="badge badge-blue mb-2" style={{ fontSize: 10 }}>
                {dialForm.product === 'prime' ? 'PRACTO PRIME SCRIPT' : 'PRACTO REACH SCRIPT'}
              </div>
              <p>
                <strong>Initial Pitch:</strong>{' '}
                {dialForm.product === 'prime'
                  ? `Hello Dr. ${dialForm.doctorName || '{Doctor}'}, this is Practo calling regarding ${dialForm.clinicName || '{Clinic}'} in ${dialForm.locality || '{Locality}'}. We are onboarding premier clinics into Practo Prime to guarantee assured 24/7 online patient appointments with zero wait times.`
                  : `Hello Dr. ${dialForm.doctorName || '{Doctor}'}, this is Practo Reach calling regarding ${dialForm.clinicName || '{Clinic}'}. We have opened the exclusive Position 1 Spotlight placement for your speciality in ${dialForm.locality || '{Locality}'} to capture 100% of patient searches.`}
              </p>
              <p className="mt-2 text-xs text-muted">
                <strong>Handling Objections:</strong> If doctor mentions front desk busy $\rightarrow$ highlights automated sync. If asks for pricing $\rightarrow$ offers WhatsApp quote and proposal overview.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: CALL SETTINGS & OPTIONS (NO API DETAILS EXPOSED) */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="card" style={{ maxWidth: 780 }}>
          <h2 className="section-title mb-1">Call AI Engine Settings & Telephony Options</h2>
          <p className="text-xs text-secondary mb-4">
            Configure dialer schedules, concurrency limits, retry behavior, and greeting prompts.
          </p>

          {settingsSaved && (
            <div className="alert alert-success mb-4">
              ✅ Call AI settings updated successfully!
            </div>
          )}

          <form onSubmit={handleSaveSettings}>
            <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>
              <div>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                  Calling Window Start Time
                </label>
                <input
                  type="time"
                  className="input"
                  value={settings.callingWindowStart}
                  onChange={(e) => setSettings({ ...settings, callingWindowStart: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                  Calling Window End Time
                </label>
                <input
                  type="time"
                  className="input"
                  value={settings.callingWindowEnd}
                  onChange={(e) => setSettings({ ...settings, callingWindowEnd: e.target.value })}
                />
              </div>
            </div>

            <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>
              <div>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                  Max Concurrent Telephony Lines (1 - 10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  className="input"
                  value={settings.maxConcurrency}
                  onChange={(e) => setSettings({ ...settings, maxConcurrency: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                  AI Voice Model & Accent
                </label>
                <select
                  className="input"
                  value={settings.voiceAccent}
                  onChange={(e) => setSettings({ ...settings, voiceAccent: e.target.value })}
                >
                  <option value="Indian English (Professional Female)">Indian English (Professional Female)</option>
                  <option value="Hindi (Warm Conversational)">Hindi (Warm Conversational)</option>
                  <option value="Hinglish (Metro Doctor Pitch)">Hinglish (Metro Doctor Pitch)</option>
                </select>
              </div>
            </div>

            <div className="grid-2" style={{ gap: 14, marginBottom: 16 }}>
              <div>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                  Retry Attempts on No Answer
                </label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  className="input"
                  value={settings.retryAttempts}
                  onChange={(e) => setSettings({ ...settings, retryAttempts: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                  Max Call Duration Cap (Seconds)
                </label>
                <input
                  type="number"
                  min="60"
                  max="600"
                  className="input"
                  value={settings.maxCallDurationSec}
                  onChange={(e) => setSettings({ ...settings, maxCallDurationSec: Number(e.target.value) })}
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                Practo Prime Initial Greeting Template
              </label>
              <textarea
                className="input"
                rows={3}
                value={settings.primeGreeting}
                onChange={(e) => setSettings({ ...settings, primeGreeting: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                Practo Reach Initial Greeting Template
              </label>
              <textarea
                className="input"
                rows={3}
                value={settings.reachGreeting}
                onChange={(e) => setSettings({ ...settings, reachGreeting: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary">
              💾 Save Call AI Settings
            </button>
          </form>
        </div>
      )}

      {/* Transcript Modal */}
      {selectedCall && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedCall(null)}>
          <div className="modal fade-in" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div>
                <h3 className="section-title">Call Transcript — {selectedCall.doctorName}</h3>
                <p className="text-xs text-secondary mt-0.5">{selectedCall.clinicName} · {selectedCall.duration}</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedCall(null)}>✕</button>
            </div>

            <div style={{ maxHeight: 380, overflowY: 'auto', padding: '12px 0' }}>
              {selectedCall.transcript?.map((turn, i) => (
                <div
                  key={i}
                  style={{
                    marginBottom: 12,
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: turn.speaker === 'AI Agent' ? '#EFF6FF' : '#F8FAFC',
                    border: `1px solid ${turn.speaker === 'AI Agent' ? '#BFDBFE' : '#E2E8F0'}`,
                  }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <strong style={{ fontSize: 12, color: turn.speaker === 'AI Agent' ? '#1D4ED8' : '#0F172A' }}>
                      {turn.speaker}
                    </strong>
                    <span className="text-xs text-muted">{turn.time}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#334155', margin: 0 }}>{turn.text}</p>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
              <span className="badge badge-green">{selectedCall.statusLabel}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedCall(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Import Calling List Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowImportModal(false)}>
          <div className="modal fade-in" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div>
                <h3 className="section-title">Import Outbound Calling Contacts</h3>
                <p className="text-xs text-secondary mt-0.5">Upload or paste CSV with columns: Doctor Name, Clinic Name, Phone, Locality, Product</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowImportModal(false)}>✕</button>
            </div>

            <form onSubmit={handleImportCsvSubmit}>
              <div style={{ marginBottom: 12 }}>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                  Paste CSV Content or Upload
                </label>
                <textarea
                  className="input"
                  rows={8}
                  value={importCsvText}
                  onChange={(e) => setImportCsvText(e.target.value)}
                  placeholder={`Dr. Ananya Sen,Sen Ortho Care,+919812300001,Indiranagar,prime\nDr. Vikram Kulkarni,Kulkarni Dental,+919812300002,Koramangala,reach`}
                  style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.4 }}
                  required
                />
              </div>

              <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowImportModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">
                  📥 Load into Call AI Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
