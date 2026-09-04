import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';

const DEFAULT_REACH_SLOTS = [
  { slotId: 'slot_blr_koramangala_gp_p1', position: '1', zone: 'Koramangala', city: 'Bangalore', speciality: 'General Physician', price3M: 18500, monthlySearchVolume: 12400 },
  { slotId: 'slot_blr_indiranagar_dentist_p1', position: '1', zone: 'Indiranagar', city: 'Bangalore', speciality: 'Dentist', price3M: 24000, monthlySearchVolume: 18500 },
  { slotId: 'slot_del_southdelhi_dermatology_p1', position: '1', zone: 'South Delhi', city: 'Delhi', speciality: 'Dermatologist', price3M: 28000, monthlySearchVolume: 22000 },
  { slotId: 'slot_mum_bandra_pediatrics_p1', position: '1', zone: 'Bandra West', city: 'Mumbai', speciality: 'Pediatrician', price3M: 21000, monthlySearchVolume: 14200 },
  { slotId: 'slot_hyd_hitec_cardiology_p1', position: '1', zone: 'HITEC City', city: 'Hyderabad', speciality: 'Cardiologist', price3M: 32000, monthlySearchVolume: 19800 },
  { slotId: 'slot_pun_kothrud_orthopedics_p1', position: '1', zone: 'Kothrud', city: 'Pune', speciality: 'Orthopedist', price3M: 16500, monthlySearchVolume: 9800 },
];

