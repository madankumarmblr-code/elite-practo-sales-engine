import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';

export default function AutopilotPage() {
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all'); // 'all' | 'calling' | 'rnr' | 'whatsapp_sent' | 'human_interference_required' | 'converted'
  const [productFilter, setProductFilter] = useState(''); // '' | 'prime' | 'reach'
  const [stepping, setStepping] = useState(false);

  // Manual Call Modal State
  const [showCallModal, setShowCallModal] = useState(false);
  const [callForm, setCallForm] = useState({
    phone: '',
    doctorName: '',
    clinicName: '',
    locality: 'Indiranagar',
    city: 'Bangalore',
    speciality: 'General Physician',
    product: 'prime',
  });
  const [callingNow, setCallingNow] = useState(false);

  // Manual WhatsApp Modal State
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppForm, setWhatsAppForm] = useState({
    phone: '',
    doctorName: '',
    clinicName: '',
    product: 'prime',
    customMessage: '',
  });
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  // Selected item for Email Review & Approval Modal
  const [reviewItem, setReviewItem] = useState(null);
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [approving, setApproving] = useState(false);

  // Selected item for Transcript Viewer Modal
  const [transcriptItem, setTranscriptItem] = useState(null);

  // Advance Outcome Modal State
  const [advanceItem, setAdvanceItem] = useState(null);

  const [message, setMessage] = useState(null);

  async function loadData() {
    setLoading(true);
    try {
      let filterStage = undefined;
      if (tab === 'rnr') filterStage = 'rnr_scheduled_retry';
      else if (tab !== 'all') filterStage = tab;

      const [q, s] = await Promise.all([
        api.getAutopilotQueue({
          status: filterStage,
          product: productFilter || undefined,
          limit: 100,
        }),
        api.getAutopilotStats(),
      ]);
      setQueue(q || []);
      setStats(s);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [tab, productFilter]); // eslint-disable-line

  // Step pipeline execution
  async function handleStepPipeline() {
    setStepping(true);
    try {
      const res = await api.stepAutopilotQueue();
      setMessage({
        type: 'success',
        text: `⚡ Autopilot pipeline stepped! Processed ${res.processedCalls || 0} calls, prepared ${res.processedProposals || 0} commercial proposals for human review.`,
      });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setStepping(false);
    }
  }

  // Advance Item with specific outcome
  async function handleAdvanceOutcome(id, outcome) {
    try {
      await api.advanceAutopilotQueue(id, { outcome });
      setMessage({
        type: 'success',
        text: `Lead advanced with outcome "${outcome.replace(/_/g, ' ')}"!`,
      });
      setAdvanceItem(null);
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  // Direct Transfer to Human Interference
  async function handleTransferHuman(id) {
    try {
      await api.transferAutopilotToHuman(id, {
        reason: 'Sales team requested manual high-touch phone consultation',
      });
      setMessage({
        type: 'success',
        text: 'Transferred to Human Interference queue. Sales specialist notified!',
      });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  // Retry Voice Call
  async function handleRetryCall(id) {
    try {
      await api.retryAutopilotCall(id);
      setMessage({ type: 'success', text: 'Voice AI call re-triggered via Sarvam!' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  // Manual Call Handler
  async function handleTriggerManualCall(e) {
    e.preventDefault();
    setCallingNow(true);
    try {
      const res = await api.triggerManualCall(callForm);
      setMessage({
        type: 'success',
        text: `Sarvam Voice Call queued successfully to ${callForm.phone}! Attempt ID: ${res.attempt_id}`,
      });
      setShowCallModal(false);
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setCallingNow(false);
    }
  }

  // Manual WhatsApp Handler
  async function handleTriggerManualWhatsApp(e) {
    e.preventDefault();
    setSendingWhatsApp(true);
    try {
      const res = await api.triggerManualWhatsApp(whatsAppForm);
      setMessage({
        type: 'success',
        text: `WhatsApp outreach prepared for ${whatsAppForm.phone}!`,
      });
      if (res.waLink) window.open(res.waLink, '_blank');
      setShowWhatsAppModal(false);
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSendingWhatsApp(false);
    }
  }

  function openEmailReview(item) {
    setReviewItem(item);
    setCustomSubject(item.email_subject || `Commercial Proposal: Practo ${item.product.toUpperCase()} Activation — ${item.clinic_name}`);
    setCustomBody(item.email_body || '');
  }

  async function handleApproveEmail() {
    if (!reviewItem) return;
    setApproving(true);
    try {
      await api.approveAutopilotEmail(reviewItem.id, {
        customSubject,
        customBody,
      });
      setMessage({ type: 'success', text: `Proposal email approved and dispatched for ${reviewItem.clinic_name}!` });
      setReviewItem(null);
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setApproving(false);
    }
  }

  const funnel = stats?.funnel || {};

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 24 }}>🚀</span>
            <h1 className="page-title">Autopilot AI Outreach & Pitching Operations</h1>
          </div>
          <p className="text-sm text-secondary mt-1">
            End-to-end autonomous sequence: Lead Scraper $\rightarrow$ CRM $\rightarrow$ Autopilot AI $\rightarrow$ Sarvam Call Pitch $\rightarrow$ RNR Retry $\rightarrow$ WhatsApp AI $\rightarrow$ Email Proposal $\rightarrow$ Human Interference.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleStepPipeline}
            disabled={stepping}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {stepping ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '⚡'}
            <span>Run / Step Pipeline</span>
          </button>
          <button className="btn btn-teal btn-sm" onClick={() => setShowWhatsAppModal(true)}>
            💬 Manual WhatsApp AI
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCallModal(true)}>
            📞 Manual Call AI (Sarvam)
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          {message.type === 'error' ? '❌' : '✅'} {message.text}
        </div>
      )}

      {/* ── Visual 7-Stage Automation Journey Banner ──────────────────────── */}
      <div className="card mb-6" style={{ background: '#FFFFFF', padding: '16px 20px' }}>
        <div className="text-xs font-bold text-secondary uppercase tracking-wide mb-3">
          ⚡ 7-Stage Autonomous Outreach & Deal Pipeline
        </div>
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1" style={{ fontSize: 12 }}>
          <div className="flex items-center gap-2" style={{ padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 16 }}>🔍</span>
            <div>
              <div style={{ fontWeight: 700, color: '#0F172A' }}>1. Scraper</div>
              <div className="text-xs text-muted">Discovery</div>
            </div>
          </div>
          <span style={{ color: '#94A3B8', fontWeight: 900 }}>→</span>

          <div className="flex items-center gap-2" style={{ padding: '8px 12px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 16 }}>👥</span>
            <div>
              <div style={{ fontWeight: 700, color: '#0F172A' }}>2. CRM Lead</div>
              <div className="text-xs text-muted">Contact Info</div>
            </div>
          </div>
          <span style={{ color: '#94A3B8', fontWeight: 900 }}>→</span>

          <div className="flex items-center gap-2" style={{ padding: '8px 12px', background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE' }}>
            <span style={{ fontSize: 16 }}>🚀</span>
            <div>
              <div style={{ fontWeight: 700, color: '#1456FD' }}>3. Auto Pilot</div>
              <div className="text-xs text-muted">Enqueued</div>
            </div>
          </div>
          <span style={{ color: '#94A3B8', fontWeight: 900 }}>→</span>

          <div className="flex items-center gap-2" style={{ padding: '8px 12px', background: '#F5F3FF', borderRadius: 8, border: '1px solid #DDD6FE' }}>
            <span style={{ fontSize: 16 }}>🎙️</span>
            <div>
              <div style={{ fontWeight: 700, color: '#7C3AED' }}>4. Call AI (Sarvam)</div>
              <div className="text-xs text-muted">Prime / Reach Pitch</div>
            </div>
          </div>
          <span style={{ color: '#94A3B8', fontWeight: 900 }}>→</span>

          <div className="flex items-center gap-2" style={{ padding: '8px 12px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0' }}>
            <span style={{ fontSize: 16 }}>💬</span>
            <div>
              <div style={{ fontWeight: 700, color: '#10B981' }}>5. WhatsApp AI</div>
              <div className="text-xs text-muted">Auto Follow-up (even RNR)</div>
            </div>
          </div>
          <span style={{ color: '#94A3B8', fontWeight: 900 }}>→</span>

          <div className="flex items-center gap-2" style={{ padding: '8px 12px', background: '#FEF3C7', borderRadius: 8, border: '1px solid #FDE68A' }}>
            <span style={{ fontSize: 16 }}>✉️</span>
            <div>
              <div style={{ fontWeight: 700, color: '#D97706' }}>6. Email Proposal</div>
              <div className="text-xs text-muted">AI Drafted</div>
            </div>
          </div>
          <span style={{ color: '#94A3B8', fontWeight: 900 }}>→</span>

          <div className="flex items-center gap-2" style={{ padding: '8px 12px', background: '#FDF2F8', borderRadius: 8, border: '1px solid #FBCFE8' }}>
            <span style={{ fontSize: 16 }}>🤝</span>
            <div>
              <div style={{ fontWeight: 700, color: '#DB2777' }}>7. Human Interference</div>
              <div className="text-xs text-muted">Review & Close</div>
            </div>
          </div>
        </div>
      </div>

      {/* Funnel Metrics */}
      <div className="grid-5 mb-6">
        <div className="stat-card" style={{ '--stat-color': '#1456FD' }}>
          <div className="text-xs text-muted uppercase font-bold">Enqueued</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1456FD' }}>{funnel.enqueued || 0}</div>
          <div className="text-xs text-secondary mt-1">Ready for Voice AI</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#7C3AED' }}>
          <div className="text-xs text-muted uppercase font-bold">Calling Active</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#7C3AED' }}>{funnel.calling || 0}</div>
          <div className="text-xs text-secondary mt-1">Sarvam Voice in progress</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#0D9488' }}>
          <div className="text-xs text-muted uppercase font-bold">WhatsApp Follow-up</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0D9488' }}>{funnel.whatsappSent || 0}</div>
          <div className="text-xs text-secondary mt-1">Sent post-call or RNR</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#F59E0B' }}>
          <div className="text-xs text-muted uppercase font-bold">Human Interference</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#F59E0B' }}>{funnel.humanInterferenceRequired || 0}</div>
          <div className="text-xs text-secondary mt-1">Doctor requested call / approval</div>
        </div>
        <div className="stat-card" style={{ '--stat-color': '#10B981' }}>
          <div className="text-xs text-muted uppercase font-bold">Deals Converted</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#10B981' }}>{funnel.converted || 0}</div>
          <div className="text-xs text-secondary mt-1">Proposals signed & closed</div>
        </div>
      </div>

      {/* Filters & Tabs */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="tab-group">
          {[
            ['all', 'All Leads'],
            ['calling', 'Calling (Voice AI)'],
            ['rnr', 'RNR (Scheduled Retries)'],
            ['whatsapp_sent', 'WhatsApp Sent'],
            ['human_interference_required', '⚠️ Human Interference Required'],
            ['converted', 'Converted'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`tab-btn ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <select
            className="input"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            style={{ width: 150, padding: '6px 12px', fontSize: 13 }}
          >
            <option value="">All Products</option>
            <option value="prime">Practo Prime</option>
            <option value="reach">Practo Reach</option>
          </select>

          <button className="btn btn-ghost btn-sm" onClick={loadData}>⟳ Refresh</button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
            <p className="text-sm text-secondary">Loading Autopilot queue & call records...</p>
          </div>
        ) : queue.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🚀</div>
            <h3 className="section-title">Autopilot Queue Is Empty</h3>
            <p className="text-sm text-muted mt-1">
              Select leads from the <strong>Lead Scraper</strong> or <strong>CRM Leads</strong> and click <strong>Push to Auto Pilot</strong>.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Clinic / Doctor</th>
                  <th>Location</th>
                  <th>Product</th>
                  <th>Stage Status</th>
                  <th>Voice AI Call</th>
                  <th>WhatsApp AI</th>
                  <th>Email Proposal</th>
                  <th>Actions & Transfer</th>
                </tr>
              </thead>
              <tbody>
                {queue.map((item) => {
                  const isPrime = item.product === 'prime';
                  const needsHuman = item.human_interference_required === 1 || item.current_stage === 'human_interference_required';
                  const isRnr = item.call_status === 'rnr' || item.current_stage === 'rnr_scheduled_retry';

                  return (
                    <tr key={item.id} style={needsHuman ? { background: '#FFFBEB' } : {}}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 13.5 }}>{item.clinic_name}</div>
                        <div className="text-xs text-secondary mt-1">
                          👤 {item.owner_name || 'Doctor'} · 📞 <strong>{item.phone}</strong>
                        </div>
                        {needsHuman && item.human_reason && (
                          <div className="text-xs mt-1" style={{ color: '#B45309', fontWeight: 600 }}>
                            ⚠️ {item.human_reason}
                          </div>
                        )}
                      </td>

                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{item.city}</div>
                        <div className="text-xs text-muted">{item.locality}</div>
                      </td>

                      <td>
                        <span className={`badge ${isPrime ? 'badge-blue' : 'badge-teal'}`}>
                          {isPrime ? '⚡ Prime' : '🎯 Reach'}
                        </span>
                      </td>

                      <td>
                        {needsHuman ? (
                          <span className="badge badge-yellow" style={{ fontSize: 11, fontWeight: 700 }}>
                            ⚠️ Human Interference
                          </span>
                        ) : isRnr ? (
                          <span className="badge badge-purple" style={{ fontSize: 11 }}>
                            🔁 RNR (Retry #{item.retry_count || 1})
                          </span>
                        ) : item.current_stage === 'converted' ? (
                          <span className="badge badge-green">✓ Converted</span>
                        ) : (
                          <span className="badge badge-blue">
                            {item.current_stage ? item.current_stage.replace(/_/g, ' ') : 'Queued'}
                          </span>
                        )}
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span className="text-xs font-semibold" style={{ color: item.call_status === 'completed' ? '#10B981' : isRnr ? '#D97706' : '#64748B' }}>
                            {item.call_disposition || (item.call_status ? `Call: ${item.call_status}` : 'Not Started')}
                          </span>
                          <div className="flex gap-2">
                            {isRnr && (
                              <button
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '2px 6px', fontSize: 10 }}
                                onClick={() => handleRetryCall(item.id)}
                              >
                                🔁 Retry Call
                              </button>
                            )}
                            {item.call_transcript && (
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ padding: '2px 6px', fontSize: 10 }}
                                onClick={() => setTranscriptItem(item)}
                              >
                                📜 Transcript
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          <span className="text-xs font-semibold" style={{ color: item.whatsapp_status === 'sent' || item.whatsapp_status === 'sent_link' ? '#10B981' : '#64748B' }}>
                            {item.whatsapp_status ? `✓ ${item.whatsapp_status}` : 'Pending Call'}
                          </span>
                          {item.whatsapp_text && (
                            <a
                              href={`https://wa.me/${String(item.phone).replace(/\D/g, '')}?text=${encodeURIComponent(item.whatsapp_text)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '2px 6px', fontSize: 10 }}
                            >
                              ↗ Open WhatsApp
                            </a>
                          )}
                        </div>
                      </td>

                      <td>
                        {needsHuman || item.email_status === 'pending_review' ? (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700 }}
                            onClick={() => openEmailReview(item)}
                          >
                            🛡️ Review & Approve
                          </button>
                        ) : item.email_status === 'sent' ? (
                          <span className="badge badge-green">✓ Sent</span>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>

                      <td>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() => setAdvanceItem(item)}
                            title="Step / Advance Lead"
                          >
                            ⚡ Advance
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() => handleTransferHuman(item.id)}
                            title="Transfer to Human Interference"
                          >
                            🤝 To Human
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: Advance / Simulate Outcome ──────────────────────────────── */}
      {advanceItem && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setAdvanceItem(null)}>
          <div className="modal fade-in" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <div>
                <h3 className="section-title">Advance Autopilot Stage</h3>
                <p className="text-xs text-secondary mt-0.5">
                  {advanceItem.clinic_name} ({advanceItem.phone})
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setAdvanceItem(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 0' }}>
              <button
                className="btn btn-secondary"
                style={{ textAlign: 'left', padding: '12px 16px', justifyContent: 'flex-start' }}
                onClick={() => handleAdvanceOutcome(advanceItem.id, 'answered_interested')}
              >
                <div>
                  <strong>✅ Answered & Interested</strong>
                  <div className="text-xs text-secondary">Pitch delivered successfully $\rightarrow$ triggers WhatsApp AI & drafts email proposal</div>
                </div>
              </button>

              <button
                className="btn btn-secondary"
                style={{ textAlign: 'left', padding: '12px 16px', justifyContent: 'flex-start' }}
                onClick={() => handleAdvanceOutcome(advanceItem.id, 'rnr')}
              >
                <div>
                  <strong>🔁 RNR (Ring No Response / Busy / Not Reachable)</strong>
                  <div className="text-xs text-secondary">Schedules retry in 15 mins $\rightarrow$ sends missed call WhatsApp note</div>
                </div>
              </button>

              <button
                className="btn btn-secondary"
                style={{ textAlign: 'left', padding: '12px 16px', justifyContent: 'flex-start', borderColor: '#FDE68A', background: '#FFFBEB' }}
                onClick={() => handleAdvanceOutcome(advanceItem.id, 'talk_to_human')}
              >
                <div>
                  <strong>🤝 Doctor Requested Call with Human</strong>
                  <div className="text-xs text-secondary">Transfers to human interference and alerts sales representative</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Review & Approve Proposal Email ─────────────────────────── */}
      {reviewItem && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setReviewItem(null)}>
          <div className="modal fade-in" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div>
                <h2 className="section-title">Review Proposal Email Before Sending</h2>
                <p className="text-xs text-secondary mt-0.5">
                  Human Interference Stage — Verify and approve commercial pitch for {reviewItem.clinic_name}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setReviewItem(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                  Email Subject
                </label>
                <input
                  className="input"
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                  Email Body (Customizable)
                </label>
                <textarea
                  className="input"
                  rows={10}
                  value={customBody}
                  onChange={(e) => setCustomBody(e.target.value)}
                  style={{ fontFamily: 'monospace', fontSize: 12, lineHeight: 1.5 }}
                />
              </div>

              <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setReviewItem(null)}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleApproveEmail}
                  disabled={approving}
                >
                  {approving ? 'Approving...' : `✓ Approve & Dispatch to ${reviewItem.email || reviewItem.phone}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Manual Call AI (Sarvam) ─────────────────────────────────── */}
      {showCallModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCallModal(false)}>
          <div className="modal fade-in" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 20 }}>🎙️</span>
                <h2 className="section-title">Manual Sarvam Voice AI Dialing</h2>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCallModal(false)}>✕</button>
            </div>

            <form onSubmit={handleTriggerManualCall}>
              <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Doctor Phone *
                  </label>
                  <input
                    className="input"
                    value={callForm.phone}
                    onChange={(e) => setCallForm({ ...callForm, phone: e.target.value })}
                    required
                    placeholder="+919812345678"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Doctor Name
                  </label>
                  <input
                    className="input"
                    value={callForm.doctorName}
                    onChange={(e) => setCallForm({ ...callForm, doctorName: e.target.value })}
                    placeholder="Dr. Rajesh Rao"
                  />
                </div>
              </div>

              <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Clinic Name *
                  </label>
                  <input
                    className="input"
                    value={callForm.clinicName}
                    onChange={(e) => setCallForm({ ...callForm, clinicName: e.target.value })}
                    required
                    placeholder="Care Clinic"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Product Pitch
                  </label>
                  <select
                    className="input"
                    value={callForm.product}
                    onChange={(e) => setCallForm({ ...callForm, product: e.target.value })}
                  >
                    <option value="prime">Practo Prime (Assured Appointments)</option>
                    <option value="reach">Practo Reach (Spotlight Position 1)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCallModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={callingNow}>
                  {callingNow ? 'Connecting...' : '📞 Place Call via Sarvam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Manual WhatsApp AI ─────────────────────────────────────── */}
      {showWhatsAppModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowWhatsAppModal(false)}>
          <div className="modal fade-in" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 20 }}>💬</span>
                <h2 className="section-title">Manual WhatsApp AI Outreach</h2>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowWhatsAppModal(false)}>✕</button>
            </div>

            <form onSubmit={handleTriggerManualWhatsApp}>
              <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Phone Number *
                  </label>
                  <input
                    className="input"
                    value={whatsAppForm.phone}
                    onChange={(e) => setWhatsAppForm({ ...whatsAppForm, phone: e.target.value })}
                    required
                    placeholder="+919812345678"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Doctor Name
                  </label>
                  <input
                    className="input"
                    value={whatsAppForm.doctorName}
                    onChange={(e) => setWhatsAppForm({ ...whatsAppForm, doctorName: e.target.value })}
                    placeholder="Dr. Rajesh Rao"
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                  Custom Message (Optional)
                </label>
                <textarea
                  className="input"
                  rows={4}
                  value={whatsAppForm.customMessage}
                  onChange={(e) => setWhatsAppForm({ ...whatsAppForm, customMessage: e.target.value })}
                  placeholder="Leave empty for auto-generated Prime or Reach pitch..."
                />
              </div>

              <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowWhatsAppModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-teal" disabled={sendingWhatsApp}>
                  {sendingWhatsApp ? 'Sending...' : '💬 Send WhatsApp Pitch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Transcript Viewer ──────────────────────────────────────── */}
      {transcriptItem && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setTranscriptItem(null)}>
          <div className="modal fade-in" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <div>
                <h3 className="section-title">Call Transcript — {transcriptItem.clinic_name}</h3>
                <p className="text-xs text-secondary mt-0.5">
                  Doctor: {transcriptItem.owner_name} · Phone: {transcriptItem.phone}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setTranscriptItem(null)}>✕</button>
            </div>

            <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 8, maxHeight: 350, overflowY: 'auto', fontSize: 13, lineHeight: 1.6 }}>
              {transcriptItem.call_transcript}
            </div>

            <div className="flex justify-end pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setTranscriptItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
