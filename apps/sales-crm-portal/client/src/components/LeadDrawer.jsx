import React, { useState, useEffect } from 'react';
import { useCrm } from '../context/CrmContext';
import { api } from '../services/api';
import ProposalSuite from './ProposalSuite';

export function LeadDrawer({ leadId, onClose, onLeadUpdated }) {
  const { addToast, setVoiceDialerLead, setPitchLead, hasPermission } = useCrm();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [showProposal, setShowProposal] = useState(false);
  const [autoPilotLoading, setAutoPilotLoading] = useState(false);

  useEffect(() => {
    async function loadLead() {
      if (!leadId) return;
      try {
        setLoading(true);
        const data = await api.getLeadById(leadId);
        setLead(data);
      } catch (err) {
        addToast(err.message || 'Error loading lead', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadLead();
  }, [leadId, addToast]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteText.trim() || !lead) return;

    const newTimelineItem = {
      id: `act-${Date.now()}`,
      type: 'note',
      title: 'Manual Note Added',
      description: noteText.trim(),
      timestamp: new Date().toISOString(),
      user: localStorage.getItem('crm_active_name') || 'User',
    };

    const updatedTimeline = [newTimelineItem, ...(lead.timeline || [])];
    try {
      const updated = await api.updateLead(lead.id, { timeline: updatedTimeline });
      setLead(updated);
      setNoteText('');
      addToast('Note added to lead timeline', 'success');
      if (onLeadUpdated) onLeadUpdated(updated);
    } catch (err) {
      addToast(err.message || 'Failed to update note', 'error');
    }
  };

  const handleAutoPilotPush = async () => {
    if (!lead) return;
    try {
      setAutoPilotLoading(true);
      const res = await api.launchAutoPilot([lead.id], 'Practo Prime');
      addToast(`🚀 Pushed ${lead.name} to Autonomous AI Pilot (Call → WA → Email)`, 'success');
      if (onLeadUpdated) {
        onLeadUpdated({
          ...lead,
          status: 'Contacted',
          stage: lead.stage === 'New Lead' ? 'Contacted' : lead.stage,
        });
      }
    } catch (err) {
      addToast(err.message || 'Failed to trigger Auto-Pilot', 'error');
    } finally {
      setAutoPilotLoading(false);
    }
  };

  const handleAnonymize = async () => {
    if (!window.confirm(`Are you sure you want to permanently erase PII for ${lead.name} per GDPR/DPDP request?`)) return;
    try {
      const res = await api.anonymizeLead(lead.id);
      setLead(res.lead);
      addToast('Lead PII erased successfully', 'info');
      if (onLeadUpdated) onLeadUpdated(res.lead);
    } catch (err) {
      addToast(err.message || 'Failed to anonymize lead', 'error');
    }
  };

  if (!leadId) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 80,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel animate-slide-in-right"
        style={{
          width: '100%',
          maxWidth: '520px',
          height: '100%',
          background: 'var(--bg-card-solid)',
          borderLeft: '1px solid var(--border-glow)',
          borderRadius: 0,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-card)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            background: 'var(--bg-input)',
          }}
        >
          <div>
            <span className="badge badge-indigo" style={{ marginBottom: '6px' }}>
              {lead?.status || 'Lead'} • {lead?.specialty}
            </span>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>
              {lead?.name}
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {lead?.organization} • {lead?.city} {lead?.zone ? `(${lead.zone}${lead.locality ? ` • ${lead.locality}` : ''})` : ''}
            </div>
          </div>

          <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
            ✕
          </button>
        </div>

        {/* Content Body */}
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Loading doctor profile...
          </div>
        ) : lead ? (
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Quick Action Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
              <button
                onClick={() => {
                  setPitchLead(lead);
                }}
                className="btn btn-primary btn-sm"
              >
                ✨ AI Pitch Studio
              </button>
              <button
                onClick={() => {
                  setVoiceDialerLead(lead);
                }}
                className="btn btn-emerald btn-sm"
              >
                🎙️ AI Voice Call
              </button>
              <button
                onClick={() => setShowProposal(true)}
                className="btn btn-secondary btn-sm"
                style={{ border: '1px solid rgba(6,182,212,0.4)', color: '#06B6D4' }}
              >
                📄 Proposal Suite
              </button>
              <button
                onClick={handleAutoPilotPush}
                className="btn btn-primary btn-sm"
                style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}
                disabled={autoPilotLoading}
              >
                {autoPilotLoading ? 'Pushing...' : '🚀 Auto-Pilot'}
              </button>
            </div>

            {/* 🚨 Human Escalation Alert Card */}
            {(lead.needsHumanIntervention || lead.stage === 'Needs Human Intervention' || lead.status === 'Needs Human Intervention') && (
              <div
                style={{
                  background: '#FEF2F2',
                  border: '1.5px solid #FCA5A5',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#B91C1C', textTransform: 'uppercase' }}>
                      🚨 Human Intervention Required
                    </span>
                  </div>
                  <span className="badge badge-rose">Assigned: {lead.escalationDetails?.assignedRep || lead.assignedRep || 'Field Sales AE'}</span>
                </div>

                <div style={{ fontSize: '12.5px', color: '#7F1D1D', fontWeight: 600, marginBottom: '10px' }}>
                  {lead.escalationDetails?.reason || 'Doctor requested customized commercial package discussion with senior account executive.'}
                </div>

                <div style={{ background: '#FFFFFF', padding: '10px 12px', borderRadius: '8px', border: '1px solid #FECACA', marginBottom: '12px' }}>
                  <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#15803D', marginBottom: '2px' }}>
                    📝 Recommended Field Rep Action:
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#14532D' }}>
                    {lead.escalationDetails?.recommendedAction || `Call Dr. ${lead.name.replace('Dr. ', '')} directly to present Practo Prime Supreme commercial proposal.`}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => setVoiceDialerLead(lead)}
                    className="btn btn-emerald btn-sm"
                    style={{ flex: 1, fontSize: '11px' }}
                  >
                    📞 Call Doctor Now
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const updated = await api.resolveEscalation({
                          leadId: lead.id,
                          newStage: 'Demo Scheduled',
                          fieldNotes: 'Field consultation booked via drawer',
                        });
                        setLead(updated.lead);
                        addToast('Escalation resolved! Moved to Demo Scheduled', 'success');
                        if (onLeadUpdated) onLeadUpdated(updated.lead);
                      } catch (e) {
                        addToast(e.message, 'error');
                      }
                    }}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, fontSize: '11px' }}
                  >
                    ✅ Mark Resolved
                  </button>
                </div>
              </div>
            )}

            {/* AI Revenue Leakage & ICP Scoring Card */}
            {lead.aiAnalysis && (
              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.25)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-cyan)' }}>
                    Practo Opportunity Matrix
                  </span>
                  <span className="badge badge-emerald">Score: {lead.score}/100</span>
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '8px' }}>
                  {lead.aiAnalysis.valueProposition}
                </div>
                <div style={{ display: 'flex', gap: '12px', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                  <span>No-shows: <strong style={{ color: 'var(--accent-amber)' }}>~{lead.aiAnalysis.monthlyNoShows}/mo</strong></span>
                  <span>Est Loss: <strong style={{ color: 'var(--accent-rose)' }}>₹{(lead.aiAnalysis.annualRevenueLoss / 100000).toFixed(1)}L/yr</strong></span>
                </div>
              </div>
            )}

            {/* Owner & Decision Maker Contact Information */}
            <div style={{ background: 'rgba(6,182,212,0.04)', border: '1px solid rgba(6,182,212,0.15)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent-cyan)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                👤 Owner & Key Decision Maker
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Name: </span>
                  <strong style={{ color: 'var(--text-primary)' }}>{lead.ownerName || lead.name}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Phone: </span>
                  <strong style={{ color: '#34D399' }}>{lead.ownerPhone || lead.phone || 'N/A'}</strong>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Email: </span>
                  <span style={{ color: 'var(--accent-cyan)' }}>{lead.ownerEmail || lead.email || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Marketing Contact Details */}
            <div style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 'var(--radius-md)', padding: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#818CF8', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📢 Marketing / Operations Contact
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Contact: </span>
                  <strong style={{ color: 'var(--text-primary)' }}>{lead.marketingPersonName || 'Reception Desk'}</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Phone: </span>
                  <strong style={{ color: 'var(--text-primary)' }}>{lead.marketingPersonPhone || lead.phone || 'N/A'}</strong>
                </div>
              </div>
            </div>

            {/* Contact & Clinic Meta */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Clinic Details & Configuration
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12.5px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Clinic Phone: </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lead.phone || 'N/A'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Email: </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lead.email || 'N/A'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Monthly Patients: </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lead.patientVolumeMonthly?.toLocaleString() || 1000}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Assigned Rep: </span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-cyan)' }}>{lead.assignedRep || 'Unassigned'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>EHR Software: </span>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lead.customFields?.currentEHR || 'Practo Pro'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Stage: </span>
                  <span className="badge badge-cyan">{lead.stage || 'New Lead'}</span>
                </div>
              </div>
            </div>

            {/* Add Note Form */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Add Activity / Meeting Note
              </div>
              <form onSubmit={handleAddNote}>
                <textarea
                  rows={2}
                  className="textarea-field"
                  placeholder="Type note or call summary here..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  style={{ marginBottom: '8px', fontSize: '12.5px' }}
                />
                <button type="submit" className="btn btn-secondary btn-sm" disabled={!noteText.trim()}>
                  Save Note
                </button>
              </form>
            </div>

            {/* Activity History Timeline */}
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>
                Activity & Outreach Timeline
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(lead.timeline || []).map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '10px',
                      background: 'var(--bg-input)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '3px solid var(--accent-primary)',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                      <strong style={{ color: 'var(--text-primary)' }}>{item.title}</strong>
                      <span style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>
                        {new Date(item.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {item.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* GDPR Anonymize Action for Auditors/Admin */}
            {hasPermission('manage_privacy') && (
              <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                <button onClick={handleAnonymize} className="btn btn-danger btn-sm" style={{ width: '100%' }}>
                  🛡️ Erase PII / Right to Be Forgotten (GDPR)
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Commercial Proposal Suite Modal */}
      {showProposal && lead && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            backdropFilter: 'blur(8px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setShowProposal(false)}
        >
          <div
            className="glass-panel"
            style={{
              width: '95vw',
              maxWidth: '1200px',
              height: '90vh',
              maxHeight: '900px',
              padding: '24px',
              overflowY: 'auto',
              background: 'var(--bg-card-solid)',
              border: '1px solid var(--border-glow)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge badge-cyan">Commercial Proposal</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{lead.name} ({lead.organization})</span>
              </div>
              <button onClick={() => setShowProposal(false)} className="btn btn-secondary btn-sm">✕ Close</button>
            </div>
            <ProposalSuite lead={lead} onClose={() => setShowProposal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
