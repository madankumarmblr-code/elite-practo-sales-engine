import React, { useState, useEffect, useMemo } from 'react';
import { useCrm } from '../context/CrmContext';
import { api } from '../services/api';
import { GEO_DATA, MEDICAL_SPECIALTIES } from '../data/geoData';

export default function AiPilot() {
  const { setPitchLead, setVoiceDialerLead, addToast, setIsManualPushOpen } = useCrm();
  const [leads, setLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [activeTab, setActiveTab] = useState('autopilot'); // 'autopilot' | 'voice' | 'whatsapp' | 'email' | 'escalations'

  // Hunting & Discovery states
  const [hunting, setHunting] = useState(false);
  const [huntParams, setHuntParams] = useState({
    specialty: 'General Dentistry',
    city: 'Bangalore',
    zone: 'BTM Layout',
    count: 2,
  });
  const [pitchResult, setPitchResult] = useState(null);
  const [generatingPitch, setGeneratingPitch] = useState(false);

  // Auto-discovery states
  const [discoveredClinics, setDiscoveredClinics] = useState([]);
  const [searchingClinics, setSearchingClinics] = useState(false);
  const [selectedClinicIds, setSelectedClinicIds] = useState(new Set());
  const [autoPilotProduct, setAutoPilotProduct] = useState('Practo Prime');
  const [launchingPilot, setLaunchingPilot] = useState(false);

  // Single step execution states
  const [executingChannel, setExecutingChannel] = useState(false);
  const [channelExecutionResult, setChannelExecutionResult] = useState(null);

  // Escalations
  const [escalatedLeads, setEscalatedLeads] = useState([]);
  const [resolvingLead, setResolvingLead] = useState(null);
  const [resolveForm, setResolveForm] = useState({ newStage: 'Demo Scheduled', notes: '' });

  // Dynamic Zones
  const availableZones = useMemo(() => {
    const matched = GEO_DATA.find((g) => g.city.toLowerCase() === huntParams.city.toLowerCase());
    return matched ? matched.zones || [] : [];
  }, [huntParams.city]);

  const fetchLeadsAndEscalations = async () => {
    try {
      const data = await api.getLeads();
      const allLeads = data.leads || [];
      setLeads(allLeads);
      if (allLeads.length > 0 && !selectedLeadId) setSelectedLeadId(allLeads[0].id);

      const esc = allLeads.filter((l) => l.needsHumanIntervention === true || l.stage === 'Needs Human Intervention' || l.status === 'Needs Human Intervention');
      setEscalatedLeads(esc);
    } catch (err) {
      addToast('Failed to load CRM leads', 'error');
    }
  };

  useEffect(() => {
    fetchLeadsAndEscalations();
  }, []);

  // Auto-search clinics when hunt params change
  useEffect(() => {
    searchClinics();
  }, [huntParams.city, huntParams.zone, huntParams.specialty]);

  const searchClinics = async () => {
    try {
      setSearchingClinics(true);
      const data = await api.searchClinics({
        city: huntParams.city,
        zone: huntParams.zone,
        specialty: huntParams.specialty,
      });
      setDiscoveredClinics(data.clinics || []);
      setSelectedClinicIds(new Set());
    } catch (err) {
      console.warn('Clinic search:', err);
    } finally {
      setSearchingClinics(false);
    }
  };

  const handleGeneratePitch = async (leadId) => {
    try {
      setGeneratingPitch(true);
      const res = await api.generatePitch(leadId);
      setPitchResult(res);
    } catch (err) {
      addToast(err.message || 'Failed to generate pitch', 'error');
    } finally {
      setGeneratingPitch(false);
    }
  };

  useEffect(() => {
    if (selectedLeadId) handleGeneratePitch(selectedLeadId);
  }, [selectedLeadId]);

  const selectedLead = leads.find((l) => l.id === selectedLeadId) || leads[0];

  const toggleClinicSelect = (id) => {
    setSelectedClinicIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Launch Full Autonomous Auto AI Pilot
  const handleLaunchAutoPilot = async () => {
    if (selectedClinicIds.size === 0) {
      addToast('Select at least one clinic first', 'error');
      return;
    }
    setLaunchingPilot(true);
    try {
      const createdLeadIds = [];
      for (const clinicId of selectedClinicIds) {
        const clinic = discoveredClinics.find((c) => c.id === clinicId);
        if (!clinic) continue;
        const created = await api.createLead({
          name: clinic.name,
          organization: clinic.org,
          specialty: clinic.specialty,
          city: clinic.city,
          zone: clinic.zone,
          address: clinic.address,
          email: clinic.email,
          phone: clinic.phone,
          ownerName: clinic.ownerName || clinic.name,
          ownerPhone: clinic.ownerPhone || clinic.phone,
          ownerEmail: clinic.ownerEmail || clinic.email,
          marketingPersonName: clinic.marketingPersonName || 'Priya Shenoy',
          marketingPersonPhone: clinic.marketingPersonPhone || clinic.phone,
          patientVolumeMonthly: clinic.patientVolumeMonthly || 1200,
          onPracto: clinic.onPracto,
          practoRating: clinic.practoRating,
          assignedRep: 'Ananya Roy',
          notes: `Multi-source verified lead. Sources: ${clinic.sources?.join(', ') || 'GMB'}. Product: ${autoPilotProduct}.`,
        });
        if (created?.id) createdLeadIds.push(created.id);
      }
      if (createdLeadIds.length > 0) {
        const res = await api.assignAutoPilot(createdLeadIds, autoPilotProduct, 'Ananya Roy');
        addToast(res.message || `Autonomous AI Pilot launched for ${createdLeadIds.length} clinics`, 'success');
      }
      await fetchLeadsAndEscalations();
      setSelectedClinicIds(new Set());
    } catch (err) {
      addToast(err.message || 'Auto-Pilot launch failed', 'error');
    } finally {
      setLaunchingPilot(false);
    }
  };

  // Execute single channel step
  const handleExecuteChannel = async (channel) => {
    if (!selectedLead) return;
    try {
      setExecutingChannel(true);
      const res = await api.executeChannelStep({
        leadId: selectedLead.id,
        channel,
        product: autoPilotProduct,
        repName: selectedLead.assignedRep || 'Ananya Roy',
      });
      setChannelExecutionResult(res);
      addToast(`AI ${channel.toUpperCase()} executed for ${selectedLead.name}!`, 'success');
      await fetchLeadsAndEscalations();
    } catch (err) {
      addToast(err.message || `Failed to execute ${channel}`, 'error');
    } finally {
      setExecutingChannel(false);
    }
  };

  // Resolve Human Escalation
  const handleResolveEscalation = async () => {
    if (!resolvingLead) return;
    try {
      const res = await api.resolveEscalation({
        leadId: resolvingLead.id,
        newStage: resolveForm.newStage,
        fieldNotes: resolveForm.notes,
        outcome: 'resolved',
      });
      addToast(`Escalation resolved! Lead moved to ${resolveForm.newStage}`, 'success');
      setResolvingLead(null);
      setResolveForm({ newStage: 'Demo Scheduled', notes: '' });
      await fetchLeadsAndEscalations();
    } catch (err) {
      addToast(err.message || 'Failed to resolve escalation', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '24px',
          background: 'linear-gradient(135deg, rgba(35, 56, 118, 0.08) 0%, rgba(6, 182, 212, 0.1) 100%)',
          border: '1px solid var(--border-glow)',
          borderRadius: 'var(--radius-lg)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span className="badge badge-navy">Autonomous AI Sales Pilot</span>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Voice AI • WhatsApp AI • Mail Pitch AI • Human Field Escalation</span>
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              AI Pilot & Autonomous Outreach Engine
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
              Multi-source discovery $\rightarrow$ AI Voice Call $\rightarrow$ WhatsApp ROI Card $\rightarrow$ Executive Proposal Email $\rightarrow$ Automated Human Field Escalation.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setIsManualPushOpen(true)}
              className="btn btn-primary"
              style={{
                padding: '10px 16px',
                fontSize: '12.5px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #233876, #0284C7)',
                boxShadow: '0 2px 8px rgba(35, 56, 118, 0.25)',
              }}
            >
              ⚡ + Quick Manual Push
            </button>
            <div style={{ padding: '8px 14px', background: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>{leads.length}</div>
              <div style={{ fontSize: '10.5px', color: '#64748B', fontWeight: 600 }}>Active Leads</div>
            </div>
            <div style={{ padding: '8px 14px', background: escalatedLeads.length > 0 ? '#FEF2F2' : '#FFFFFF', border: escalatedLeads.length > 0 ? '1px solid #FCA5A5' : '1px solid #CBD5E1', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: 800, color: escalatedLeads.length > 0 ? '#DC2626' : '#64748B' }}>
                {escalatedLeads.length}
              </div>
              <div style={{ fontSize: '10.5px', color: escalatedLeads.length > 0 ? '#B91C1C' : '#64748B', fontWeight: 700 }}>
                🚨 Field Escalations
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '18px', flexWrap: 'wrap', borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '14px' }}>
          {[
            { id: 'autopilot', icon: '🤖', label: 'Autonomous AI Auto-Pilot' },
            { id: 'voice', icon: '📞', label: 'Voice Calling AI (Sarvam)' },
            { id: 'whatsapp', icon: '💬', label: 'WhatsApp AI (Meta Cloud)' },
            { id: 'email', icon: '📧', label: 'Mail Pitch AI (Proposals)' },
            { id: 'escalations', icon: '🚨', label: `Human Escalation Hub (${escalatedLeads.length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                background: activeTab === tab.id ? '#233876' : '#FFFFFF',
                color: activeTab === tab.id ? '#FFFFFF' : '#334155',
                border: activeTab === tab.id ? '1px solid #233876' : '1px solid #CBD5E1',
                boxShadow: activeTab === tab.id ? '0 2px 6px rgba(35,56,118,0.2)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.id === 'escalations' && escalatedLeads.length > 0 && (
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', display: 'inline-block' }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB 1: AUTONOMOUS AI AUTO-PILOT ───────────────────────────────── */}
      {activeTab === 'autopilot' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Discovery & Hunt Controls */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#06B6D4', boxShadow: '0 0 8px #06B6D4' }} />
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Multi-Source Clinic Discovery & Auto-Pilot Dispatcher
                </h3>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Commercial Pitch:</label>
                <select
                  className="select-field"
                  value={autoPilotProduct}
                  onChange={(e) => setAutoPilotProduct(e.target.value)}
                  style={{ width: '160px', padding: '4px 8px', fontSize: '12px' }}
                >
                  <option value="Practo Prime">Practo Prime Supreme</option>
                  <option value="Practo Reach">Practo Reach Spotlight</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label className="input-label">Specialty</label>
                <select
                  className="select-field"
                  value={huntParams.specialty}
                  onChange={(e) => setHuntParams({ ...huntParams, specialty: e.target.value })}
                >
                  {MEDICAL_SPECIALTIES.filter((s) => s !== 'All Specialties').map((spec) => (
                    <option key={spec} value={spec}>{spec}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label">City</label>
                <select
                  className="select-field"
                  value={huntParams.city}
                  onChange={(e) => {
                    const c = e.target.value;
                    const matched = GEO_DATA.find((g) => g.city.toLowerCase() === c.toLowerCase());
                    setHuntParams({
                      ...huntParams,
                      city: c,
                      zone: matched?.zones?.[0] || 'Central Zone',
                    });
                  }}
                >
                  {GEO_DATA.map((g) => (
                    <option key={g.city} value={g.city}>{g.city}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label">Zone</label>
                <select
                  className="select-field"
                  value={huntParams.zone}
                  onChange={(e) => setHuntParams({ ...huntParams, zone: e.target.value })}
                >
                  {availableZones.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Discovered Clinics Table */}
            {searchingClinics ? (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Scanning live Practo directory and Google Places...
              </div>
            ) : discoveredClinics.length > 0 ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Found <strong>{discoveredClinics.length}</strong> verified practices in {huntParams.city} • {huntParams.zone}
                  </span>
                  <button
                    onClick={handleLaunchAutoPilot}
                    disabled={selectedClinicIds.size === 0 || launchingPilot}
                    className="btn btn-primary btn-sm"
                  >
                    {launchingPilot ? 'Launching Auto-Pilot...' : `🚀 Launch Autonomous AI Pilot (${selectedClinicIds.size}) → ${autoPilotProduct}`}
                  </button>
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '36px' }}>
                          <input
                            type="checkbox"
                            checked={selectedClinicIds.size === discoveredClinics.length && discoveredClinics.length > 0}
                            onChange={() => {
                              if (selectedClinicIds.size === discoveredClinics.length) setSelectedClinicIds(new Set());
                              else setSelectedClinicIds(new Set(discoveredClinics.map((c) => c.id)));
                            }}
                          />
                        </th>
                        <th>Doctor & Practice</th>
                        <th>Location & GMB</th>
                        <th>Practo Status</th>
                        <th>Owner & Phone</th>
                        <th>GMB Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {discoveredClinics.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <input type="checkbox" checked={selectedClinicIds.has(c.id)} onChange={() => toggleClinicSelect(c.id)} />
                          </td>
                          <td>
                            <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{c.name}</div>
                            <div style={{ fontSize: '11.5px', color: '#233876', fontWeight: 600 }}>{c.org}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>{c.city} • {c.zone}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {c.address}
                            </div>
                          </td>
                          <td>
                            {c.onPracto
                              ? <span className="badge badge-emerald" style={{ fontSize: '10.5px' }}>✅ {c.practoRating}★ ({c.practoReviews || 150} rev)</span>
                              : <span className="badge badge-amber" style={{ fontSize: '10.5px' }}>❌ Not on Practo</span>}
                          </td>
                          <td>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>{c.ownerName || c.name}</div>
                            <div style={{ fontSize: '11.5px', color: '#0F172A', fontFamily: 'monospace' }}>{c.ownerPhone || c.phone}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#D97706' }}>⭐ {c.gmbRating || 4.8}</div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{c.gmbReviews || 120} Google rev</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Autonomous Sequence Diagram */}
                <div
                  style={{
                    marginTop: '16px',
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div style={{ fontSize: '11.5px', fontWeight: 800, textTransform: 'uppercase', color: '#233876', marginBottom: '10px' }}>
                    ⚡ Autonomous AI Sequence Workflow ({autoPilotProduct})
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', fontSize: '12px' }}>
                    <div style={{ padding: '10px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontWeight: 800, color: '#059669', marginBottom: '2px' }}>Step 1: 📞 Voice Calling AI</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Sarvam Voice AI SDR dials doctor reception, pitches ROI & no-show recovery.</div>
                    </div>
                    <div style={{ padding: '10px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontWeight: 800, color: '#0284C7', marginBottom: '2px' }}>Step 2: 💬 WhatsApp AI Card</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Meta Cloud API sends interactive ROI calculator & 1-tap quick reply buttons.</div>
                    </div>
                    <div style={{ padding: '10px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontWeight: 800, color: '#4F46E5', marginBottom: '2px' }}>Step 3: 📧 Mail Pitch AI</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>Formal commercial proposal email with pricing tier and digital agreement.</div>
                    </div>
                    <div style={{ padding: '10px', background: '#FFFFFF', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                      <div style={{ fontWeight: 800, color: '#D97706', marginBottom: '2px' }}>Step 4: 🚨 Human Escalation</div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>If doctor requests custom terms or senior rep, AI auto-routes to Field AE!</div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Select a City, Zone, and Specialty above to discover practices.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 2: VOICE CALLING AI ────────────────────────────────────────── */}
      {activeTab === 'voice' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '12px' }}>🎙️ Voice Calling AI (Sarvam Voice Agents)</h3>
            <label className="input-label">Select Target Practice</label>
            <select
              className="select-field"
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              style={{ marginBottom: '14px' }}
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.name} — {l.organization} ({l.city})</option>
              ))}
            </select>

            {selectedLead && (
              <div style={{ padding: '14px', borderRadius: 'var(--radius-md)', background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '14px' }}>
                <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '13px' }}>{selectedLead.name}</div>
                <div style={{ fontSize: '12px', color: '#233876', fontWeight: 600 }}>{selectedLead.organization} • {selectedLead.specialty}</div>
                <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>Target Phone: <strong>{selectedLead.phone}</strong></div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setVoiceDialerLead(selectedLead)}
                className="btn btn-emerald btn-sm"
                style={{ flex: 1 }}
              >
                🎙️ Open Voice Dialer Modal
              </button>
              <button
                onClick={() => handleExecuteChannel('voice')}
                disabled={executingChannel}
                className="btn btn-primary btn-sm"
                style={{ flex: 1 }}
              >
                {executingChannel ? 'Dialing AI...' : '🚀 Execute AI Call Step'}
              </button>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '12px' }}>Live Call Simulation & Audio Stream</h3>
            {pitchResult?.coldCallScript ? (
              <div
                style={{
                  background: '#0F172A',
                  color: '#38BDF8',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px',
                  fontFamily: 'monospace',
                  fontSize: '11.5px',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  maxHeight: '280px',
                  overflowY: 'auto',
                }}
              >
                {pitchResult.coldCallScript}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Loading script...</div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: WHATSAPP AI ────────────────────────────────────────────── */}
      {activeTab === 'whatsapp' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '12px' }}>💬 WhatsApp AI (Meta Cloud API)</h3>
            <label className="input-label">Select Target Practice</label>
            <select
              className="select-field"
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              style={{ marginBottom: '14px' }}
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.name} — {l.organization} ({l.city})</option>
              ))}
            </select>

            <button
              onClick={() => handleExecuteChannel('whatsapp')}
              disabled={executingChannel}
              className="btn btn-cyan btn-sm"
              style={{ width: '100%', marginBottom: '12px' }}
            >
              {executingChannel ? 'Delivering WhatsApp...' : '📱 Dispatch WhatsApp ROI Card'}
            </button>

            <button
              onClick={() => {
                if (pitchResult?.whatsappPitch) {
                  navigator.clipboard.writeText(pitchResult.whatsappPitch);
                  addToast('WhatsApp message copied to clipboard!', 'success');
                }
              }}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%' }}
            >
              📋 Copy WhatsApp Script
            </button>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '14.5px', fontWeight: 800 }}>📱 Meta WhatsApp Preview</h3>
              <span className="badge badge-emerald">Verified Template</span>
            </div>
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.06)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                fontSize: '12.5px',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5,
                color: '#0F172A',
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              {pitchResult?.whatsappPitch || 'Loading WhatsApp template...'}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: MAIL PITCH AI ──────────────────────────────────────────── */}
      {activeTab === 'email' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, marginBottom: '12px' }}>📧 Mail Pitch AI (Executive Proposal Engine)</h3>
            <label className="input-label">Select Target Practice</label>
            <select
              className="select-field"
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              style={{ marginBottom: '14px' }}
            >
              {leads.map((l) => (
                <option key={l.id} value={l.id}>{l.name} — {l.organization} ({l.city})</option>
              ))}
            </select>

            <button
              onClick={() => handleExecuteChannel('email')}
              disabled={executingChannel}
              className="btn btn-primary btn-sm"
              style={{ width: '100%', marginBottom: '12px' }}
            >
              {executingChannel ? 'Sending Proposal...' : '📨 Dispatch Executive Proposal Email'}
            </button>

            <button
              onClick={() => {
                if (pitchResult?.emailPitch?.body) {
                  navigator.clipboard.writeText(pitchResult.emailPitch.body);
                  addToast('Proposal email body copied!', 'success');
                }
              }}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%' }}
            >
              📋 Copy Proposal Text
            </button>
          </div>

          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '14.5px', fontWeight: 800, marginBottom: '6px' }}>
              Subject: <span style={{ color: '#233876' }}>{pitchResult?.emailPitch?.subject || 'Commercial Proposal'}</span>
            </h3>
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                fontSize: '12px',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.6,
                color: '#334155',
                maxHeight: '300px',
                overflowY: 'auto',
              }}
            >
              {pitchResult?.emailPitch?.body || 'Loading email proposal...'}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: HUMAN ESCALATION & FIELD HANDOFF HUB ───────────────────── */}
      {activeTab === 'escalations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#EF4444', boxShadow: '0 0 10px #EF4444' }} />
                  <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Human Escalation & Field Sales Handoff Hub
                  </h2>
                  <span className="badge badge-rose">{escalatedLeads.length} Action Items</span>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  These practices completed the automated AI steps (Voice + WhatsApp + Email) and triggered a high-value objection or explicit request for a Senior Field Sales Executive.
                </p>
              </div>

              <button
                onClick={fetchLeadsAndEscalations}
                className="btn btn-secondary btn-sm"
              >
                🔄 Refresh Queue
              </button>
            </div>

            {escalatedLeads.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎉</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A' }}>No Pending Human Escalations</div>
                <p style={{ fontSize: '12px', color: '#64748B', maxWidth: '400px', margin: '6px auto 0' }}>
                  All active outreach is flowing smoothly through the autonomous AI Pilot pipeline without blockers.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
                {escalatedLeads.map((lead) => (
                  <div
                    key={lead.id}
                    style={{
                      background: '#FFFFFF',
                      border: '1.5px solid #FCA5A5',
                      borderRadius: '12px',
                      padding: '18px',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '14px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>{lead.name}</div>
                          <div style={{ fontSize: '12px', color: '#233876', fontWeight: 700 }}>{lead.organization} ({lead.specialty})</div>
                          <div style={{ fontSize: '11.5px', color: '#64748B' }}>{lead.city} • {lead.zone}</div>
                        </div>
                        <span className="badge badge-rose" style={{ fontSize: '11px' }}>🚨 Needs Human AE</span>
                      </div>

                      {/* Escalation Details */}
                      <div style={{ padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FEE2E2', borderRadius: '8px', marginBottom: '10px' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#B91C1C', marginBottom: '3px' }}>
                          ⚡ AI Escalation Trigger:
                        </div>
                        <div style={{ fontSize: '12px', color: '#7F1D1D', fontWeight: 600 }}>
                          {lead.escalationDetails?.reason || 'Doctor requested customized pricing discussion with human account executive.'}
                        </div>
                      </div>

                      {/* Battlecard */}
                      <div style={{ padding: '10px 12px', background: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: '8px' }}>
                        <div style={{ fontSize: '10.5px', fontWeight: 800, textTransform: 'uppercase', color: '#15803D', marginBottom: '3px' }}>
                          📝 Recommended Rep Action Plan:
                        </div>
                        <div style={{ fontSize: '11.5px', color: '#14532D' }}>
                          {lead.escalationDetails?.recommendedAction || `Call Dr. ${lead.name.replace('Dr. ', '')} directly at ${lead.phone}. Provide on-site demo.`}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '12px' }}>
                      <button
                        onClick={() => setVoiceDialerLead(lead)}
                        className="btn btn-emerald btn-sm"
                        style={{ flex: 1, fontSize: '11px' }}
                      >
                        📞 Field Dial
                      </button>
                      <button
                        onClick={() => setPitchLead(lead)}
                        className="btn btn-cyan btn-sm"
                        style={{ flex: 1, fontSize: '11px' }}
                      >
                        💬 WhatsApp AE
                      </button>
                      <button
                        onClick={() => {
                          setResolvingLead(lead);
                          setResolveForm({ newStage: 'Demo Scheduled', notes: '' });
                        }}
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1.2, fontSize: '11px' }}
                      >
                        ✅ Resolve & Close
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RESOLVE ESCALATION MODAL ──────────────────────────────────────── */}
      {resolvingLead && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', padding: '28px', maxWidth: '480px', width: '100%', margin: '0 16px', border: '1px solid #E2E8F0', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>Resolve Field Escalation</h3>
                <p style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>
                  {resolvingLead.name} — {resolvingLead.organization}
                </p>
              </div>
              <button onClick={() => setResolvingLead(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94A3B8' }}>✕</button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="input-label">Update Deal Stage</label>
              <select
                className="select-field"
                value={resolveForm.newStage}
                onChange={(e) => setResolveForm({ ...resolveForm, newStage: e.target.value })}
              >
                <option value="Demo Scheduled">Demo Scheduled (Meeting Booked)</option>
                <option value="Proposal Sent">Proposal Sent (Custom Terms Accepted)</option>
                <option value="Negotiation">Negotiation (Final Review)</option>
                <option value="Closed Won">Closed Won (Deal Signed 🎉)</option>
                <option value="Contacted">Return to AI Sequence</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="input-label">Field Consultation Notes</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Spoke with Dr. regarding multi-branch terms. Agreed on Practo Prime Supreme with quarterly billing..."
                value={resolveForm.notes}
                onChange={(e) => setResolveForm({ ...resolveForm, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setResolvingLead(null)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
              <button onClick={handleResolveEscalation} className="btn btn-primary" style={{ flex: 2 }}>
                Confirm & Update CRM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