export default function AutopilotPage() {
  const [queue, setQueue] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all'); // 'all' | 'calling' | 'rnr' | 'proposal_generated' | 'whatsapp_sent' | 'human_interference_required' | 'converted'
  const [productFilter, setProductFilter] = useState(''); // '' | 'prime' | 'reach'
  const [stepping, setStepping] = useState(false);

  // Full End-to-End Autonomous Execution State
  const [runningFullAuto, setRunningFullAuto] = useState(false);
  const [fullAutoReport, setFullAutoReport] = useState(null);
  const [autoEnqueueing, setAutoEnqueueing] = useState(false);
  const [autoMode, setAutoMode] = useState('full_auto'); // 'full_auto' | 'human_review'

  // Reach Inventory & Product Selection State for Autopilot
  const [availableReachSlots, setAvailableReachSlots] = useState(DEFAULT_REACH_SLOTS);
  const [showRunFullAutoModal, setShowRunFullAutoModal] = useState(false);
  const [runAutoForm, setRunAutoForm] = useState({
    product: 'reach', // 'reach' | 'prime' | 'all'
    reachSlotId: DEFAULT_REACH_SLOTS[0].slotId,
    count: 15,
    mode: 'full_auto',
  });

  const [showAutoEnqueueModal, setShowAutoEnqueueModal] = useState(false);
  const [autoEnqueueForm, setAutoEnqueueForm] = useState({
    limit: 20,
    product: 'reach',
    reachSlotId: DEFAULT_REACH_SLOTS[0].slotId,
    autoStart: true,
  });

  // Manual Call Modal State
  const [showCallModal, setShowCallModal] = useState(false);
  const [callForm, setCallForm] = useState({
    phone: '',
    doctorName: '',
    clinicName: '',
    locality: 'Indiranagar',
    city: 'Bangalore',
    speciality: 'General Physician',
    product: 'reach',
    reachSlotId: '',
  });
  const [callingNow, setCallingNow] = useState(false);

  // Manual WhatsApp Modal State
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppForm, setWhatsAppForm] = useState({
    phone: '',
    doctorName: '',
    clinicName: '',
    product: 'reach',
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

  // Load available Reach inventory slots on mount
  useEffect(() => {
    api.getAvailableReachSlots({ limit: 60 })
      .then((res) => {
        const slots = res?.slots || res || [];
        setAvailableReachSlots(slots);
        if (slots.length > 0) {
          setRunAutoForm((prev) => ({ ...prev, reachSlotId: prev.reachSlotId || slots[0].slotId }));
          setAutoEnqueueForm((prev) => ({ ...prev, reachSlotId: prev.reachSlotId || slots[0].slotId }));
          setCallForm((prev) => ({ ...prev, reachSlotId: prev.reachSlotId || slots[0].slotId }));
        }
      })
      .catch((err) => console.warn('[ReachSlots load error]', err.message));
  }, []);

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

  const selectedRunReachSlot = availableReachSlots.find((s) => s.slotId === runAutoForm.reachSlotId) || availableReachSlots[0] || null;
  const selectedEnqueueReachSlot = availableReachSlots.find((s) => s.slotId === autoEnqueueForm.reachSlotId) || availableReachSlots[0] || null;
  const selectedCallReachSlot = availableReachSlots.find((s) => s.slotId === callForm.reachSlotId) || availableReachSlots[0] || null;

  // ⚡ 100% Full Autonomous Mode Execution Submit
  async function handleRunFullAutopilotSubmit(e) {
    if (e) e.preventDefault();
    setRunningFullAuto(true);
    setFullAutoReport(null);
    setMessage(null);
    setShowRunFullAutoModal(false);
    try {
      const payload = {
        count: Number(runAutoForm.count) || 15,
        mode: runAutoForm.mode || autoMode,
        product: runAutoForm.product,
      };
      if (runAutoForm.product === 'reach') {
        payload.reachSlotId = runAutoForm.reachSlotId || selectedRunReachSlot?.slotId;
        payload.reachSlotDetails = selectedRunReachSlot;
      }

      const res = await api.runFullAutopilot(payload);
      if (res && res.report) {
        setFullAutoReport(res.report);
        setMessage({
          type: 'success',
          text: `⚡ Full Autopilot Complete: Placed ${res.report.callsPlaced} Proprietary Voice AI calls, generated ${res.report.proposalsCreated} commercial proposals, and dispatched WhatsApp outreach!`,
        });
      }
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: 'Full Autopilot error: ' + err.message });
    } finally {
      setRunningFullAuto(false);
    }
  }

  // 📥 Auto-Enqueue Scraped Clinics Directly into Autopilot Submit
  async function handleAutoEnqueueScrapedSubmit(e) {
    if (e) e.preventDefault();
    setAutoEnqueueing(true);
    setMessage(null);
    setShowAutoEnqueueModal(false);
    try {
      const payload = {
        limit: Number(autoEnqueueForm.limit) || 20,
        autoStart: autoEnqueueForm.autoStart,
        product: autoEnqueueForm.product === 'all' ? undefined : autoEnqueueForm.product,
      };
      if (autoEnqueueForm.product === 'reach') {
        payload.reachSlotId = autoEnqueueForm.reachSlotId || selectedEnqueueReachSlot?.slotId;
        payload.reachSlotDetails = selectedEnqueueReachSlot;
      }

      const res = await api.autoEnqueueScrapedToAutopilot(payload);
      setMessage({
        type: 'success',
        text: `📥 Auto-Enqueued ${res.enqueuedCount || 0} scraped healthcare practices into Autopilot! Outbound AI voice pitching initiated.`,
      });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: 'Auto-enqueue failed: ' + err.message });
    } finally {
      setAutoEnqueueing(false);
    }
  }

  // Step pipeline execution
  async function handleStepPipeline() {
    setStepping(true);
    try {
      const res = await api.stepAutopilotQueue();
      setMessage({
        type: 'success',
        text: `⚡ Autopilot pipeline stepped! Processed ${res.processedCalls || 0} calls, prepared ${res.processedProposals || 0} commercial proposals for review.`,
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
      setMessage({ type: 'success', text: 'Voice AI call re-triggered via Proprietary Voice Agent!' });
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
      const payload = {
        ...callForm,
        voiceEngine: 'native',
        telephonyProvider: 'simulator',
      };
      if (callForm.product === 'reach') {
        payload.reachSlotId = callForm.reachSlotId || selectedCallReachSlot?.slotId;
        payload.reachSlotDetails = selectedCallReachSlot;
      }
      const res = await api.dialVoiceAgent(payload);
      setMessage({
        type: 'success',
        text: `Voice Call placed successfully to ${callForm.phone}! Call ID: ${res.call?.callId || res.call_id || 'COMPLETED'}`,
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
      {/* ── Page Header ────────────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 26 }}>🚀</span>
            <div>
              <h1 className="page-title">Autopilot AI Outreach & Deal Operations</h1>
              <p className="text-sm text-secondary mt-1">
                100% Autonomous Pipeline: Scraped Discovery $\rightarrow$ CRM $\rightarrow$ Proprietary Voice AI Call $\rightarrow$ AI STT Diarization $\rightarrow$ Dual Sentiment Analysis $\rightarrow$ Auto Proposal Creation $\rightarrow$ WhatsApp Dispatch $\rightarrow$ Conversion.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Master Full Automation Action */}
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowRunFullAutoModal(true)}
            disabled={runningFullAuto}
            style={{
              background: 'linear-gradient(135deg, #1456FD 0%, #0D9488 100%)',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 4px 12px rgba(20, 86, 253, 0.25)',
            }}
          >
            {runningFullAuto ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '⚡'}
            <span>Run 100% Full Autopilot</span>
          </button>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowAutoEnqueueModal(true)}
            disabled={autoEnqueueing}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {autoEnqueueing ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '📥'}
            <span>Auto-Enqueue Scraped Leads</span>
          </button>

          <button
            className="btn btn-ghost btn-sm"
            onClick={handleStepPipeline}
            disabled={stepping}
            title="Step active pipeline items"
          >
            {stepping ? <span className="spinner" style={{ width: 12, height: 12 }} /> : '▶ Step 1-Cycle'}
          </button>

          <button className="btn btn-teal btn-sm" onClick={() => setShowWhatsAppModal(true)}>
            💬 Manual WhatsApp
          </button>

          <button className="btn btn-secondary btn-sm" onClick={() => setShowCallModal(true)}>
            📞 Manual AI Call
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'} mb-4`}>
          {message.type === 'error' ? '❌' : '✅'} {message.text}
        </div>
      )}

      {/* ── 8-Stage Autonomous Journey Banner ─────────────────────────────────── */}
      <div className="card mb-6" style={{ background: '#FFFFFF', padding: '16px 20px', border: '1px solid #E2E8F0' }}>
        <div className="flex justify-between items-center mb-3">
          <div className="text-xs font-bold text-secondary uppercase tracking-wide">
            ⚡ 8-Stage End-to-End Autonomous Outreach & Deal Pipeline
          </div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 11, color: '#64748B' }}>Automation Mode:</span>
            <span className="badge badge-green" style={{ fontSize: 10, fontWeight: 700 }}>
              100% Full Auto (Zero-Touch)
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1" style={{ fontSize: 11.5 }}>
          <div className="flex items-center gap-2" style={{ padding: '6px 10px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 15 }}>🔍</span>
            <div>
              <div style={{ fontWeight: 700, color: '#0F172A' }}>1. Scraper</div>
              <div className="text-xs text-muted" style={{ fontSize: 10 }}>Auto Discovery</div>
            </div>
          </div>
          <span style={{ color: '#94A3B8', fontWeight: 900 }}>→</span>

          <div className="flex items-center gap-2" style={{ padding: '6px 10px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E2E8F0' }}>
            <span style={{ fontSize: 15 }}>👥</span>
            <div>
              <div style={{ fontWeight: 700, color: '#0F172A' }}>2. CRM Lead</div>
              <div className="text-xs text-muted" style={{ fontSize: 10 }}>Enqueued</div>
            </div>
          </div>
          <span style={{ color: '#94A3B8', fontWeight: 900 }}>→</span>

          <div className="flex items-center gap-2" style={{ padding: '6px 10px', background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE' }}>
            <span style={{ fontSize: 15 }}>🎙️</span>
            <div>
              <div style={{ fontWeight: 700, color: '#1456FD' }}>3. Voice AI Call</div>
              <div className="text-xs text-muted" style={{ fontSize: 10 }}>Proprietary Engine</div>
            </div>
          </div>
          <span style={{ color: '#94A3B8', fontWeight: 900 }}>→</span>

          <div className="flex items-center gap-2" style={{ padding: '6px 10px', background: '#F5F3FF', borderRadius: 8, border: '1px solid #DDD6FE' }}>
            <span style={{ fontSize: 15 }}>🎧</span>
            <div>
              <div style={{ fontWeight: 700, color: '#7C3AED' }}>4. STT Diarization</div>
              <div className="text-xs text-muted" style={{ fontSize: 10 }}>Dual-Channel</div>
            </div>
          </div>
          <span style={{ color: '#94A3B8', fontWeight: 900 }}>→</span>

          <div className="flex items-center gap-2" style={{ padding: '6px 10px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0' }}>
            <span style={{ fontSize: 15 }}>🧠</span>
            <div>
              <div style={{ fontWeight: 700, color: '#10B981' }}>5. Sentiment AI</div>
              <div className="text-xs text-muted" style={{ fontSize: 10 }}>Interest & Objections</div>
            </div>
          </div>
          <span style={{ color: '#94A3B8', fontWeight: 900 }}>→</span>

          <div className="flex items-center gap-2" style={{ padding: '6px 10px', background: '#FEF3C7', borderRadius: 8, border: '1px solid #FDE68A' }}>
            <span style={{ fontSize: 15 }}>📑</span>
            <div>
              <div style={{ fontWeight: 700, color: '#D97706' }}>6. Auto Proposal</div>
              <div className="text-xs text-muted" style={{ fontSize: 10 }}>Prime / Reach Net ₹</div>
            </div>
          </div>
          <span style={{ color: '#94A3B8', fontWeight: 900 }}>→</span>

          <div className="flex items-center gap-2" style={{ padding: '6px 10px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0' }}>
            <span style={{ fontSize: 15 }}>💬</span>
            <div>
              <div style={{ fontWeight: 700, color: '#0D9488' }}>7. WhatsApp AI</div>
              <div className="text-xs text-muted" style={{ fontSize: 10 }}>Personalized Quote</div>
            </div>
          </div>
          <span style={{ color: '#94A3B8', fontWeight: 900 }}>→</span>

          <div className="flex items-center gap-2" style={{ padding: '6px 10px', background: '#FDF2F8', borderRadius: 8, border: '1px solid #FBCFE8' }}>
            <span style={{ fontSize: 15 }}>🏆</span>
            <div>
              <div style={{ fontWeight: 700, color: '#DB2777' }}>8. Conversion</div>
              <div className="text-xs text-muted" style={{ fontSize: 10 }}>Closed-Won CRM</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Funnel KPI Cards Row ──────────────────────────────────────────────── */}
      <div className="grid-5 mb-6">
        <div className="stat-card" style={{ '--stat-color': '#1456FD' }}>
          <div className="text-xs text-muted uppercase font-bold">Total Enqueued</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1456FD' }}>{funnel.enqueued || 0}</div>
          <div className="text-xs text-secondary mt-1">Ready for Autonomous AI</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#7C3AED' }}>
          <div className="text-xs text-muted uppercase font-bold">Calls Completed</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#7C3AED' }}>{funnel.callCompleted || 0}</div>
          <div className="text-xs text-secondary mt-1">Diarized & Pitch Delivered</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#F59E0B' }}>
          <div className="text-xs text-muted uppercase font-bold">Auto Proposals Created</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#D97706' }}>
            {funnel.proposalsGenerated || 0}
          </div>
          <div className="text-xs text-secondary mt-1">
            Pipeline: <strong>₹{(stats?.pipelineRevenue || 0).toLocaleString('en-IN')}</strong>
          </div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#0D9488' }}>
          <div className="text-xs text-muted uppercase font-bold">WhatsApp Dispatched</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0D9488' }}>{funnel.whatsappSent || 0}</div>
          <div className="text-xs text-secondary mt-1">Quotes & objection rebuttals</div>
        </div>

        <div className="stat-card" style={{ '--stat-color': '#10B981' }}>
          <div className="text-xs text-muted uppercase font-bold">Deals Converted</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#10B981' }}>{funnel.converted || 0}</div>
          <div className="text-xs text-secondary mt-1">Closed-Won ({stats?.conversionRate || '0.0'}%)</div>
        </div>
      </div>

      {/* ── Filters & Tabs ────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="tab-group">
          {[
            ['all', 'All Leads'],
            ['calling', 'Calling (Voice AI)'],
            ['rnr', 'RNR (Retries)'],
            ['proposal_generated', '📑 Proposals Created'],
            ['whatsapp_sent', 'WhatsApp Dispatched'],
            ['human_interference_required', '⚠️ Human Review'],
            ['converted', '🏆 Closed Won'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`tab ${tab === key ? 'active' : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          <select
            className="input"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            style={{ width: 140, padding: '5px 10px', fontSize: 12 }}
          >
            <option value="">All Products</option>
            <option value="prime">Practo Prime</option>
            <option value="reach">Practo Reach</option>
          </select>

          <button className="btn btn-ghost btn-sm" onClick={loadData}>⟳ Refresh</button>
        </div>
      </div>

      {/* ── Queue Table ────────────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
            <p className="text-sm text-secondary">Loading Autopilot queue & autonomous deal intelligence...</p>
          </div>
        ) : queue.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🚀</div>
            <h3 className="section-title">Autopilot Queue Is Empty</h3>
            <p className="text-sm text-muted mt-1" style={{ maxWidth: 450, margin: '6px auto 16px' }}>
              Click <strong>Auto-Enqueue Scraped Leads</strong> to automatically import clinics from Google Maps/Practo, or click <strong>Run 100% Full Autopilot</strong> to begin outreach.
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAutoEnqueueModal(true)}>
              📥 Auto-Enqueue Scraped Clinics Now
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Clinic / Doctor</th>
                  <th>Location</th>
                  <th>Product & Reach Slot</th>
                  <th>Stage Status</th>
                  <th>Doctor Sentiment & Intent</th>
                  <th>Auto Proposal</th>
                  <th>WhatsApp Outreach</th>
                  <th>Actions</th>
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
                        <div className="text-xs text-secondary mt-0.5">
                          👤 {item.owner_name || 'Doctor'} · 📞 <strong>{item.phone}</strong>
                        </div>
                        {needsHuman && item.human_reason && (
                          <div className="text-xs mt-1" style={{ color: '#B45309', fontWeight: 600 }}>
                            ⚠️ {item.human_reason}
                          </div>
                        )}
                      </td>

                      <td>
                        <div style={{ fontWeight: 500, fontSize: 12.5 }}>{item.city || 'Bangalore'}</div>
                        <div className="text-xs text-muted">{item.locality || 'Indiranagar'}</div>
                      </td>

                      <td>
                        <span className={`badge ${isPrime ? 'badge-blue' : 'badge-teal'}`} style={{ fontSize: 10 }}>
                          {isPrime ? '⚡ Prime' : '🎯 Reach'}
                        </span>
                        {!isPrime && item.reach_slot_position && (
                          <div className="mt-1" style={{ fontSize: 11, fontWeight: 700, color: '#0D9488' }}>
                            ⚡ Pos #{item.reach_slot_position} Spotlight
                          </div>
                        )}
                        {!isPrime && item.reach_monthly_searches > 0 && (
                          <div className="text-xs text-muted" style={{ fontSize: 10 }}>
                            📈 {item.reach_monthly_searches.toLocaleString()} searches/mo
                          </div>
                        )}
                        {!isPrime && item.reach_slot_price > 0 && (
                          <div className="text-xs font-bold" style={{ fontSize: 10.5, color: '#047857' }}>
                            ₹{item.reach_slot_price.toLocaleString('en-IN')} / 3M
                          </div>
                        )}
                      </td>

                      <td>
                        {needsHuman ? (
                          <span className="badge badge-yellow" style={{ fontSize: 10, fontWeight: 700 }}>
                            ⚠️ Human Review
                          </span>
                        ) : isRnr ? (
                          <span className="badge badge-purple" style={{ fontSize: 10 }}>
                            🔁 RNR (Retry #{item.retry_count || 1})
                          </span>
                        ) : item.current_stage === 'converted' ? (
                          <span className="badge badge-green" style={{ fontSize: 10, fontWeight: 700 }}>
                            ✓ Closed Won
                          </span>
                        ) : item.current_stage === 'proposal_generated' ? (
                          <span className="badge badge-teal" style={{ fontSize: 10 }}>
                            📑 Proposal Ready
                          </span>
                        ) : (
                          <span className="badge badge-blue" style={{ fontSize: 10 }}>
                            {item.current_stage ? item.current_stage.replace(/_/g, ' ') : 'Queued'}
                          </span>
                        )}
                        <div className="text-xs text-muted mt-1" style={{ fontSize: 10 }}>
                          {item.call_disposition || item.call_status}
                        </div>
                      </td>

                      {/* Doctor Sentiment & Intent */}
                      <td>
                        {item.doctor_sentiment ? (
                          <div>
                            <span
                              className={`badge ${
                                item.doctor_sentiment.toLowerCase().includes('positive')
                                  ? 'badge-green'
                                  : item.doctor_sentiment.toLowerCase().includes('skeptical')
                                  ? 'badge-yellow'
                                  : 'badge-blue'
                              }`}
                              style={{ fontSize: 10 }}
                            >
                              {item.doctor_sentiment}
                            </span>
                            <div className="text-xs text-secondary mt-0.5" style={{ fontSize: 10 }}>
                              Score: <strong>{item.interest_score || 80}/100</strong> · Intent: <strong>{item.doctor_intent || 'Proposal'}</strong>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted">Awaiting Call</span>
                        )}
                      </td>

                      {/* Auto Commercial Proposal */}
                      <td>
                        {item.proposal_id ? (
                          <div>
                            <span className="badge badge-purple" style={{ fontSize: 10, fontWeight: 700 }}>
                              📑 {item.proposal_id}
                            </span>
                            <div className="text-xs text-secondary font-bold mt-0.5" style={{ fontSize: 10.5 }}>
                              ₹{(Number(item.proposal_amount) || item.reach_slot_price || 21240).toLocaleString('en-IN')}
                            </div>
                            {item.reach_slot_position && (
                              <div className="text-xs" style={{ fontSize: 9.5, color: '#0D9488', fontWeight: 600 }}>
                                Pos #{item.reach_slot_position} Spotlight
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </td>

                      {/* WhatsApp Outreach */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <span
                            className="text-xs font-semibold"
                            style={{
                              fontSize: 11,
                              color: item.whatsapp_status === 'sent' || item.whatsapp_status === 'sent_link' ? '#10B981' : '#64748B',
                            }}
                          >
                            {item.whatsapp_status ? `✓ ${item.whatsapp_status}` : 'Pending'}
                          </span>
                          {item.whatsapp_text && (
                            <a
                              href={`https://wa.me/${String(item.phone).replace(/\D/g, '')}?text=${encodeURIComponent(item.whatsapp_text)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue"
                              style={{ fontSize: 10 }}
                            >
                              ↗ View WhatsApp
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="flex gap-1.5 flex-wrap">
                          {item.call_transcript && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ padding: '2px 6px', fontSize: 10 }}
                              onClick={() => setTranscriptItem(item)}
                              title="View Diarized Call Transcript"
                            >
                              📜 Transcript
                            </button>
                          )}
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 6px', fontSize: 10 }}
                            onClick={() => setAdvanceItem(item)}
                            title="Advance Stage"
                          >
                            ⚡ Advance
                          </button>
                          {needsHuman && (
                            <button
                              className="btn btn-primary btn-sm"
                              style={{ padding: '2px 6px', fontSize: 10 }}
                              onClick={() => openEmailReview(item)}
                            >
                              🛡️ Review
                            </button>
                          )}
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

      {/* ── Modal: Full Autopilot Execution Report ────────────────────────────── */}
      {fullAutoReport && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setFullAutoReport(null)}>
          <div className="modal fade-in" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 24 }}>⚡</span>
                <div>
                  <h3 className="section-title">Full Autonomous Pipeline Execution Report</h3>
                  <p className="text-xs text-secondary mt-0.5">
                    Completed zero-touch lifecycle execution across {fullAutoReport.totalInitiated} healthcare leads.
                  </p>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setFullAutoReport(null)}>✕</button>
            </div>

            {/* Metrics Grid */}
            <div className="grid-4 mb-4" style={{ gap: 10 }}>
              <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div className="text-xs text-muted uppercase font-bold">Calls Placed</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#1456FD' }}>{fullAutoReport.callsPlaced}</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div className="text-xs text-muted uppercase font-bold">Proposals Made</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#7C3AED' }}>{fullAutoReport.proposalsCreated}</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: 12, borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div className="text-xs text-muted uppercase font-bold">WhatsApp Sent</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#0D9488' }}>{fullAutoReport.whatsAppDispatched}</div>
              </div>
              <div style={{ background: '#F0FDF4', padding: 12, borderRadius: 8, border: '1px solid #BBF7D0' }}>
                <div className="text-xs text-green uppercase font-bold">Closed Won</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#10B981' }}>{fullAutoReport.convertedCount}</div>
              </div>
            </div>

            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: 12, borderRadius: 8, marginBottom: 14 }}>
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-blue">Total Commercial Pipeline Value Generated:</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: '#1D4ED8' }}>
                  ₹{(fullAutoReport.totalPipelineValue || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Processed Leads List */}
            <div style={{ maxHeight: 250, overflowY: 'auto', marginBottom: 14 }}>
              <div className="text-xs font-bold text-secondary uppercase mb-2">Automated Execution Logs:</div>
              {(fullAutoReport.processedItems || []).map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    marginBottom: 6,
                    fontSize: 12,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong>{item.clinicName}</strong> ({item.doctorName})
                    <span className="text-muted ml-2">· {item.product.toUpperCase()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge badge-green" style={{ fontSize: 10 }}>{item.stage}</span>
                    {item.proposalId && (
                      <span className="text-xs text-purple font-bold">{item.proposalId}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setFullAutoReport(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Transcript Viewer ─────────────────────────────────────────── */}
      {transcriptItem && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setTranscriptItem(null)}>
          <div className="modal fade-in" style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <div>
                <h3 className="section-title">Diarized Call Transcript — {transcriptItem.clinic_name}</h3>
                <p className="text-xs text-secondary mt-0.5">
                  Dr. {transcriptItem.owner_name} · Sentiment: {transcriptItem.doctor_sentiment || 'Positive'}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setTranscriptItem(null)}>✕</button>
            </div>

            <div style={{ maxHeight: 360, overflowY: 'auto', padding: '10px 0', whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6, color: '#334155' }}>
              {transcriptItem.call_transcript}
            </div>

            <div className="flex justify-end pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setTranscriptItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Advance Outcome ───────────────────────────────────────────── */}
      {advanceItem && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setAdvanceItem(null)}>
          <div className="modal fade-in" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div>
                <h3 className="section-title">Advance Pipeline — {advanceItem.clinic_name}</h3>
                <p className="text-xs text-secondary mt-0.5">Select simulated or actual call outcome to advance lead stage</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setAdvanceItem(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0' }}>
              <button
                className="btn btn-primary"
                style={{ justifyContent: 'flex-start', padding: 12 }}
                onClick={() => handleAdvanceOutcome(advanceItem.id, 'answered_interested')}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>🟢 Answered & Interested</div>
                  <div className="text-xs opacity-90">Doctor agreed to pitch. Auto-generate commercial proposal and WhatsApp deck.</div>
                </div>
              </button>

              <button
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', padding: 12 }}
                onClick={() => handleAdvanceOutcome(advanceItem.id, 'rnr')}
              >
                <div>
                  <div style={{ fontWeight: 700 }}>🔁 RNR / Busy (Ring No Response)</div>
                  <div className="text-xs text-secondary">Schedule auto retry in 15 mins and send polite consultation WhatsApp follow-up.</div>
                </div>
              </button>

              <button
                className="btn btn-ghost"
                style={{ justifyContent: 'flex-start', padding: 12, border: '1px solid #E2E8F0' }}
                onClick={() => handleAdvanceOutcome(advanceItem.id, 'talk_to_human')}
              >
                <div>
                  <div style={{ fontWeight: 700, color: '#B45309' }}>⚠️ Doctor Requests Human Representative</div>
                  <div className="text-xs text-secondary">Flag for sales manager high-touch consultation.</div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Email Review & Approval ───────────────────────────────────── */}
      {reviewItem && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setReviewItem(null)}>
          <div className="modal fade-in" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <div>
                <h3 className="section-title">Commercial Proposal Review</h3>
                <p className="text-xs text-secondary mt-0.5">Approve and dispatch commercial agreement for {reviewItem.clinic_name}</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setReviewItem(null)}>✕</button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block' }}>Email Subject</label>
              <input
                className="input"
                value={customSubject}
                onChange={(e) => setCustomSubject(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block' }}>Proposal Body</label>
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
                className="btn btn-primary btn-sm"
                onClick={handleApproveEmail}
                disabled={approving}
              >
                {approving ? 'Dispatching...' : '✅ Approve & Convert Lead'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Full Autopilot Configuration (Product & Reach Slot Picker) ─── */}
      {showRunFullAutoModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowRunFullAutoModal(false)}>
          <div className="modal fade-in" style={{ maxWidth: 660 }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 24 }}>⚡</span>
                <div>
                  <h3 className="section-title">Launch 100% Full Autonomous AI Autopilot</h3>
                  <p className="text-xs text-secondary mt-0.5">
                    Select campaign product & Reach inventory slot to empower Voice AI to pitch precise locality pricing and slot details.
                  </p>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowRunFullAutoModal(false)}>✕</button>
            </div>

            <form onSubmit={handleRunFullAutopilotSubmit}>
              {/* Product Selection Radio Cards */}
              <div style={{ marginBottom: 16 }}>
                <label className="text-xs font-bold text-secondary mb-2" style={{ display: 'block', textTransform: 'uppercase' }}>
                  1. Select Pitch Campaign Product
                </label>
                <div className="grid-3" style={{ gap: 10 }}>
                  <label
                    style={{
                      border: `2px solid ${runAutoForm.product === 'reach' ? '#0D9488' : '#E2E8F0'}`,
                      background: runAutoForm.product === 'reach' ? '#F0FDFA' : '#FFFFFF',
                      padding: 12,
                      borderRadius: 10,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="runAutoProduct"
                      checked={runAutoForm.product === 'reach'}
                      onChange={() => setRunAutoForm({ ...runAutoForm, product: 'reach' })}
                      style={{ marginRight: 6 }}
                    />
                    <strong style={{ color: '#0F766E' }}>🎯 Practo Reach</strong>
                    <p className="text-xs text-secondary mt-1">Exclusive spotlight sponsored slot (#1 or #6) with locality exclusivity.</p>
                  </label>

                  <label
                    style={{
                      border: `2px solid ${runAutoForm.product === 'prime' ? '#1456FD' : '#E2E8F0'}`,
                      background: runAutoForm.product === 'prime' ? '#EFF6FF' : '#FFFFFF',
                      padding: 12,
                      borderRadius: 10,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="runAutoProduct"
                      checked={runAutoForm.product === 'prime'}
                      onChange={() => setRunAutoForm({ ...runAutoForm, product: 'prime' })}
                      style={{ marginRight: 6 }}
                    />
                    <strong style={{ color: '#1D4ED8' }}>🌟 Practo Prime</strong>
                    <p className="text-xs text-secondary mt-1">Instant 24/7 appointment booking guarantee & Prime verified badge.</p>
                  </label>

                  <label
                    style={{
                      border: `2px solid ${runAutoForm.product === 'all' ? '#7C3AED' : '#E2E8F0'}`,
                      background: runAutoForm.product === 'all' ? '#F5F3FF' : '#FFFFFF',
                      padding: 12,
                      borderRadius: 10,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="runAutoProduct"
                      checked={runAutoForm.product === 'all'}
                      onChange={() => setRunAutoForm({ ...runAutoForm, product: 'all' })}
                      style={{ marginRight: 6 }}
                    />
                    <strong style={{ color: '#6D28D9' }}>⚡ Smart Auto-Detect</strong>
                    <p className="text-xs text-secondary mt-1">AI auto-assigns Reach or Prime based on clinic traffic and profile.</p>
                  </label>
                </div>
              </div>

              {/* Reach Inventory Slot Selector (when product is reach) */}
              {runAutoForm.product === 'reach' && (
                <div style={{ marginBottom: 16 }}>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-secondary uppercase">
                      2. Select Practo Reach Inventory Slot
                    </label>
                    <span className="text-xs" style={{ color: '#0D9488', fontWeight: 600 }}>
                      🔥 {availableReachSlots.length} Newly Opened Slots Live
                    </span>
                  </div>

                  <select
                    className="input"
                    value={runAutoForm.reachSlotId}
                    onChange={(e) => setRunAutoForm({ ...runAutoForm, reachSlotId: e.target.value })}
                    style={{ fontWeight: 600, fontSize: 13 }}
                  >
                    {availableReachSlots.map((slot) => (
                      <option key={slot.slotId} value={slot.slotId}>
                        [Position #{slot.position}] {slot.zone}, {slot.city} — {slot.speciality} | {slot.monthlySearchVolume?.toLocaleString()} searches/mo | ₹{slot.price3M?.toLocaleString('en-IN')}/3M
                      </option>
                    ))}
                  </select>

                  {/* AI Live Pitch & Pricing Terms Preview Card */}
                  {selectedRunReachSlot && (
                    <div
                      className="mt-3"
                      style={{
                        background: 'linear-gradient(135deg, #F0FDFA 0%, #EFF6FF 100%)',
                        border: '1px solid #99F6E4',
                        borderRadius: 10,
                        padding: 14,
                      }}
                    >
                      <div className="flex justify-between items-center pb-2 mb-2" style={{ borderBottom: '1px solid #CCFBF1' }}>
                        <div>
                          <span className="badge badge-teal" style={{ fontWeight: 800, fontSize: 11 }}>
                            ⚡ Position #{selectedRunReachSlot.position} Exclusive Spotlight
                          </span>
                          <span className="ml-2 font-bold" style={{ fontSize: 13, color: '#0F172A' }}>
                            {selectedRunReachSlot.zone}, {selectedRunReachSlot.city}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 14, fontWeight: 900, color: '#0F766E' }}>
                            ₹{selectedRunReachSlot.price3M?.toLocaleString('en-IN')}
                            <span style={{ fontSize: 11, fontWeight: 500, color: '#64748B' }}> / 3 Months</span>
                          </div>
                          <div className="text-xs text-muted">
                            (~₹{Math.round((selectedRunReachSlot.price3M || 18000) / 3).toLocaleString('en-IN')}/mo)
                          </div>
                        </div>
                      </div>

                      <div className="grid-2 mb-2" style={{ gap: 8, fontSize: 12 }}>
                        <div>
                          🩺 <strong>Speciality:</strong> {selectedRunReachSlot.speciality}
                        </div>
                        <div>
                          📈 <strong>Patient Traffic:</strong> {selectedRunReachSlot.monthlySearchVolume?.toLocaleString()} searches/mo
                        </div>
                      </div>

                      <div style={{ background: '#FFFFFF', borderRadius: 8, padding: 10, border: '1px solid #E2E8F0', marginTop: 8 }}>
                        <div className="text-xs font-bold text-secondary uppercase mb-1 flex items-center gap-1">
                          <span>🎙️</span> AI Voice Pitch Script Delivered to Doctor:
                        </div>
                        <p className="text-xs" style={{ color: '#334155', fontStyle: 'italic', lineHeight: 1.5, margin: 0 }}>
                          "Dr. [Name], Practo has just opened an exclusive Position #{selectedRunReachSlot.position} Reach spotlight sponsorship in {selectedRunReachSlot.zone} for {selectedRunReachSlot.speciality}. With {selectedRunReachSlot.monthlySearchVolume?.toLocaleString()} high-intent patients searching in your locality monthly, this guarantees top-of-page exclusivity. Pricing is ₹{selectedRunReachSlot.price3M?.toLocaleString('en-IN')} for 3 months with 100% exclusivity before competitors take it."
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Batch Lead Count & Mode */}
              <div className="grid-2 mb-4" style={{ gap: 12 }}>
                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Leads to Process in Batch
                  </label>
                  <select
                    className="input"
                    value={runAutoForm.count}
                    onChange={(e) => setRunAutoForm({ ...runAutoForm, count: Number(e.target.value) })}
                  >
                    <option value={5}>5 Leads (Quick Pilot)</option>
                    <option value={10}>10 Leads (Recommended)</option>
                    <option value={15}>15 Leads (Standard Batch)</option>
                    <option value={25}>25 Leads (High Volume)</option>
                    <option value={50}>50 Leads (Enterprise Blitz)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Automation Mode
                  </label>
                  <select
                    className="input"
                    value={runAutoForm.mode}
                    onChange={(e) => setRunAutoForm({ ...runAutoForm, mode: e.target.value })}
                  >
                    <option value="full_auto">⚡ 100% Full Auto (Zero-Touch)</option>
                    <option value="human_review">🛡️ Human Review Before WhatsApp/Email</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowRunFullAutoModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={runningFullAuto}
                  style={{
                    background: 'linear-gradient(135deg, #1456FD 0%, #0D9488 100%)',
                    fontWeight: 800,
                    padding: '8px 18px',
                  }}
                >
                  {runningFullAuto ? <span className="spinner" style={{ width: 14, height: 14 }} /> : '⚡'}
                  <span>Launch Autonomous Campaign ({runAutoForm.count} Leads)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Auto-Enqueue Scraped Leads Configuration ─────────────────── */}
      {showAutoEnqueueModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAutoEnqueueModal(false)}>
          <div className="modal fade-in" style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: 24 }}>📥</span>
                <div>
                  <h3 className="section-title">Auto-Enqueue Scraped Clinics into Autopilot</h3>
                  <p className="text-xs text-secondary mt-0.5">
                    Import discovered healthcare practices and bind target Reach inventory slot pricing.
                  </p>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAutoEnqueueModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAutoEnqueueScrapedSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                  Target Product Campaign
                </label>
                <div className="grid-3" style={{ gap: 8 }}>
                  <label
                    style={{
                      border: `2px solid ${autoEnqueueForm.product === 'reach' ? '#0D9488' : '#E2E8F0'}`,
                      background: autoEnqueueForm.product === 'reach' ? '#F0FDFA' : '#FFFFFF',
                      padding: 10,
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    <input
                      type="radio"
                      name="enqueueProduct"
                      checked={autoEnqueueForm.product === 'reach'}
                      onChange={() => setAutoEnqueueForm({ ...autoEnqueueForm, product: 'reach' })}
                      style={{ marginRight: 6 }}
                    />
                    <strong>🎯 Practo Reach</strong>
                  </label>

                  <label
                    style={{
                      border: `2px solid ${autoEnqueueForm.product === 'prime' ? '#1456FD' : '#E2E8F0'}`,
                      background: autoEnqueueForm.product === 'prime' ? '#EFF6FF' : '#FFFFFF',
                      padding: 10,
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    <input
                      type="radio"
                      name="enqueueProduct"
                      checked={autoEnqueueForm.product === 'prime'}
                      onChange={() => setAutoEnqueueForm({ ...autoEnqueueForm, product: 'prime' })}
                      style={{ marginRight: 6 }}
                    />
                    <strong>🌟 Practo Prime</strong>
                  </label>

                  <label
                    style={{
                      border: `2px solid ${autoEnqueueForm.product === 'all' ? '#7C3AED' : '#E2E8F0'}`,
                      background: autoEnqueueForm.product === 'all' ? '#F5F3FF' : '#FFFFFF',
                      padding: 10,
                      borderRadius: 8,
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    <input
                      type="radio"
                      name="enqueueProduct"
                      checked={autoEnqueueForm.product === 'all'}
                      onChange={() => setAutoEnqueueForm({ ...autoEnqueueForm, product: 'all' })}
                      style={{ marginRight: 6 }}
                    />
                    <strong>⚡ Smart Auto</strong>
                  </label>
                </div>
              </div>

              {/* Reach Inventory Slot Selection */}
              {autoEnqueueForm.product === 'reach' && (
                <div style={{ marginBottom: 14 }}>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Select Reach Inventory Slot to Pitch
                  </label>
                  <select
                    className="input"
                    value={autoEnqueueForm.reachSlotId}
                    onChange={(e) => setAutoEnqueueForm({ ...autoEnqueueForm, reachSlotId: e.target.value })}
                    style={{ fontSize: 12.5 }}
                  >
                    {availableReachSlots.map((slot) => (
                      <option key={slot.slotId} value={slot.slotId}>
                        [Pos #{slot.position}] {slot.zone}, {slot.city} — {slot.speciality} (₹{slot.price3M?.toLocaleString('en-IN')}/3M)
                      </option>
                    ))}
                  </select>

                  {selectedEnqueueReachSlot && (
                    <div className="mt-2 text-xs" style={{ color: '#0F766E', background: '#F0FDFA', padding: '8px 12px', borderRadius: 6, border: '1px solid #CCFBF1' }}>
                      📍 <strong>{selectedEnqueueReachSlot.zone}</strong> · Pos #{selectedEnqueueReachSlot.position} · 📈 {selectedEnqueueReachSlot.monthlySearchVolume?.toLocaleString()} searches · 💰 Rate: <strong>₹{selectedEnqueueReachSlot.price3M?.toLocaleString('en-IN')}/3M</strong>
                    </div>
                  )}
                </div>
              )}

              <div className="grid-2 mb-4" style={{ gap: 12 }}>
                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Number of Scraped Leads
                  </label>
                  <select
                    className="input"
                    value={autoEnqueueForm.limit}
                    onChange={(e) => setAutoEnqueueForm({ ...autoEnqueueForm, limit: Number(e.target.value) })}
                  >
                    <option value={10}>10 Clinics</option>
                    <option value={20}>20 Clinics (Default)</option>
                    <option value={30}>30 Clinics</option>
                    <option value={50}>50 Clinics</option>
                  </select>
                </div>

                <div className="flex items-center" style={{ paddingTop: 20 }}>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                    <input
                      type="checkbox"
                      checked={autoEnqueueForm.autoStart}
                      onChange={(e) => setAutoEnqueueForm({ ...autoEnqueueForm, autoStart: e.target.checked })}
                    />
                    <span>Auto-Start Voice AI Calling Immediately</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowAutoEnqueueModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={autoEnqueueing}>
                  {autoEnqueueing ? 'Importing...' : `📥 Enqueue (${autoEnqueueForm.limit}) Leads`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Manual Call ────────────────────────────────────────────────── */}
      {showCallModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowCallModal(false)}>
          <div className="modal fade-in" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h3 className="section-title">Manual Outbound Call (Proprietary Voice AI)</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCallModal(false)}>✕</button>
            </div>

            <form onSubmit={handleTriggerManualCall}>
              <div style={{ marginBottom: 12 }}>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block' }}>Doctor Name</label>
                <input
                  className="input"
                  value={callForm.doctorName}
                  onChange={(e) => setCallForm({ ...callForm, doctorName: e.target.value })}
                  placeholder="Dr. Rajesh Kumar"
                  required
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block' }}>Phone Number</label>
                <input
                  className="input"
                  value={callForm.phone}
                  onChange={(e) => setCallForm({ ...callForm, phone: e.target.value })}
                  placeholder="+919876543210"
                  required
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block' }}>Clinic Name</label>
                <input
                  className="input"
                  value={callForm.clinicName}
                  onChange={(e) => setCallForm({ ...callForm, clinicName: e.target.value })}
                  placeholder="Care Clinic"
                  required
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block' }}>Product</label>
                <select
                  className="input"
                  value={callForm.product}
                  onChange={(e) => setCallForm({ ...callForm, product: e.target.value })}
                >
                  <option value="reach">🎯 Practo Reach (Spotlight Position 1 / 6)</option>
                  <option value="prime">🌟 Practo Prime (Assured Bookings)</option>
                </select>
              </div>

              {callForm.product === 'reach' && (
                <div style={{ marginBottom: 14 }}>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block' }}>
                    Select Reach Inventory Slot to Pitch
                  </label>
                  <select
                    className="input"
                    value={callForm.reachSlotId}
                    onChange={(e) => {
                      const found = availableReachSlots.find((s) => s.slotId === e.target.value);
                      setCallForm({
                        ...callForm,
                        reachSlotId: e.target.value,
                        locality: found?.zone || callForm.locality,
                        city: found?.city || callForm.city,
                        speciality: found?.speciality || callForm.speciality,
                      });
                    }}
                    style={{ fontSize: 12.5 }}
                  >
                    {availableReachSlots.map((slot) => (
                      <option key={slot.slotId} value={slot.slotId}>
                        [Pos #{slot.position}] {slot.zone}, {slot.city} — {slot.speciality} (₹{slot.price3M?.toLocaleString('en-IN')}/3M)
                      </option>
                    ))}
                  </select>

                  {selectedCallReachSlot && (
                    <div
                      className="mt-2 text-xs"
                      style={{
                        background: '#F0FDFA',
                        padding: 10,
                        borderRadius: 6,
                        border: '1px solid #CCFBF1',
                        color: '#0F766E',
                      }}
                    >
                      <div>
                        ⚡ <strong>Pos #{selectedCallReachSlot.position} Spotlight</strong> in <strong>{selectedCallReachSlot.zone}</strong>
                      </div>
                      <div className="mt-0.5">
                        📈 {selectedCallReachSlot.monthlySearchVolume?.toLocaleString()} patient searches/mo · Rate: <strong>₹{selectedCallReachSlot.price3M?.toLocaleString('en-IN')} / 3 Months</strong>
                      </div>
                      <div className="text-xs text-secondary italic mt-1 pt-1" style={{ borderTop: '1px dashed #99F6E4' }}>
                        AI will automatically pitch this exact locality placement and ₹{selectedCallReachSlot.price3M?.toLocaleString('en-IN')} pricing to {callForm.doctorName || 'Doctor'}.
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowCallModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm" disabled={callingNow}>
                  {callingNow ? 'Dialing...' : '📞 Place Call'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Manual WhatsApp ───────────────────────────────────────────── */}
      {showWhatsAppModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowWhatsAppModal(false)}>
          <div className="modal fade-in" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <h3 className="section-title">Manual WhatsApp AI Outreach</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowWhatsAppModal(false)}>✕</button>
            </div>

            <form onSubmit={handleTriggerManualWhatsApp}>
              <div style={{ marginBottom: 12 }}>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block' }}>Doctor Phone</label>
                <input
                  className="input"
                  value={whatsAppForm.phone}
                  onChange={(e) => setWhatsAppForm({ ...whatsAppForm, phone: e.target.value })}
                  placeholder="+919876543210"
                  required
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block' }}>Doctor Name</label>
                <input
                  className="input"
                  value={whatsAppForm.doctorName}
                  onChange={(e) => setWhatsAppForm({ ...whatsAppForm, doctorName: e.target.value })}
                  placeholder="Dr. Rajesh Kumar"
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block' }}>Product</label>
                <select
                  className="input"
                  value={whatsAppForm.product}
                  onChange={(e) => setWhatsAppForm({ ...whatsAppForm, product: e.target.value })}
                >
                  <option value="prime">Practo Prime</option>
                  <option value="reach">Practo Reach</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowWhatsAppModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-teal btn-sm" disabled={sendingWhatsApp}>
                  {sendingWhatsApp ? 'Sending...' : '💬 Send WhatsApp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
