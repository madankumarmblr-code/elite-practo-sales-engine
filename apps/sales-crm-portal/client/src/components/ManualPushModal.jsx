import React, { useState } from 'react';
import { useCrm } from '../context/CrmContext';
import { api } from '../services/api';
import { GEO_DATA, MEDICAL_SPECIALTIES } from '../data/geoData';

export default function ManualPushModal({ onClose, onLeadCreated }) {
  const { addToast, setVoiceDialerLead, setPitchLead } = useCrm();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    organization: '',
    city: 'Bangalore',
    zone: 'Indiranagar',
    specialty: 'General Dentistry',
    email: '',
    product: 'Practo Prime',
    patientVolumeMonthly: 1400,
    notes: '',
  });

  const [loadingAction, setLoadingAction] = useState(null); // 'voice' | 'whatsapp' | 'email' | 'autopilot' | 'escalate'

  const availableZones = GEO_DATA.find((g) => g.city.toLowerCase() === form.city.toLowerCase())?.zones || ['Central Zone'];

  const validate = () => {
    if (!form.name.trim()) {
      addToast('Doctor / Contact name is required', 'error');
      return false;
    }
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) {
      addToast('Please enter a valid 10-digit mobile number', 'error');
      return false;
    }
    return true;
  };

  const createLeadRecord = async () => {
    const cleanPhone = form.phone.trim().startsWith('+') ? form.phone.trim() : (form.phone.startsWith('91') ? `+${form.phone}` : `+91 ${form.phone}`);
    const created = await api.createLead({
      name: form.name.startsWith('Dr.') ? form.name : `Dr. ${form.name}`,
      organization: form.organization || `${form.name}'s Clinic`,
      specialty: form.specialty,
      city: form.city,
      zone: form.zone,
      address: `${form.zone}, ${form.city} (Manually Added)`,
      phone: cleanPhone,
      email: form.email || `contact@${form.name.toLowerCase().replace(/[^a-z]/g, '') || 'clinic'}.in`,
      ownerName: form.name,
      ownerPhone: cleanPhone,
      ownerEmail: form.email,
      patientVolumeMonthly: Number(form.patientVolumeMonthly) || 1200,
      assignedRep: 'Ananya Roy',
      notes: `Manually Added Lead. Pitch Product: ${form.product}. Notes: ${form.notes || 'None'}`,
    });
    if (onLeadCreated) onLeadCreated(created);
    return created;
  };

  // Push Action 1: Direct Voice AI Call
  const handlePushVoiceCall = async () => {
    if (!validate()) return;
    try {
      setLoadingAction('voice');
      const lead = await createLeadRecord();
      addToast(`Lead saved! Launching Sarvam AI Voice Dialer for ${lead.name}`, 'success');
      onClose();
      setVoiceDialerLead(lead);
    } catch (err) {
      addToast(err.message || 'Failed to trigger voice call', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // Push Action 2: Direct WhatsApp AI Pitch
  const handlePushWhatsApp = async () => {
    if (!validate()) return;
    try {
      setLoadingAction('whatsapp');
      const lead = await createLeadRecord();
      const res = await api.executeChannelStep({
        leadId: lead.id,
        channel: 'whatsapp',
        product: form.product,
      });
      addToast(`WhatsApp ROI Card delivered to ${lead.phone}!`, 'success');
      onClose();
      setPitchLead(lead);
    } catch (err) {
      addToast(err.message || 'Failed to send WhatsApp pitch', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // Push Action 3: Direct Proposal Email
  const handlePushEmail = async () => {
    if (!validate()) return;
    try {
      setLoadingAction('email');
      const lead = await createLeadRecord();
      const res = await api.executeChannelStep({
        leadId: lead.id,
        channel: 'email',
        product: form.product,
      });
      addToast(`Executive proposal email dispatched to ${lead.email}!`, 'success');
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to send proposal email', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // Push Action 4: Autonomous Auto-Pilot
  const handlePushAutoPilot = async () => {
    if (!validate()) return;
    try {
      setLoadingAction('autopilot');
      const lead = await createLeadRecord();
      const res = await api.assignAutoPilot([lead.id], form.product, 'Ananya Roy');
      addToast(`🚀 Autonomous AI Pilot launched for ${lead.name} (${form.product})`, 'success');
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to push to auto-pilot', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  // Push Action 5: Field Sales Escalation
  const handlePushEscalate = async () => {
    if (!validate()) return;
    try {
      setLoadingAction('escalate');
      const lead = await createLeadRecord();
      const res = await api.escalateLeadToHuman({
        leadId: lead.id,
        reason: form.notes || 'Manually routed to Field Sales AE for customized clinic discussion.',
        repName: 'Ananya Roy',
        recommendedAction: `Call Dr. ${form.name} at ${form.phone} to present ${form.product} commercial proposal.`,
      });
      addToast(`🚨 Lead escalated and assigned to Field AE Ananya Roy`, 'success');
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to escalate lead', 'error');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '28px',
          maxWidth: '560px',
          width: '100%',
          border: '1px solid #E2E8F0',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="badge badge-navy">Direct Entry & Instant AI Outreach</span>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '4px 0 0 0' }}>
              ⚡ Manual Number & Lead Push
            </h3>
            <p style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>
              Add custom doctor details and trigger Voice AI, WhatsApp, Email, Auto-Pilot, or Field Escalation immediately.
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94A3B8' }}>✕</button>
        </div>

        {/* Input Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div style={{ gridColumn: 'span 1' }}>
            <label className="input-label">Doctor Name *</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Dr. Rajesh Khanna"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div style={{ gridColumn: 'span 1' }}>
            <label className="input-label">Mobile Number *</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. 9845012345 or +91..."
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label className="input-label">Clinic / Hospital Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Khanna Dental Care & Aesthetic Centre"
              value={form.organization}
              onChange={(e) => setForm({ ...form, organization: e.target.value })}
            />
          </div>

          <div>
            <label className="input-label">Medical Specialty</label>
            <select
              className="select-field"
              value={form.specialty}
              onChange={(e) => setForm({ ...form, specialty: e.target.value })}
            >
              {MEDICAL_SPECIALTIES.filter((s) => s !== 'All Specialties').map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">Pitch Product</label>
            <select
              className="select-field"
              value={form.product}
              onChange={(e) => setForm({ ...form, product: e.target.value })}
            >
              <option value="Practo Prime">Practo Prime Supreme</option>
              <option value="Practo Reach">Practo Reach Spotlight</option>
            </select>
          </div>

          <div>
            <label className="input-label">City</label>
            <select
              className="select-field"
              value={form.city}
              onChange={(e) => {
                const c = e.target.value;
                const matched = GEO_DATA.find((g) => g.city.toLowerCase() === c.toLowerCase());
                setForm({ ...form, city: c, zone: matched?.zones?.[0] || 'Central Zone' });
              }}
            >
              {GEO_DATA.map((g) => (
                <option key={g.city} value={g.city}>{g.city}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">Zone / Locality</label>
            <select
              className="select-field"
              value={form.zone}
              onChange={(e) => setForm({ ...form, zone: e.target.value })}
            >
              {availableZones.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label className="input-label">Doctor Email (Optional for proposal dispatch)</label>
            <input
              type="email"
              className="input-field"
              placeholder="e.g. dr.rajesh@khannadental.in"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div style={{ gridColumn: 'span 2' }}>
            <label className="input-label">Special Notes / Objections / Custom Pitch</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. High volume implant practice. Wants multi-chair pricing discussion."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        {/* 1-Click Instant Action Buttons */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: '#233876', marginBottom: '10px' }}>
            ⚡ Select Instant AI Push Destination:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <button
              onClick={handlePushVoiceCall}
              disabled={loadingAction !== null}
              className="btn btn-emerald btn-sm"
              style={{ padding: '8px', justifyContent: 'center' }}
            >
              {loadingAction === 'voice' ? 'Dialing...' : '🎙️ Direct AI Voice Call'}
            </button>

            <button
              onClick={handlePushWhatsApp}
              disabled={loadingAction !== null}
              className="btn btn-cyan btn-sm"
              style={{ padding: '8px', justifyContent: 'center' }}
            >
              {loadingAction === 'whatsapp' ? 'Sending...' : '💬 Direct WhatsApp Pitch'}
            </button>

            <button
              onClick={handlePushEmail}
              disabled={loadingAction !== null}
              className="btn btn-secondary btn-sm"
              style={{ padding: '8px', justifyContent: 'center', border: '1px solid #4F46E5', color: '#4F46E5' }}
            >
              {loadingAction === 'email' ? 'Dispatching...' : '📧 Direct Proposal Email'}
            </button>

            <button
              onClick={handlePushEscalate}
              disabled={loadingAction !== null}
              className="btn btn-danger btn-sm"
              style={{ padding: '8px', justifyContent: 'center' }}
            >
              {loadingAction === 'escalate' ? 'Escalating...' : '🚨 Field Rep Handoff'}
            </button>
          </div>

          <button
            onClick={handlePushAutoPilot}
            disabled={loadingAction !== null}
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px', justifyContent: 'center', fontSize: '13px' }}
          >
            {loadingAction === 'autopilot' ? 'Launching Auto-Pilot...' : `🚀 Launch Full Autonomous AI Pilot (Voice → WA → Email)`}
          </button>
        </div>
      </div>
    </div>
  );
}
