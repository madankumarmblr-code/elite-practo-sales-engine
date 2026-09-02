import React, { useState, useMemo } from 'react';
import { useCrm } from '../context/CrmContext';
import { api } from '../services/api';
import { GEO_DATA, MEDICAL_SPECIALTIES } from '../data/geoData';

export function LeadModal({ lead, isOpen, onClose, onLeadSaved }) {
  const { addToast } = useCrm();
  const [formData, setFormData] = useState({
    name: lead?.name || '',
    organization: lead?.organization || '',
    specialty: lead?.specialty || 'Cardiology',
    city: lead?.city || 'Bangalore',
    zone: lead?.zone || 'BTM Layout',
    email: lead?.email || '',
    phone: lead?.phone || '',
    patientVolumeMonthly: lead?.patientVolumeMonthly || 1200,
    assignedRep: lead?.assignedRep || 'Priya Sharma',
    notes: lead?.notes || '',
  });
  const [submitting, setSubmitting] = useState(false);

  const availableZones = useMemo(() => {
    const matched = GEO_DATA.find((g) => g.city.toLowerCase() === formData.city.toLowerCase());
    return matched ? matched.zones || [] : [];
  }, [formData.city]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.organization.trim()) {
      addToast('Doctor Name and Clinic Organization are required', 'error');
      return;
    }

    try {
      setSubmitting(true);
      if (lead) {
        const updated = await api.updateLead(lead.id, formData);
        addToast('Lead updated successfully', 'success');
        if (onLeadSaved) onLeadSaved(updated);
      } else {
        const created = await api.createLead(formData);
        addToast('New lead registered successfully', 'success');
        if (onLeadSaved) onLeadSaved(created);
      }
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to save lead', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 95,
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-card-solid)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-card)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '18px 24px',
            background: 'var(--bg-input)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
            {lead ? 'Edit Lead' : 'Register Doctor / Clinic Lead'}
          </h3>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label className="input-label">Practitioner / Doctor Name *</label>
            <input type="text" required className="input-field" placeholder="e.g. Dr. Aarav Mehta" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
          </div>

          <div>
            <label className="input-label">Clinic / Hospital Organization *</label>
            <input type="text" required className="input-field" placeholder="e.g. Mehta Multispecialty Clinic" value={formData.organization} onChange={(e) => setFormData({ ...formData, organization: e.target.value })} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="input-label">Medical Specialty</label>
              <select className="select-field" value={formData.specialty} onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}>
                {MEDICAL_SPECIALTIES.filter((s) => s !== 'All Specialties').map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label">City</label>
              <select
                className="select-field"
                value={formData.city}
                onChange={(e) => {
                  const c = e.target.value;
                  const matched = GEO_DATA.find((g) => g.city.toLowerCase() === c.toLowerCase());
                  setFormData({
                    ...formData,
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
          </div>

          <div>
            <label className="input-label">Zone</label>
            <select className="select-field" value={formData.zone} onChange={(e) => setFormData({ ...formData, zone: e.target.value })}>
              {availableZones.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="input-label">Phone Number</label>
              <input type="text" className="input-field" placeholder="+91 98200 00000" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            </div>
            <div>
              <label className="input-label">Email Address</label>
              <input type="email" className="input-field" placeholder="doctor@clinic.in" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label className="input-label">Monthly OPD Volume</label>
              <input type="number" className="input-field" placeholder="1200" value={formData.patientVolumeMonthly} onChange={(e) => setFormData({ ...formData, patientVolumeMonthly: parseInt(e.target.value, 10) || 0 })} />
            </div>
            <div>
              <label className="input-label">Assigned Representative</label>
              <select className="select-field" value={formData.assignedRep} onChange={(e) => setFormData({ ...formData, assignedRep: e.target.value })}>
                <option value="Priya Sharma">Priya Sharma</option>
                <option value="Rahul Kapoor">Rahul Kapoor</option>
                <option value="Ananya Roy">Ananya Roy</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">Cancel</button>
            <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
              {submitting ? 'Saving...' : lead ? 'Save Changes' : 'Register Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
