import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';

const STAGES = [
  { id: 'new', label: 'New Leads', color: '#5B8DEF', count: 0 },
  { id: 'contacted', label: 'Contacted', color: '#1DB8A0', count: 0 },
  { id: 'qualified', label: 'Qualified', color: '#E8A838', count: 0 },
  { id: 'proposal', label: 'Proposal Sent', color: '#C45C26', count: 0 },
  { id: 'won', label: 'Won / Subscribed', color: '#2F9E44', count: 0 },
  { id: 'lost', label: 'Lost', color: '#868E96', count: 0 },
];

export default function PulseCrm() {
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [leads, setLeads] = useState([]);
  const [viewMode, setViewMode] = useState('kanban'); // kanban | table
  const [selectedLead, setSelectedLead] = useState(null);
  const [stageFilter, setStageFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [newNote, setNewNote] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [busy, setBusy] = useState(false);

  // Quick Action Modal states
  const [actionModal, setActionModal] = useState(null); // 'call' | 'whatsapp' | 'email' | null
  const [actionTargetLead, setActionTargetLead] = useState(null);
  const [dialVoice, setDialVoice] = useState('elevenlabs_priya');
  const [waTemplate, setWaTemplate] = useState('reach_pitch');
  const [emailStep, setEmailStep] = useState(1);

  const loadCrm = useCallback(async () => {
    setBusy(true);
    try {
      const data = await api.getCrmLeads({ stage: stageFilter, search: searchQuery, limit: 120 });
      let loaded = data.leads || [];
      if (!loaded.length) {
        // Fallback to pulse leads if DB leads empty
        const pulse = await api.pulseLeads();
        loaded = (pulse.leads || []).map((l) => ({
          ...l,
          stage: l.status === 'DEMO_SCHEDULED' ? 'qualified' : l.status === 'OUTREACH_ACTIVE' ? 'contacted' : 'new',
          company: l.clinicName,
          name: l.doctorName,
          score: l.leadScore,
        }));
      }
      setLeads(loaded);
      if (selectedLead) {
        const refreshed = loaded.find((l) => l.id === selectedLead.id);
        if (refreshed) setSelectedLead(refreshed);
      }
    } catch (err) {
      toast(err.message || 'Failed to load CRM leads');
    } finally {
      setBusy(false);
    }
  }, [stageFilter, searchQuery, toast]);

  useEffect(() => {
    loadCrm();
  }, [loadCrm]);

  const stageCounts = useMemo(() => {
    const counts = {};
    STAGES.forEach((s) => (counts[s.id] = 0));
    leads.forEach((l) => {
      const st = l.stage || 'new';
      if (counts[st] !== undefined) counts[st]++;
      else counts.new++;
    });
    return counts;
  }, [leads]);

  async function handleStageChange(leadId, nextStage) {
    try {
      await api.updateCrmStage(leadId, { stage: nextStage, note: `Moved to ${nextStage}` });
      toast(`Stage updated to ${nextStage}`);
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, stage: nextStage } : l))
      );
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead((prev) => ({ ...prev, stage: nextStage }));
      }
    } catch (err) {
      toast(err.message || 'Stage update failed');
    }
  }

  async function handleAddNote(e) {
    e.preventDefault();
    if (!selectedLead || !newNote.trim()) return;
    try {
      await api.addCrmNote(selectedLead.id, { note: newNote.trim(), nextAction: nextAction.trim() });
      toast('Note saved to lead timeline');
      setNewNote('');
      setNextAction('');
      loadCrm();
    } catch (err) {
      toast(err.message || 'Failed to add note');
    }
  }

  async function executeQuickCall(e) {
    e.preventDefault();
    if (!actionTargetLead) return;
    setBusy(true);
    try {
      const res = await api.dialAiCall({
        phone: actionTargetLead.phone,
        doctorName: actionTargetLead.name || actionTargetLead.doctorName,
        clinicName: actionTargetLead.company || actionTargetLead.clinicName,
        specialty: actionTargetLead.specialty || 'Clinic',
        locality: actionTargetLead.locality || actionTargetLead.zone,
        product: actionTargetLead.recommendedProduct || 'PRIME',
        voice: dialVoice,
        leadId: actionTargetLead.id,
      });
      toast(res.message || 'AI Voice call completed');
      setActionModal(null);
      loadCrm();
    } catch (err) {
      toast(err.message || 'Call failed');
    } finally {
      setBusy(false);
    }
  }

  async function executeQuickWhatsApp(e) {
    e.preventDefault();
    if (!actionTargetLead) return;
    setBusy(true);
    try {
      const res = await api.sendWhatsApp({
        to: actionTargetLead.phone,
        doctorName: actionTargetLead.name || actionTargetLead.doctorName,
        clinicName: actionTargetLead.company || actionTargetLead.clinicName,
        specialty: actionTargetLead.specialty || 'Clinic',
        locality: actionTargetLead.locality || actionTargetLead.zone,
        product: actionTargetLead.recommendedProduct || 'PRIME',
        templateId: waTemplate,
        leadId: actionTargetLead.id,
      });
      toast(res.message || 'WhatsApp message sent');
      setActionModal(null);
      loadCrm();
    } catch (err) {
      toast(err.message || 'WhatsApp send failed');
    } finally {
      setBusy(false);
    }
  }

  async function executeQuickEmail(e) {
    e.preventDefault();
    if (!actionTargetLead) return;
    setBusy(true);
    try {
      const res = await api.sendEmail({
        to: actionTargetLead.email,
        doctorName: actionTargetLead.name || actionTargetLead.doctorName,
        clinicName: actionTargetLead.company || actionTargetLead.clinicName,
        specialty: actionTargetLead.specialty || 'Clinic',
        locality: actionTargetLead.locality || actionTargetLead.zone,
        step: emailStep,
        leadId: actionTargetLead.id,
      });
      toast(res.message || 'Email sequence sent');
      setActionModal(null);
      loadCrm();
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
          <span className="px-eyebrow">Pipeline &amp; Deal Management</span>
          <h1>CRM Hub</h1>
          <p>
            Manage currently open and pipeline leads, track voice call recordings, WhatsApp messages, emails, and advance stages from New to Won.
          </p>
        </div>
        <div className="pulse-actions">
          <div className="pulse-tabs" style={{ display: 'inline-flex', background: 'rgba(148, 163, 184, 0.1)', borderRadius: 10, padding: 3 }}>
            <button
              type="button"
              className={`pulse-btn ${viewMode === 'kanban' ? '' : 'ghost'}`}
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
              onClick={() => setViewMode('kanban')}
            >
              Kanban Board
            </button>
            <button
              type="button"
              className={`pulse-btn ${viewMode === 'table' ? '' : 'ghost'}`}
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem' }}
              onClick={() => setViewMode('table')}
            >
              Data Table
            </button>
          </div>
          <button type="button" className="pulse-btn ghost" onClick={loadCrm} disabled={busy}>
            Refresh
          </button>
        </div>
      </header>

      {/* CRM Search & Filters */}
      <section className="pulse-card" style={{ marginBottom: 16 }}>
        <div className="pulse-filters" style={{ padding: 0, background: 'transparent' }}>
          <label style={{ flex: 1 }}>
            Search Leads &amp; Contacts
            <input
              type="search"
              placeholder="Search by clinic, doctor, phone, email, locality…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>
          <label>
            Pipeline Stage
            <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
              <option value="all">All Stages ({leads.length})</option>
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label} ({stageCounts[s.id] || 0})
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {/* Main CRM View: Kanban or Table */}
      {viewMode === 'kanban' ? (
        <div className="pulse-kanban-board" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(240px, 1fr))', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
          {STAGES.map((stage) => {
            const stageLeads = leads.filter((l) => (l.stage || 'new') === stage.id);
            return (
              <div
                key={stage.id}
                className="pulse-kanban-col"
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(148, 163, 184, 0.12)',
                  borderRadius: 14,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  minHeight: 480,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 6, borderBottom: `2px solid ${stage.color}` }}>
                  <strong style={{ fontSize: '0.9rem', color: stage.color }}>{stage.label}</strong>
                  <span className="pulse-chip" style={{ fontSize: '0.75rem', padding: '0.1rem 0.45rem' }}>
                    {stageLeads.length}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1, overflowY: 'auto' }}>
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="pulse-kanban-card"
                      style={{
                        background: selectedLead?.id === lead.id ? 'rgba(45, 212, 191, 0.15)' : 'rgba(30, 41, 59, 0.75)',
                        border: selectedLead?.id === lead.id ? '1px solid #2dd4bf' : '1px solid rgba(148, 163, 184, 0.15)',
                        borderRadius: 10,
                        padding: 10,
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                      }}
                      onClick={() => setSelectedLead(lead)}
                    >
                      <strong style={{ fontSize: '0.88rem', display: 'block', color: '#f8fafc', marginBottom: 2 }}>
                        {lead.company || lead.clinicName}
                      </strong>
                      <div className="muted" style={{ fontSize: '0.78rem' }}>
                        {lead.name || lead.doctorName || 'Doctor'}
                      </div>
                      <div className="muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
                        📍 {lead.locality || lead.zone || 'City'} · {lead.specialty || 'General'}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <span className={`pulse-fit ${String(lead.recommendedProduct || 'PRIME').toLowerCase()}`} style={{ fontSize: '0.7rem' }}>
                          {lead.recommendedProduct || 'PRIME'}
                        </span>
                        <span className="pulse-chip" style={{ fontSize: '0.7rem' }}>
                          Score: {lead.score ?? lead.leadScore ?? 65}
                        </span>
                      </div>

                      {/* Quick stage selector */}
                      <div style={{ marginTop: 8, borderTop: '1px solid rgba(148, 163, 184, 0.1)', paddingTop: 6, display: 'flex', gap: 4 }}>
                        <select
                          value={lead.stage || 'new'}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleStageChange(lead.id, e.target.value)}
                          style={{ fontSize: '0.72rem', padding: '0.2rem 0.4rem', borderRadius: 6, background: 'rgba(15, 23, 42, 0.8)', color: '#94a3b8' }}
                        >
                          {STAGES.map((s) => (
                            <option key={s.id} value={s.id}>
                              Move: {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                  {!stageLeads.length ? (
                    <div className="muted" style={{ fontSize: '0.8rem', textAlign: 'center', padding: '2rem 0.5rem', opacity: 0.6 }}>
                      No leads in this stage
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Data Table View */
        <section className="pulse-card">
          <div className="pulse-table-wrap">
            <table className="pulse-table">
              <thead>
                <tr>
                  <th>Clinic / Doctor</th>
                  <th>Phone / Email</th>
                  <th>Locality</th>
                  <th>Stage</th>
                  <th>Score</th>
                  <th>Product</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} onClick={() => setSelectedLead(lead)} style={{ cursor: 'pointer' }}>
                    <td>
                      <strong>{lead.company || lead.clinicName}</strong>
                      <div className="muted">{lead.name || lead.doctorName}</div>
                    </td>
                    <td>
                      <div>{lead.phone || '—'}</div>
                      <div className="muted">{lead.email || '—'}</div>
                    </td>
                    <td>
                      {lead.locality || lead.zone}
                      <div className="muted">{lead.city}</div>
                    </td>
                    <td>
                      <select
                        value={lead.stage || 'new'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleStageChange(lead.id, e.target.value)}
                        style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                      >
                        {STAGES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="score">{lead.score ?? lead.leadScore ?? 65}</td>
                    <td>
                      <span className={`pulse-fit ${String(lead.recommendedProduct || 'PRIME').toLowerCase()}`}>
                        {lead.recommendedProduct || 'PRIME'}
                      </span>
                    </td>
                    <td className="pulse-row-actions">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLead(lead);
                        }}
                      >
                        View Timeline
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Lead Details & Chronological Timeline Drawer Modal */}
      {selectedLead ? (
        <div
          className="pulse-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(3, 7, 18, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setSelectedLead(null)}
        >
          <div
            className="pulse-drawer"
            style={{
              width: 'min(640px, 94vw)',
              height: '100%',
              background: '#0f172a',
              borderLeft: '1px solid rgba(148, 163, 184, 0.2)',
              overflowY: 'auto',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="px-eyebrow">Lead Record &amp; History</span>
                <h2 style={{ margin: '0.2rem 0', color: '#f8fafc' }}>
                  {selectedLead.company || selectedLead.clinicName}
                </h2>
                <div className="muted">
                  {selectedLead.name || selectedLead.doctorName} · {selectedLead.specialty || 'Specialty Practice'}
                </div>
              </div>
              <button
                type="button"
                className="pulse-btn ghost"
                style={{ padding: '0.35rem 0.7rem' }}
                onClick={() => setSelectedLead(null)}
              >
                ✕ Close
              </button>
            </div>

            {/* Quick Action Outbound Bar */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                background: 'rgba(30, 41, 59, 0.75)',
                padding: 10,
                borderRadius: 12,
                border: '1px solid rgba(148, 163, 184, 0.15)',
              }}
            >
              <button
                type="button"
                className="pulse-btn"
                style={{ flex: 1, fontSize: '0.85rem' }}
                onClick={() => {
                  setActionTargetLead(selectedLead);
                  setActionModal('call');
                }}
              >
                📞 AI Voice Call
              </button>
              <button
                type="button"
                className="pulse-btn ghost"
                style={{ flex: 1, fontSize: '0.85rem' }}
                onClick={() => {
                  setActionTargetLead(selectedLead);
                  setActionModal('whatsapp');
                }}
              >
                💬 WhatsApp Pitch
              </button>
              <button
                type="button"
                className="pulse-btn ghost"
                style={{ flex: 1, fontSize: '0.85rem' }}
                onClick={() => {
                  setActionTargetLead(selectedLead);
                  setActionModal('email');
                }}
              >
                ✉️ Cold Email
              </button>
            </div>

            {/* Lead Meta Grid */}
            <div className="pulse-grid-2" style={{ gap: 10 }}>
              <div className="pulse-card" style={{ padding: 12 }}>
                <span className="muted" style={{ fontSize: '0.78rem' }}>Phone</span>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: '#2dd4bf' }}>
                  {selectedLead.phone || 'No phone'}
                </strong>
              </div>
              <div className="pulse-card" style={{ padding: 12 }}>
                <span className="muted" style={{ fontSize: '0.78rem' }}>Email</span>
                <strong style={{ display: 'block', fontSize: '0.9rem', color: '#38bdf8' }}>
                  {selectedLead.email || 'No email'}
                </strong>
              </div>
              <div className="pulse-card" style={{ padding: 12 }}>
                <span className="muted" style={{ fontSize: '0.78rem' }}>Location</span>
                <strong style={{ display: 'block', fontSize: '0.9rem' }}>
                  {selectedLead.locality || selectedLead.zone}, {selectedLead.city || 'Bangalore'}
                </strong>
              </div>
              <div className="pulse-card" style={{ padding: 12 }}>
                <span className="muted" style={{ fontSize: '0.78rem' }}>Product Fit &amp; Score</span>
                <strong style={{ display: 'block', fontSize: '0.9rem' }}>
                  {selectedLead.recommendedProduct || 'PRIME'} (Score {selectedLead.score ?? selectedLead.leadScore ?? 65})
                </strong>
              </div>
            </div>

            {/* Stage Selector */}
            <div className="pulse-card" style={{ padding: 12 }}>
              <label>
                Current CRM Pipeline Stage
                <select
                  value={selectedLead.stage || 'new'}
                  onChange={(e) => handleStageChange(selectedLead.id, e.target.value)}
                >
                  {STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {/* Add Custom Note Form */}
            <form onSubmit={handleAddNote} className="pulse-card" style={{ padding: 12 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: '0.9rem' }}>Add Note / Next Action</h3>
              <textarea
                rows={2}
                placeholder="Enter discussion notes, callback commitment, or objections…"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                style={{ width: '100%', marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Next action (e.g. Call back Friday 3 PM)"
                  value={nextAction}
                  onChange={(e) => setNextAction(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="pulse-btn" disabled={!newNote.trim()}>
                  Save Note
                </button>
              </div>
            </form>

            {/* Chronological Activity Feed (Voice Calls + WhatsApp + Email + Notes) */}
            <section className="pulse-card" style={{ padding: 14 }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem' }}>Outreach &amp; Call Timeline</h3>

              {/* Call logs with Audio player & Transcript */}
              {(selectedLead.calls || []).map((call) => (
                <div
                  key={call.id}
                  style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    borderLeft: '3px solid #2dd4bf',
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.85rem', color: '#2dd4bf' }}>
                      📞 AI Voice Call · {call.duration_sec ? `${call.duration_sec}s` : 'Completed'}
                    </strong>
                    <span className="muted" style={{ fontSize: '0.75rem' }}>
                      {new Date(call.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', margin: '4px 0', color: '#e2e8f0' }}>{call.summary}</p>

                  {/* Playable audio recording */}
                  {call.recording_url ? (
                    <div style={{ marginTop: 8, background: 'rgba(15, 23, 42, 0.9)', padding: 6, borderRadius: 6 }}>
                      <audio controls src={call.recording_url} style={{ width: '100%', height: 32 }} />
                    </div>
                  ) : null}

                  {/* Transcript accordion */}
                  {call.transcript ? (
                    <details style={{ marginTop: 6, fontSize: '0.78rem', color: '#94a3b8' }}>
                      <summary style={{ cursor: 'pointer', color: '#38bdf8' }}>View Call Dialogue Transcript</summary>
                      <pre style={{ whiteSpace: 'pre-wrap', marginTop: 4, fontFamily: 'inherit', background: 'rgba(15, 23, 42, 0.5)', padding: 8, borderRadius: 6 }}>
                        {call.transcript}
                      </pre>
                    </details>
                  ) : null}
                </div>
              ))}

              {/* Outreach Messages (WhatsApp & Email) */}
              {(selectedLead.messages || []).map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    background: msg.channel === 'whatsapp' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                    borderLeft: `3px solid ${msg.channel === 'whatsapp' ? '#10b981' : '#3b82f6'}`,
                    padding: 10,
                    borderRadius: 8,
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '0.82rem', color: msg.channel === 'whatsapp' ? '#34d399' : '#60a5fa' }}>
                      {msg.channel === 'whatsapp' ? '💬 WhatsApp Message' : '✉️ Email Outreach'} ({msg.status})
                    </strong>
                    <span className="muted" style={{ fontSize: '0.72rem' }}>
                      {new Date(msg.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8rem', margin: '4px 0', whiteSpace: 'pre-wrap' }}>{msg.body}</p>
                </div>
              ))}

              {/* General Notes from Lead */}
              {selectedLead.notes ? (
                <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: 10, borderRadius: 8 }}>
                  <strong style={{ fontSize: '0.82rem', color: '#94a3b8' }}>📝 Lead Notes</strong>
                  <pre style={{ whiteSpace: 'pre-wrap', margin: '4px 0', fontSize: '0.78rem', color: '#cbd5e1', fontFamily: 'inherit' }}>
                    {selectedLead.notes}
                  </pre>
                </div>
              ) : null}
            </section>
          </div>
        </div>
      ) : null}

      {/* Quick Outbound Action Modals */}
      {actionModal && actionTargetLead ? (
        <div
          className="pulse-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(3, 7, 18, 0.8)',
            backdropFilter: 'blur(6px)',
            zIndex: 1100,
            display: 'grid',
            placeItems: 'center',
            padding: 16,
          }}
          onClick={() => setActionModal(null)}
        >
          <div
            className="pulse-card"
            style={{ width: 'min(500px, 94vw)', background: '#0f172a' }}
            onClick={(e) => e.stopPropagation()}
          >
            {actionModal === 'call' ? (
              <form onSubmit={executeQuickCall}>
                <h2>📞 AI Voice Call Dialer</h2>
                <p className="muted" style={{ marginBottom: 12 }}>
                  Dialing Dr. {actionTargetLead.name || actionTargetLead.doctorName} at {actionTargetLead.company || actionTargetLead.clinicName} ({actionTargetLead.phone})
                </p>
                <label>
                  Voice Agent Persona
                  <select value={dialVoice} onChange={(e) => setDialVoice(e.target.value)}>
                    <option value="elevenlabs_priya">Priya · Indian English Healthcare Specialist</option>
                    <option value="elevenlabs_rahul">Rahul · Indian English Commercial AE</option>
                    <option value="elevenlabs_ananya">Ananya · Hindi / Hinglish Specialist</option>
                    <option value="elevenlabs_marcus">Marcus · US English Enterprise</option>
                  </select>
                </label>
                <div className="pulse-actions" style={{ marginTop: 16 }}>
                  <button type="submit" className="pulse-btn" disabled={busy}>
                    {busy ? 'Dialing…' : 'Start AI Call Now'}
                  </button>
                  <button type="button" className="pulse-btn ghost" onClick={() => setActionModal(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : actionModal === 'whatsapp' ? (
              <form onSubmit={executeQuickWhatsApp}>
                <h2>💬 WhatsApp Autopilot Pitch</h2>
                <p className="muted" style={{ marginBottom: 12 }}>
                  Send template to {actionTargetLead.phone}
                </p>
                <label>
                  Select Template
                  <select value={waTemplate} onChange={(e) => setWaTemplate(e.target.value)}>
                    <option value="reach_pitch">Practo Reach Locality Pitch</option>
                    <option value="prime_pitch">Practo Prime Premier Listing</option>
                    <option value="post_call_followup">Post-Call Proposal Followup</option>
                    <option value="slot_urgency">Slot Availability Alert</option>
                  </select>
                </label>
                <div className="pulse-actions" style={{ marginTop: 16 }}>
                  <button type="submit" className="pulse-btn" disabled={busy}>
                    {busy ? 'Sending…' : 'Send WhatsApp Message'}
                  </button>
                  <button type="button" className="pulse-btn ghost" onClick={() => setActionModal(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={executeQuickEmail}>
                <h2>✉️ Cold Email Sequence</h2>
                <p className="muted" style={{ marginBottom: 12 }}>
                  Send sequence to {actionTargetLead.email || 'Doctor'}
                </p>
                <label>
                  Drip Sequence Step
                  <select value={emailStep} onChange={(e) => setEmailStep(Number(e.target.value))}>
                    <option value={1}>Step 1: Initial Hook &amp; Patient Growth (Day 0)</option>
                    <option value={2}>Step 2: Locality Case Study &amp; Competitor Presence (Day 2)</option>
                    <option value={3}>Step 3: Executive Proposal &amp; Calendar Hold (Day 4)</option>
                  </select>
                </label>
                <div className="pulse-actions" style={{ marginTop: 16 }}>
                  <button type="submit" className="pulse-btn" disabled={busy}>
                    {busy ? 'Sending…' : 'Send Email Now'}
                  </button>
                  <button type="button" className="pulse-btn ghost" onClick={() => setActionModal(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
