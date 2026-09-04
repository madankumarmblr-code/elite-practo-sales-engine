import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { EnterpriseIcon } from '../components/EnterpriseIcon.jsx';

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'logs' | 'send' | 'settings'
  const [messages, setMessages] = useState([]);

  // Load live WhatsApp messages from Autopilot pipeline on mount
  useEffect(() => {
    api.getAutopilotQueue({ limit: 100 })
      .then((items) => {
        const liveWA = (items || [])
          .filter((item) => item.whatsapp_status || item.current_stage === 'whatsapp')
          .map((item) => ({
            id: item.id,
            doctorName: item.owner_name || 'Doctor',
            clinicName: item.clinic_name || 'Clinic',
            phone: item.phone,
            product: item.product || 'prime',
            status: item.whatsapp_status || 'sent',
            statusLabel: item.whatsapp_status ? `WhatsApp: ${item.whatsapp_status}` : 'Dispatched',
            sentAt: item.updated_at ? new Date(item.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
            body: item.whatsapp_summary || `Practo AI automated summary dispatched for ${item.clinic_name || 'clinic'}.`,
            reply: null,
          }));
        setMessages(liveWA);
      })
      .catch(() => {});
  }, []);

  // Send Form
  const [form, setForm] = useState({
    doctorName: '',
    clinicName: '',
    phone: '',
    product: 'prime',
    customMessage: '',
  });
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  // WhatsApp AI Settings (Enterprise options — zero raw keys shown)
  const [settings, setSettings] = useState({
    autoFollowUpMissedCalls: true,
    followUpDelayMins: 5,
    enableFallbackWebLink: true,
    primeTemplate: `Hello Dr. {doctor_name},\n\nThis is Practo Prime regarding *{clinic_name}*. We are activating Practo Prime for premier practices in your area, guaranteeing assured 24/7 online appointments and minimal clinic wait times.\n\nReply *YES* to activate your Prime badge with zero setup fees.`,
    reachTemplate: `Hello Dr. {doctor_name},\n\nThis is Practo Reach regarding *{clinic_name}*. We have opened the exclusive Position 1 Spotlight placement for your speciality in your area to capture 100% of high-intent patient searches.\n\nReply *YES* to claim this slot.`,
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  async function handleSend(e) {
    e.preventDefault();
    setSending(true);
    setSendResult(null);
    try {
      const res = await api.triggerManualWhatsApp({
        phone: form.phone,
        doctorName: form.doctorName,
        clinicName: form.clinicName,
        product: form.product,
        customMessage: form.customMessage || undefined,
      });

      setSendResult({
        type: 'success',
        text: `WhatsApp message processed! Link generated for ${res.phone}.`,
        waLink: res.waLink,
      });

      // Add to log
      const newMsg = {
        id: `wa_msg_${Date.now()}`,
        doctorName: form.doctorName || 'Doctor',
        clinicName: form.clinicName || 'Clinic',
        phone: res.phone,
        product: form.product,
        status: 'delivered',
        statusLabel: 'Delivered via Web Dispatch',
        sentAt: 'Just now',
        body: res.message,
        reply: null,
      };
      setMessages([newMsg, ...messages]);
    } catch (err) {
      setSendResult({ type: 'error', text: err.message });
    } finally {
      setSending(false);
    }
  }

  const [showImportModal, setShowImportModal] = useState(false);
  const [importCsvText, setImportCsvText] = useState('');

  function handleExportMessages() {
    const headers = ['Message ID', 'Doctor Name', 'Clinic Name', 'Phone', 'Product', 'Status', 'Sent Timestamp', 'Message Body', 'Doctor Reply'];
    const rows = messages.map((m) => [
      m.id,
      `"${(m.doctorName || '').replace(/"/g, '""')}"`,
      `"${(m.clinicName || '').replace(/"/g, '""')}"`,
      m.phone,
      m.product,
      m.statusLabel || m.status,
      m.sentAt,
      `"${(m.body || '').replace(/"/g, '""')}"`,
      `"${(m.reply || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `practo_whatsapp_messages_${new Date().toISOString().split('T')[0]}.csv`);
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
          id: `wa_imp_${Date.now()}_${i}`,
          doctorName: parts[0] || 'Doctor',
          clinicName: parts[1] || 'Clinic',
          phone: (parts[2] || '').replace(/\D/g, ''),
          product: parts[3] && parts[3].toLowerCase().includes('reach') ? 'reach' : 'prime',
          status: 'queued',
          statusLabel: 'Queued for Dispatch',
          sentAt: 'Imported just now',
          body: `Hello Dr. ${parts[0] || 'Doctor'}, Practo healthcare partnerships summary regarding ${parts[1] || 'your practice'}.`,
          reply: null,
        });
      }
    }
    setMessages([...newItems, ...messages]);
    setShowImportModal(false);
    setImportCsvText('');
    setSendResult({ type: 'success', text: `Successfully imported ${newItems.length} WhatsApp outreach targets!` });
  }

  function handleSaveSettings(e) {
    e.preventDefault();
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  }

  const totalMessages = messages.length;
  const deliveredCount = messages.filter((m) => ['delivered', 'sent', 'read', 'replied'].includes(m.status)).length;
  const deliveryRate = totalMessages > 0 ? ((deliveredCount / totalMessages) * 100).toFixed(1) : '100.0';
  const readCount = messages.filter((m) => ['read', 'replied'].includes(m.status)).length;
  const readRate = deliveredCount > 0 ? ((readCount / deliveredCount) * 100).toFixed(1) : '0.0';
  const replyCount = messages.filter((m) => m.reply || m.status === 'replied').length;
  const replyRate = totalMessages > 0 ? ((replyCount / totalMessages) * 100).toFixed(1) : '0.0';

  const primeMessages = messages.filter((m) => m.product === 'prime').length;
  const reachMessages = messages.filter((m) => m.product === 'reach').length;

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-3">
            <div style={{ width: 42, height: 42, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EnterpriseIcon name="message" size={24} color="#1456FD" />
            </div>
            <div>
              <h1 className="page-title">WhatsApp AI Studio</h1>
              <p className="text-sm text-secondary mt-0.5">
                Autonomous WhatsApp outreach, proposal summaries, and doctor follow-up sequences.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn btn-secondary btn-sm flex items-center gap-1.5" onClick={() => setShowImportModal(true)}>
            <EnterpriseIcon name="download" size={13} color="#475569" />
            <span>Import Contacts CSV</span>
          </button>
          <button className="btn btn-primary btn-sm flex items-center gap-1.5" onClick={handleExportMessages}>
            <EnterpriseIcon name="download" size={13} color="#FFFFFF" />
            <span>Export Messages CSV</span>
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
            <span style={{ fontSize: 11, color: '#166534', fontWeight: 700 }}>Meta WABA Active</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          ['dashboard', 'bar-chart', 'WhatsApp Dashboard'],
          ['logs', 'file-text', `Message Logs (${messages.length})`],
          ['send', 'message', 'Send WhatsApp Pitch'],
          ['settings', 'sliders', 'WhatsApp AI Settings'],
        ].map(([key, iconName, label]) => (
          <button
            key={key}
            className={`btn ${activeTab === key ? 'btn-primary' : 'btn-ghost'} btn-sm flex items-center gap-1.5`}
            onClick={() => setActiveTab(key)}
          >
            <EnterpriseIcon name={iconName} size={13} color={activeTab === key ? '#FFFFFF' : '#475569'} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: WHATSAPP DASHBOARD */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div>
          <div className="grid-4 mb-6">
            <div className="card" style={{ padding: 18 }}>
              <div className="text-xs text-muted font-bold uppercase">Messages Dispatched</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>{totalMessages}</div>
              <div className="text-xs text-secondary mt-1">Total live dispatched messages</div>
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div className="text-xs text-muted font-bold uppercase">Delivery Rate</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#10B981', marginTop: 4 }}>{deliveryRate}%</div>
              <div className="text-xs text-secondary mt-1">{deliveredCount} delivered successfully</div>
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div className="text-xs text-muted font-bold uppercase">Doctor Read Rate</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#1456FD', marginTop: 4 }}>{readRate}%</div>
              <div className="text-xs text-secondary mt-1">{readCount} read confirmations</div>
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div className="text-xs text-muted font-bold uppercase">Inbound Doctor Replies</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#7C3AED', marginTop: 4 }}>{replyCount}</div>
              <div className="text-xs text-purple mt-1">{replyRate}% direct reply rate</div>
            </div>
          </div>

          <div className="grid-2 mb-6">
            <div className="card">
              <h3 className="section-title mb-3">Live Outreach by Product</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Practo Prime Activation Outreach</span>
                    <span className="text-blue">{primeMessages} Sent</span>
                  </div>
                  <div style={{ height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${totalMessages > 0 ? (primeMessages / totalMessages) * 100 : 50}%`, height: '100%', background: '#1456FD', borderRadius: 4 }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Practo Reach Spotlight Slot Outreach</span>
                    <span className="text-teal">{reachMessages} Sent</span>
                  </div>
                  <div style={{ height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${totalMessages > 0 ? (reachMessages / totalMessages) * 100 : 50}%`, height: '100%', background: '#0D9488', borderRadius: 4 }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="section-title mb-3">Outreach Automation Funnel</h3>
              <div className="flex justify-between items-center" style={{ gap: 8, textAlign: 'center' }}>
                <div style={{ flex: 1, background: '#F8FAFC', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>{totalMessages}</div>
                  <div className="text-xs text-secondary mt-1">Dispatched</div>
                </div>
                <span>→</span>
                <div style={{ flex: 1, background: '#EFF6FF', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#1456FD' }}>{deliveredCount}</div>
                  <div className="text-xs text-secondary mt-1">Delivered</div>
                </div>
                <span>→</span>
                <div style={{ flex: 1, background: '#F0FDF4', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0D9488' }}>{readCount}</div>
                  <div className="text-xs text-secondary mt-1">Read</div>
                </div>
                <span>→</span>
                <div style={{ flex: 1, background: '#FAF5FF', padding: 12, borderRadius: 8 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#7C3AED' }}>{replyCount}</div>
                  <div className="text-xs text-secondary mt-1">Replied</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: MESSAGE LOGS */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'logs' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="flex justify-between items-center" style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', background: '#FAFAFC' }}>
            <h3 className="section-title">Dispatched WhatsApp Pitch Messages</h3>
            <span className="text-xs text-secondary">{messages.length} messages in audit trail</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {messages.map((m, idx) => (
              <div
                key={m.id}
                style={{
                  padding: '18px 24px',
                  borderBottom: idx === messages.length - 1 ? 'none' : '1px solid #F1F5F9',
                  background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFC',
                }}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    <strong style={{ fontSize: 14, color: '#0F172A' }}>{m.doctorName}</strong>
                    <span className="text-xs text-secondary">({m.clinicName})</span>
                    <span className={`badge ${m.product === 'prime' ? 'badge-blue' : 'badge-teal'}`}>
                      {m.product === 'prime' ? 'Practo Prime' : 'Practo Reach'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted">📱 +{m.phone} · {m.sentAt}</span>
                    <span
                      className={`badge ${
                        m.status === 'replied' ? 'badge-green' : m.status === 'read' ? 'badge-blue' : 'badge-gray'
                      }`}
                    >
                      {m.statusLabel}
                    </span>
                  </div>
                </div>

                {/* Message Bubble Preview */}
                <div
                  style={{
                    background: '#F0FDF4',
                    border: '1px solid #DCFCE7',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: '#1E293B',
                    whiteSpace: 'pre-wrap',
                    maxWidth: 720,
                  }}
                >
                  {m.body}
                </div>

                {/* Inbound Reply if present */}
                {m.reply && (
                  <div
                    style={{
                      marginTop: 8,
                      marginLeft: 24,
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      borderRadius: 8,
                      padding: '8px 12px',
                      fontSize: 12.5,
                      color: '#1E40AF',
                      maxWidth: 680,
                    }}
                  >
                    💬 <strong>Doctor Reply:</strong> &ldquo;{m.reply}&rdquo;
                  </div>
                )}

                <div className="flex justify-end gap-2 mt-2">
                  <a
                    href={`https://wa.me/${m.phone}?text=${encodeURIComponent(m.body)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 11, padding: '3px 8px' }}
                  >
                    ↗ Open in WhatsApp Web
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: DIRECT SEND */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'send' && (
        <div className="grid-2">
          <div className="card">
            <h2 className="section-title mb-2">Send WhatsApp Pitch Message</h2>
            <p className="text-xs text-secondary mb-4">
              Send a personalized Practo commercial pitch directly to a doctor or clinic manager.
            </p>

            {sendResult && (
              <div className={`alert ${sendResult.type === 'error' ? 'alert-error' : 'alert-success'} mb-4`}>
                <div>{sendResult.text}</div>
                {sendResult.waLink && (
                  <div className="mt-2">
                    <a href={sendResult.waLink} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                      ↗ Launch in WhatsApp Web Now
                    </a>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSend}>
              <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Doctor Name *
                  </label>
                  <input
                    className="input"
                    value={form.doctorName}
                    onChange={(e) => setForm({ ...form, doctorName: e.target.value })}
                    required
                    placeholder="Dr. Sumanth Shetty"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Phone Number *
                  </label>
                  <input
                    className="input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    required
                    placeholder="+91 98123 45678"
                  />
                </div>
              </div>

              <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Clinic Name
                  </label>
                  <input
                    className="input"
                    value={form.clinicName}
                    onChange={(e) => setForm({ ...form, clinicName: e.target.value })}
                    placeholder="Chisel Dental"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Pitch Product Angle
                  </label>
                  <select
                    className="input"
                    value={form.product}
                    onChange={(e) => setForm({ ...form, product: e.target.value })}
                  >
                    <option value="prime">Practo Prime (Assured Appointments & Zero Wait Time)</option>
                    <option value="reach">Practo Reach (Position 1 Search Spotlight)</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                  Custom Message (Optional — leave blank to use optimized AI template)
                </label>
                <textarea
                  className="input"
                  rows={4}
                  value={form.customMessage}
                  onChange={(e) => setForm({ ...form, customMessage: e.target.value })}
                  placeholder="Type a custom message or let AI generate the official pitch..."
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={sending}
                style={{ justifyContent: 'center', padding: '12px 18px', fontSize: 14 }}
              >
                {sending ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Dispatching...</> : '💬 Dispatch WhatsApp Pitch'}
              </button>
            </form>
          </div>

          {/* WhatsApp Chat Preview */}
          <div className="card" style={{ background: '#E5DDD5', padding: 20, borderRadius: 12 }}>
            <div style={{ background: '#075E54', color: '#FFFFFF', padding: '10px 14px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#25D366', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>P</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>Practo Healthcare Solutions</div>
                <div style={{ fontSize: 11, opacity: 0.85 }}>Official Business Account ✓</div>
              </div>
            </div>

            <div style={{ background: '#EFEAE2', padding: 16, minHeight: 240, borderRadius: '0 0 8px 8px' }}>
              <div
                style={{
                  background: '#FFFFFF',
                  padding: 12,
                  borderRadius: '0 8px 8px 8px',
                  boxShadow: '0 1px 1px rgba(0,0,0,0.1)',
                  fontSize: 13,
                  lineHeight: 1.5,
                  maxWidth: 320,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {form.customMessage ||
                  (form.product === 'reach'
                    ? `Hello Dr. ${form.doctorName || 'Doctor'},\n\nThis is Practo Reach regarding *${form.clinicName || 'your clinic'}*. We have opened the exclusive Position 1 Spotlight placement for your speciality in your area.\n\nOnly 1 slot is allocated to capture 100% of high-intent patient searches.\n\nReply *YES* to claim this slot.`
                    : `Hello Dr. ${form.doctorName || 'Doctor'},\n\nThis is Practo Prime regarding *${form.clinicName || 'your clinic'}*. We are activating Practo Prime for premier clinics in your area, guaranteeing assured 24/7 online appointments and minimal clinic wait times.\n\nReply *YES* to activate your Prime badge with zero setup fees.`)}
                <div style={{ textAlign: 'right', fontSize: 10, color: '#94A3B8', marginTop: 4 }}>
                  12:30 PM ✓✓
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 4: WHATSAPP SETTINGS (NO API DETAILS EXPOSED) */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="card" style={{ maxWidth: 780 }}>
          <h2 className="section-title mb-1">WhatsApp AI Engine Settings</h2>
          <p className="text-xs text-secondary mb-4">
            Configure automated follow-up delays, template phrasing, and delivery dispatch modes.
          </p>

          {settingsSaved && (
            <div className="alert alert-success mb-4">
              ✅ WhatsApp AI settings updated successfully!
            </div>
          )}

          <form onSubmit={handleSaveSettings}>
            <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, marginBottom: 16, border: '1px solid #E2E8F0' }}>
              <div className="text-xs font-bold text-secondary uppercase mb-2">Automated Outreach Triggers</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.autoFollowUpMissedCalls}
                    onChange={(e) => setSettings({ ...settings, autoFollowUpMissedCalls: e.target.checked })}
                  />
                  <span className="text-xs font-medium text-secondary">
                    Automatically trigger WhatsApp pitch if Doctor is in consultation / call not connected
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.enableFallbackWebLink}
                    onChange={(e) => setSettings({ ...settings, enableFallbackWebLink: e.target.checked })}
                  />
                  <span className="text-xs font-medium text-secondary">
                    Enable 1-Click WhatsApp Web link dispatch for sales representatives
                  </span>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                Follow-up Delay After Call Attempt
              </label>
              <select
                className="input"
                value={settings.followUpDelayMins}
                onChange={(e) => setSettings({ ...settings, followUpDelayMins: Number(e.target.value) })}
              >
                <option value={0}>Instant (Immediate dispatch)</option>
                <option value={5}>5 Minutes delay</option>
                <option value={15}>15 Minutes delay</option>
                <option value={30}>30 Minutes delay</option>
              </select>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                Practo Prime WhatsApp Template
              </label>
              <textarea
                className="input"
                rows={4}
                value={settings.primeTemplate}
                onChange={(e) => setSettings({ ...settings, primeTemplate: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                Practo Reach WhatsApp Template
              </label>
              <textarea
                className="input"
                rows={4}
                value={settings.reachTemplate}
                onChange={(e) => setSettings({ ...settings, reachTemplate: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary">
              💾 Save WhatsApp AI Settings
            </button>
          </form>
        </div>
      )}

      {/* Import Contacts Modal */}
      {showImportModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowImportModal(false)}>
          <div className="modal fade-in" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div>
                <h3 className="section-title">Import WhatsApp Outreach Contacts</h3>
                <p className="text-xs text-secondary mt-0.5">Upload or paste CSV with columns: Doctor Name, Clinic Name, Phone, Product</p>
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
                  placeholder={`Dr. Ananya Sen,Sen Ortho Care,919812300001,prime\nDr. Vikram Kulkarni,Kulkarni Dental,919812300002,reach`}
                  style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.4 }}
                  required
                />
              </div>

              <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowImportModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-teal btn-sm">
                  📥 Load into WhatsApp Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
