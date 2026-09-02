import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useCrm } from '../context/CrmContext';
import { api } from '../services/api';
import { GEO_DATA } from '../data/geoData';
import { PRACTO_SPECIALTIES } from '../data/specialties';

// ─── Assign to CRM Modal ────────────────────────────────────────────────────
function AssignToCrmModal({ clinics, onClose, onConfirm }) {
  const [product, setProduct] = useState('Practo Prime');
  const [variant, setVariant] = useState('supreme');
  const [mode, setMode] = useState('autopilot'); // 'autopilot' | 'manual'
  const [assigning, setAssigning] = useState(false);

  const handleConfirm = async () => {
    setAssigning(true);
    await onConfirm({ product, variant, mode });
    setAssigning(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
      <div style={{ background: 'var(--bg-panel)', borderRadius: '20px', padding: '32px', maxWidth: '520px', width: '100%', margin: '0 16px', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Assign to CRM</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {clinics.length} clinic{clinics.length !== 1 ? 's' : ''} selected
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Product */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '10px' }}>Pitch Product</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { id: 'Practo Prime', icon: '⭐', label: 'Practo Prime', desc: 'Appointment Technology' },
              { id: 'Practo Reach', icon: '📍', label: 'Practo Reach', desc: 'Visibility Campaigns' },
            ].map((p) => (
              <button key={p.id} onClick={() => setProduct(p.id)} style={{
                padding: '14px', borderRadius: '12px', border: `2px solid ${product === p.id ? '#6366F1' : 'var(--border-subtle)'}`,
                background: product === p.id ? 'rgba(99,102,241,0.08)' : 'var(--bg-muted)',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s',
              }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>{p.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>{p.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Variant (Prime only) */}
        {product === 'Practo Prime' && (
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '10px' }}>Prime Variant</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { id: 'supreme', label: 'Prime Supreme', desc: 'Call + Book charges' },
                { id: 'ai', label: 'Prime AI', desc: 'PFC (per connection)' },
              ].map((v) => (
                <button key={v.id} onClick={() => setVariant(v.id)} style={{
                  padding: '12px', borderRadius: '10px', border: `2px solid ${variant === v.id ? '#06B6D4' : 'var(--border-subtle)'}`,
                  background: variant === v.id ? 'rgba(6,182,212,0.08)' : 'var(--bg-muted)',
                  cursor: 'pointer', textAlign: 'left',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{v.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{v.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mode */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '10px' }}>Assignment Mode</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {[
              { id: 'autopilot', icon: '🤖', label: 'Auto-Pilot', desc: 'AI handles everything' },
              { id: 'manual', icon: '📞', label: 'Manual Dialing', desc: 'Human rep dials' },
            ].map((m) => (
              <button key={m.id} onClick={() => setMode(m.id)} style={{
                padding: '14px', borderRadius: '12px', border: `2px solid ${mode === m.id ? '#10B981' : 'var(--border-subtle)'}`,
                background: mode === m.id ? 'rgba(16,185,129,0.08)' : 'var(--bg-muted)',
                cursor: 'pointer', textAlign: 'left',
              }}>
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>{m.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>{m.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {mode === 'autopilot' && (
          <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', marginBottom: '20px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Auto-Pilot Sequence:</strong> AI Voice Call → WhatsApp (if no answer) → Email Pitch → Follow-up
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
          <button onClick={handleConfirm} disabled={assigning} className="btn btn-primary" style={{ flex: 2 }}>
            {assigning ? 'Assigning...' : `🚀 Assign ${clinics.length} Lead${clinics.length !== 1 ? 's' : ''} to ${mode === 'autopilot' ? 'Auto-Pilot' : 'Manual Queue'}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Import CSV Modal ──────────────────────────────────────────────────────
function ImportLeadsModal({ onClose, onImport }) {
  const fileRef = useRef();
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [pushToAutoPilot, setPushToAutoPilot] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState('Practo Prime');
  const [parsedRows, setParsedRows] = useState([]);

  const handleFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const rows = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/"/g, ''));
        return headers.reduce((obj, h, i) => { obj[h] = cols[i] || ''; return obj; }, {});
      }).filter(r => r.name || r.organization);
      setParsedRows(rows);
    } catch (err) {
      console.error('CSV parse error:', err);
    }
  };

  const handleExecuteImport = async () => {
    if (!parsedRows.length) return;
    setImporting(true);
    try {
      await onImport(parsedRows, pushToAutoPilot, selectedProduct);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const header = 'name,organization,specialty,city,zone,phone,email,ownerName,ownerPhone,ownerEmail,marketingPersonName,marketingPersonPhone,patientVolumeMonthly,onPracto\n';
    const sample = 'Dr. Rajesh Verma,Verma Heart Clinic,Cardiologist,Bangalore,BTM Layout,+91 98450 11099,rajesh@vermaheart.in,Dr. Rajesh Verma,+91 98450 11099,dr.rajesh@vermaheart.in,Priya Shenoy,+91 80 4112 9988,1800,true\n';
    const blob = new Blob([header + sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'practo_leads_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)' }}>
      <div style={{ background: 'var(--bg-panel)', borderRadius: '20px', padding: '32px', maxWidth: '520px', width: '100%', margin: '0 16px', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Import Leads & Auto-Pilot Push</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Upload CSV for automated CRM ingestion & AI sequence</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-muted)' }}>✕</button>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? '#6366F1' : 'var(--border-subtle)'}`,
            borderRadius: '14px', padding: '36px 24px', textAlign: 'center', cursor: 'pointer',
            background: isDragging ? 'rgba(99,102,241,0.06)' : 'var(--bg-muted)',
            transition: 'all 0.2s', marginBottom: '16px',
          }}
        >
          <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>📄</div>
          {fileName ? (
            <div>
              <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{fileName}</div>
              <div style={{ fontSize: '12px', color: '#10B981', marginTop: '4px' }}>✓ {parsedRows.length} valid doctor leads parsed</div>
            </div>
          ) : (
            <>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>Drop CSV file here or click to browse</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Supports Doctor, Clinic, Owner & Marketing contacts</div>
            </>
          )}
        </div>

        {/* Auto-Pilot Trigger Controls */}
        <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <input
              type="checkbox"
              id="chk-auto-push"
              checked={pushToAutoPilot}
              onChange={(e) => setPushToAutoPilot(e.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            <label htmlFor="chk-auto-push" style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', cursor: 'pointer' }}>
              🚀 Push immediately to Autonomous AI Pilot
            </label>
          </div>
          {pushToAutoPilot && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
              <select className="select-field" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)} style={{ fontSize: '12px' }}>
                <option value="Practo Prime">Practo Prime (Supreme / AI)</option>
                <option value="Practo Reach">Practo Reach Spotlight</option>
              </select>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                Voice AI → WhatsApp → Email Sequence
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', fontSize: '11.5px' }}>
          <button onClick={downloadTemplate} type="button" style={{ background: 'none', border: 'none', color: 'var(--practo-cyan)', fontWeight: 700, cursor: 'pointer', padding: 0 }}>
            📥 Download Sample CSV Template
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
          <button
            onClick={handleExecuteImport}
            disabled={!parsedRows.length || importing}
            className="btn btn-primary"
            style={{ flex: 2 }}
          >
            {importing ? 'Processing Leads...' : `Import ${parsedRows.length || ''} Leads ${pushToAutoPilot ? '& Launch AI Pilot' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Leads() {
  const { setSelectedLeadId, setVoiceDialerLead, setPitchLead, setIsLeadModalOpen, setEditingLead, addToast, hasPermission } = useCrm();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [keyword, setKeyword] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedZone, setSelectedZone] = useState('All');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All');
  const [selectedStage, setSelectedStage] = useState('All');
  const [onPractoFilter, setOnPractoFilter] = useState('all'); // 'all' | 'yes' | 'no'

  // Multi-Source Clinic Discovery State
  const [discoveredClinics, setDiscoveredClinics] = useState([]);
  const [sourceStats, setSourceStats] = useState({ gmb: 0, practo: 0, websites: 0, justdial: 0 });
  const [searchingClinics, setSearchingClinics] = useState(false);
  const [selectedClinicIds, setSelectedClinicIds] = useState(new Set());
  const [autoPilotProduct, setAutoPilotProduct] = useState('Practo Prime');
  const [launchingPilot, setLaunchingPilot] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all' | 'gmb' | 'practo' | 'non-practo' | 'seo'

  // Dynamic Zones based on Selected City
  const availableZones = useMemo(() => {
    if (selectedCity === 'All') {
      const allZones = new Set();
      GEO_DATA.forEach((g) => (g.zones || []).forEach((z) => allZones.add(z)));
      return Array.from(allZones).sort();
    }
    const matched = GEO_DATA.find((g) => g.city.toLowerCase() === selectedCity.toLowerCase());
    return matched ? matched.zones || [] : [];
  }, [selectedCity]);

  // Filter Discovered Clinics by Source Tab
  const filteredDiscoveredClinics = useMemo(() => {
    if (sourceFilter === 'all') return discoveredClinics;
    if (sourceFilter === 'gmb') return discoveredClinics.filter((c) => (c.sources || []).some((s) => s.toLowerCase().includes('gmb') || s.toLowerCase().includes('google') || s.toLowerCase().includes('places')));
    if (sourceFilter === 'practo') return discoveredClinics.filter((c) => c.onPracto === true);
    if (sourceFilter === 'non-practo') return discoveredClinics.filter((c) => c.onPracto === false);
    if (sourceFilter === 'seo') return discoveredClinics.filter((c) => (c.sources || []).some((s) => s.toLowerCase().includes('seo') || s.toLowerCase().includes('website') || s.toLowerCase().includes('crawler') || s.toLowerCase().includes('search')));
    return discoveredClinics;
  }, [discoveredClinics, sourceFilter]);

  // Fetch leads from backend
  const loadLeads = async () => {
    try {
      setLoading(true);
      const data = await api.getLeads({
        search: keyword,
        city: selectedCity,
        zone: selectedZone,
        specialty: selectedSpecialty,
        status: selectedStage,
      });
      setLeads(data.leads || []);
    } catch (err) {
      addToast(err.message || 'Failed to fetch leads', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeads();
  }, [selectedCity, selectedZone, selectedSpecialty, selectedStage]);

  // Auto-search multi-source clinics whenever city + zone + specialty change
  useEffect(() => {
    if (selectedCity !== 'All' || selectedZone !== 'All' || selectedSpecialty !== 'All') {
      searchClinics();
    } else {
      setDiscoveredClinics([]);
    }
  }, [selectedCity, selectedZone, selectedSpecialty, onPractoFilter]);

  const searchClinics = async () => {
    try {
      setSearchingClinics(true);
      const data = await api.searchClinics({
        city: selectedCity,
        zone: selectedZone,
        specialty: selectedSpecialty,
        onPracto: onPractoFilter,
      });
      setDiscoveredClinics(data.clinics || []);
      setSourceStats(data.sources || { gmb: 0, practo: 0, websites: 0, justdial: 0 });
      setSelectedClinicIds(new Set());
    } catch (err) {
      console.warn('Multi-source clinic search:', err);
    } finally {
      setSearchingClinics(false);
    }
  };

  const handleCityChange = (city) => {
    setSelectedCity(city);
    setSelectedZone('All');
  };

  const handleResetFilters = () => {
    setKeyword('');
    setSelectedCity('All');
    setSelectedZone('All');
    setSelectedSpecialty('All');
    setSelectedStage('All');
    setOnPractoFilter('all');
    setDiscoveredClinics([]);
    setSelectedClinicIds(new Set());
    addToast('All filters reset', 'info');
  };

  const handleExportCSV = () => {
    window.open('/api/leads/export/csv', '_blank');
    addToast('Downloading Practo Leads CSV...', 'success');
  };

  const handleDelete = async (id, name, e) => {
    e.stopPropagation();
    if (!window.confirm(`Delete lead "${name}"?`)) return;
    try {
      await api.deleteLead(id);
      addToast('Lead deleted', 'info');
      setLeads((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      addToast(err.message || 'Delete failed', 'error');
    }
  };

  const toggleClinicSelect = (clinicId) => {
    setSelectedClinicIds((prev) => {
      const next = new Set(prev);
      if (next.has(clinicId)) next.delete(clinicId);
      else next.add(clinicId);
      return next;
    });
  };

  const toggleAllClinics = () => {
    if (selectedClinicIds.size === discoveredClinics.length) {
      setSelectedClinicIds(new Set());
    } else {
      setSelectedClinicIds(new Set(discoveredClinics.map((c) => c.id)));
    }
  };

  // Handle assign to CRM (auto-pilot or manual)
  const handleAssignToCrm = async ({ product, variant, mode }) => {
    if (selectedClinicIds.size === 0) return;
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
          email: clinic.email,
          phone: clinic.phone,
          ownerName: clinic.ownerName || clinic.name,
          ownerPhone: clinic.ownerPhone || clinic.phone,
          ownerEmail: clinic.ownerEmail || clinic.email,
          marketingPersonName: clinic.marketingPersonName || '',
          marketingPersonPhone: clinic.marketingPersonPhone || '',
          patientVolumeMonthly: clinic.patientVolumeMonthly || 1200,
          onPracto: clinic.onPracto,
          practoRating: clinic.practoRating,
          assignedRep: 'Ananya Roy',
          notes: `Multi-source verified. Sources: ${clinic.sources?.join(', ') || 'GMB & Web'}. Practo: ${clinic.onPracto ? 'Yes (' + clinic.practoRating + '★)' : 'No'}. Product: ${product} ${variant ? '(' + variant + ')' : ''}.`,
        });
        if (created?.id) createdLeadIds.push(created.id);
      }
      if (createdLeadIds.length > 0) {
        if (mode === 'autopilot') {
          const pilotRes = await api.assignAutoPilot(createdLeadIds, product);
          addToast(pilotRes.message || `🤖 Auto-Pilot launched for ${createdLeadIds.length} leads — ${product}`, 'success');
        } else {
          addToast(`📞 ${createdLeadIds.length} leads added to Manual Dialing queue`, 'success');
        }
      }
      await loadLeads();
      setSelectedClinicIds(new Set());
      setShowAssignModal(false);
    } catch (err) {
      addToast(err.message || 'Assignment failed', 'error');
    } finally {
      setLaunchingPilot(false);
    }
  };

  // Legacy auto-pilot launch (kept for backward compat)
  const handleLaunchAutoPilot = () => {
    if (selectedClinicIds.size === 0) { addToast('Select at least one clinic', 'error'); return; }
    setShowAssignModal(true);
  };

  // Export discovered clinics as CSV
  const handleExportClinicsCSV = () => {
    const header = 'Doctor Name,Organization,Specialty,City,Zone,Address,Phone,Email,Owner Name,Owner Phone,Owner Email,Marketing Person,Marketing Phone,On Practo,Practo Rating,Practo Reviews,GMB Rating,GMB Reviews,Monthly OPD,Category,Sources';
    const rows = discoveredClinics.map((c) => [
      c.name, c.org, c.specialty, c.city, c.zone, c.address, c.phone, c.email,
      c.ownerName || c.name, c.ownerPhone || c.phone, c.ownerEmail || c.email,
      c.marketingPersonName || '', c.marketingPersonPhone || '',
      c.onPracto ? 'Yes' : 'No', c.practoRating || '', c.practoReviews || '',
      c.gmbRating || '', c.gmbReviews || '', c.patientVolumeMonthly || '',
      c.category, (c.sources || []).join('; '),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'practo_leads_export.csv'; a.click();
    URL.revokeObjectURL(url);
    addToast(`Exported ${discoveredClinics.length} clinic records as CSV`, 'success');
  };

  // Sync Discovered Clinics to Amoga Work OS
  const handleSyncDiscoveredToAmoga = async () => {
    if (selectedClinicIds.size === 0) {
      addToast('Select at least one clinic to sync with Amoga', 'error');
      return;
    }
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
          email: clinic.email,
          phone: clinic.phone,
          ownerName: clinic.ownerName || clinic.name,
          ownerPhone: clinic.ownerPhone || clinic.phone,
          ownerEmail: clinic.ownerEmail || clinic.email,
          marketingPersonName: clinic.marketingPersonName || '',
          marketingPersonPhone: clinic.marketingPersonPhone || '',
          patientVolumeMonthly: clinic.patientVolumeMonthly || 1200,
          onPracto: clinic.onPracto,
          practoRating: clinic.practoRating,
          assignedRep: 'Ananya Roy',
        });
        if (created?.id) createdLeadIds.push(created.id);
      }

      const res = await fetch('/api/amoga/sync-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: createdLeadIds }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(`✅ ${data.message} (https://practo.amoga.io/)`, 'success');
        await loadLeads();
        setSelectedClinicIds(new Set());
      }
    } catch (err) {
      addToast(err.message || 'Amoga sync failed', 'error');
    }
  };

  // Import CSV leads with optional direct Auto-Pilot launch
  const handleImportLeads = async (rows, pushToAutoPilot = false, product = 'Practo Prime') => {
    let imported = 0;
    const createdIds = [];
    for (const row of rows) {
      try {
        const created = await api.createLead({
          name: row.name || row['Doctor Name'] || 'Unknown',
          organization: row.organization || row.Organization || '',
          specialty: row.specialty || row.Specialty || 'General Physician',
          city: row.city || row.City || 'Bangalore',
          zone: row.zone || row.Zone || 'Central Zone',
          phone: row.phone || row.Phone || '',
          email: row.email || row.Email || '',
          ownerName: row.ownerName || row['Owner Name'] || row.name || '',
          ownerPhone: row.ownerPhone || row['Owner Phone'] || row.phone || '',
          ownerEmail: row.ownerEmail || row['Owner Email'] || row.email || '',
          marketingPersonName: row.marketingPersonName || row['Marketing Person'] || '',
          marketingPersonPhone: row.marketingPersonPhone || row['Marketing Phone'] || '',
        });
        if (created?.id) createdIds.push(created.id);
        imported++;
      } catch { /* skip bad rows */ }
    }

    if (pushToAutoPilot && createdIds.length > 0) {
      await api.assignAutoPilot(createdIds, product);
      addToast(`🚀 ${imported} leads imported & launched on Auto-Pilot AI (${product})!`, 'success');
    } else {
      addToast(`✅ ${imported} leads imported successfully`, 'success');
    }

    await loadLeads();
    setShowImportModal(false);
  };

  const activeFiltersCount = [
    keyword.trim() !== '',
    selectedCity !== 'All',
    selectedZone !== 'All',
    selectedSpecialty !== 'All',
    selectedStage !== 'All',
    onPractoFilter !== 'all',
  ].filter(Boolean).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-indigo">Multi-Source Discovery</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {leads.length} Active Leads
            </span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            Doctor & Clinic Intelligence Pipeline
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={() => setIsManualPushOpen(true)} className="btn btn-secondary btn-sm" style={{ border: '1.5px solid #233876', color: '#233876', background: '#F8FAFC', fontWeight: 700 }}>
            ⚡ + Quick Manual Push
          </button>
          <button onClick={() => setShowImportModal(true)} className="btn btn-secondary btn-sm">📂 Import CSV</button>
          {hasPermission('export_leads') && (
            <button onClick={handleExportClinicsCSV} className="btn btn-secondary btn-sm" disabled={discoveredClinics.length === 0}>📥 Export CSV</button>
          )}
          <button onClick={handleExportCSV} className="btn btn-secondary btn-sm">📥 Export Leads</button>
          <button onClick={() => { setEditingLead(null); setIsLeadModalOpen(true); }} className="btn btn-primary btn-sm">
            + Register Lead
          </button>
        </div>
      </div>

      {/* ── Filter Console ─────────────────────────────────────────────── */}
      <div
        className="glass-panel"
        style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}
      >
        {/* Row 1: Keyword Search */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search by Doctor, Clinic, Zone, EHR, Notes..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadLeads()}
              style={{ paddingLeft: '34px' }}
            />
            <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--text-muted)' }}>🔍</span>
          </div>

          <button onClick={loadLeads} className="btn btn-primary btn-sm">Apply Search</button>

          {activeFiltersCount > 0 && (
            <button onClick={handleResetFilters} className="btn btn-secondary btn-sm" style={{ color: 'var(--accent-rose)' }}>
              ✕ Reset All ({activeFiltersCount})
            </button>
          )}
        </div>

        {/* Row 2: City, Zone, Specialty, On Practo */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '12px',
          }}
        >
          <div>
            <label className="input-label">City</label>
            <select className="select-field" value={selectedCity} onChange={(e) => handleCityChange(e.target.value)}>
              <option value="All">All Cities ({GEO_DATA.length})</option>
              {GEO_DATA.map((g) => (
                <option key={g.city} value={g.city}>{g.city}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">Zone</label>
            <select className="select-field" value={selectedZone} onChange={(e) => setSelectedZone(e.target.value)}>
              <option value="All">All Zones ({availableZones.length})</option>
              {availableZones.map((z) => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">Medical Specialty</label>
            <select className="select-field" value={selectedSpecialty} onChange={(e) => setSelectedSpecialty(e.target.value)}>
              <option value="All">All Specialties ({PRACTO_SPECIALTIES.length})</option>
              {PRACTO_SPECIALTIES.map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="input-label">Practo Status</label>
            <select className="select-field" value={onPractoFilter} onChange={(e) => setOnPractoFilter(e.target.value)}>
              <option value="all">All (On & Off Practo)</option>
              <option value="yes">✅ On Practo</option>
              <option value="no">❌ Not on Practo</option>
            </select>
          </div>

          <div>
            <label className="input-label">Pipeline Stage</label>
            <select className="select-field" value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)}>
              <option value="All">All Stages</option>
              <option value="New Lead">New Lead</option>
              <option value="Contacted">Contacted</option>
              <option value="Qualified">Qualified</option>
              <option value="Demo Scheduled">Demo Scheduled</option>
              <option value="Proposal Sent">Proposal Sent</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Closed Won">Closed Won</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Multi-Source Auto-Discovered Clinics Section ────────────────── */}
      {(discoveredClinics.length > 0 || searchingClinics) && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#06B6D4', boxShadow: '0 0 8px #06B6D4' }} />
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                  Multi-Source Clinic & Hospital Aggregator
                </h3>
                <span className="badge badge-cyan">{discoveredClinics.length} Deduplicated Records</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '3px' }}>
                Aggregated from Google My Business, Practo.com, JustDial, & Medical Council registries for {selectedCity !== 'All' ? selectedCity : 'All Cities'}{selectedZone !== 'All' ? ` • ${selectedZone}` : ''}{selectedSpecialty !== 'All' ? ` • ${selectedSpecialty}` : ''}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              {discoveredClinics.length > 0 && (
                <button onClick={handleExportClinicsCSV} className="btn btn-secondary btn-sm">📥 Export CSV</button>
              )}
              <button
                onClick={handleSyncDiscoveredToAmoga}
                disabled={selectedClinicIds.size === 0}
                className="btn btn-secondary btn-sm"
                style={{ border: '1px solid rgba(99,102,241,0.4)', color: '#818CF8' }}
              >
                🔄 Sync to Amoga CRM ({selectedClinicIds.size})
              </button>
              <button
                onClick={() => { if (selectedClinicIds.size === 0) { addToast('Select at least one clinic', 'error'); return; } setShowAssignModal(true); }}
                disabled={selectedClinicIds.size === 0 || launchingPilot}
                className="btn btn-primary btn-sm"
              >
                {launchingPilot ? 'Assigning...' : `🎯 Assign to CRM (${selectedClinicIds.size})`}
              </button>
            </div>
          </div>

          {/* Provenance Statistics & Interactive Source Filter Tabs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginRight: '4px', fontWeight: 600 }}>Filter By Verified Source:</span>
            
            <button
              onClick={() => setSourceFilter('all')}
              style={{
                background: sourceFilter === 'all' ? '#233876' : '#FFFFFF',
                color: sourceFilter === 'all' ? '#FFFFFF' : '#334155',
                border: sourceFilter === 'all' ? '1px solid #233876' : '1px solid #CBD5E1',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              🌐 All Sources ({discoveredClinics.length})
            </button>

            <button
              onClick={() => setSourceFilter('gmb')}
              style={{
                background: sourceFilter === 'gmb' ? '#0284C7' : '#FFFFFF',
                color: sourceFilter === 'gmb' ? '#FFFFFF' : '#0369A1',
                border: sourceFilter === 'gmb' ? '1px solid #0284C7' : '1px solid #BAE6FD',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              📍 Google Places (GMB): {sourceStats.gmb || discoveredClinics.filter((c) => (c.sources || []).some((s) => s.includes('GMB') || s.includes('Google'))).length}
            </button>

            <button
              onClick={() => setSourceFilter('practo')}
              style={{
                background: sourceFilter === 'practo' ? '#059669' : '#FFFFFF',
                color: sourceFilter === 'practo' ? '#FFFFFF' : '#047857',
                border: sourceFilter === 'practo' ? '1px solid #059669' : '1px solid #A7F3D0',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              🩺 Practo.com Directory: {discoveredClinics.filter((c) => c.onPracto).length}
            </button>

            <button
              onClick={() => setSourceFilter('seo')}
              style={{
                background: sourceFilter === 'seo' ? '#4F46E5' : '#FFFFFF',
                color: sourceFilter === 'seo' ? '#FFFFFF' : '#4338CA',
                border: sourceFilter === 'seo' ? '1px solid #4F46E5' : '1px solid #C7D2FE',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              🔍 Google Search Engine & SEO: {discoveredClinics.filter((c) => (c.sources || []).some((s) => s.includes('SEO') || s.includes('Website') || s.includes('Search'))).length}
            </button>

            <button
              onClick={() => setSourceFilter('non-practo')}
              style={{
                background: sourceFilter === 'non-practo' ? '#D97706' : '#FFFFFF',
                color: sourceFilter === 'non-practo' ? '#FFFFFF' : '#B45309',
                border: sourceFilter === 'non-practo' ? '1px solid #D97706' : '1px solid #FDE68A',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              ❌ Not on Practo (Prime Targets): {discoveredClinics.filter((c) => !c.onPracto).length}
            </button>
          </div>

          {searchingClinics ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Aggregating live verified records across Google My Business (GMB), Practo.com, and Google Search Engine...
            </div>
          ) : filteredDiscoveredClinics.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No clinics found matching the source filter "{sourceFilter}".
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '36px' }}>
                      <input type="checkbox" checked={selectedClinicIds.size === filteredDiscoveredClinics.length && filteredDiscoveredClinics.length > 0} onChange={toggleAllClinics} />
                    </th>
                    <th>Doctor & Practice</th>
                    <th>Location & GMB Address</th>
                    <th>Specialty</th>
                    <th>Practo Status</th>
                    <th>Owner Contact</th>
                    <th>Marketing Person</th>
                    <th>GMB Rating & OPD</th>
                    <th>Verified Sources</th>
                    <th style={{ textAlign: 'right' }}>Quick Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDiscoveredClinics.map((clinic) => (
                    <tr key={clinic.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedClinicIds.has(clinic.id)}
                          onChange={() => toggleClinicSelect(clinic.id)}
                        />
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{clinic.name}</div>
                        <div style={{ fontSize: '11.5px', color: '#233876', fontWeight: 600 }}>{clinic.org}</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{clinic.category || 'Specialist Clinic'}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '12.5px' }}>
                          {clinic.city} • <span style={{ color: 'var(--accent-cyan)' }}>{clinic.zone}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {clinic.address}
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.org + ' ' + (clinic.address || clinic.city))}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '10.5px', color: '#0284C7', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px', marginTop: '2px' }}
                        >
                          📍 View on Google Maps ↗
                        </a>
                      </td>
                      <td>
                        <span className="badge badge-navy" style={{ fontSize: '11px' }}>{clinic.specialty}</span>
                      </td>
                      <td>
                        {clinic.onPracto ? (
                          <div>
                            <span className="badge badge-emerald" style={{ fontSize: '10.5px', display: 'inline-block', marginBottom: '2px' }}>
                              ✅ On Practo ({clinic.practoRating}★ / {clinic.practoReviews || 120} rev)
                            </span>
                            {clinic.practoProfileUrl && (
                              <div>
                                <a href={clinic.practoProfileUrl} target="_blank" rel="noreferrer" style={{ fontSize: '10.5px', color: '#059669', textDecoration: 'none' }}>
                                  🩺 Practo Profile ↗
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="badge badge-amber" style={{ fontSize: '10.5px' }}>
                            ❌ Not on Practo (Prime Target)
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '12px' }}>{clinic.ownerName || clinic.name}</div>
                        <div style={{ fontSize: '11.5px', color: '#0F172A', fontFamily: 'monospace' }}>{clinic.ownerPhone || clinic.phone}</div>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{clinic.ownerEmail || clinic.email}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '12px' }}>{clinic.marketingPersonName || 'Priya Shenoy'}</div>
                        <div style={{ fontSize: '11.5px', color: '#0F172A', fontFamily: 'monospace' }}>{clinic.marketingPersonPhone || clinic.phone}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 800, color: '#D97706', fontSize: '12.5px' }}>
                          ⭐ {clinic.gmbRating || 4.8} <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>({clinic.gmbReviews || 240} Google reviews)</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          OPD: <strong>{(clinic.patientVolumeMonthly || 1200).toLocaleString()}</strong> pts/mo
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxWidth: '180px' }}>
                          {(clinic.sources || ['Google Places (GMB)', 'Google Search Engine & SEO']).map((src, i) => (
                            <span key={i} style={{ fontSize: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1px 5px', borderRadius: '4px', color: '#475569' }}>
                              • {src}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                          <button
                            onClick={() => setVoiceDialerLead(clinic)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '11px', width: '90px', justifyContent: 'center' }}
                          >
                            📞 AI Voice
                          </button>
                          <button
                            onClick={() => setPitchLead(clinic)}
                            className="btn btn-cyan btn-sm"
                            style={{ padding: '3px 8px', fontSize: '11px', width: '90px', justifyContent: 'center' }}
                          >
                            💬 WhatsApp
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Auto Pilot Sequence Preview */}
          {selectedClinicIds.size > 0 && (
            <div
              style={{
                marginTop: '16px',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--accent-cyan)', marginBottom: '8px' }}>
                Auto AI Pilot Sequence Assigned — {autoPilotProduct} ({selectedClinicIds.size} Clinics)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '12.5px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                  <span style={{ color: '#10B981', fontWeight: 800 }}>Step 1:</span> 📞 AI Voice Call (Retell SIP)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                  <span style={{ color: '#06B6D4', fontWeight: 800 }}>Step 2:</span> 💬 Meta WhatsApp ROI Card
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                  <span style={{ color: '#6366F1', fontWeight: 800 }}>Step 3:</span> 📧 Executive Proposal Email
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                  <span style={{ color: '#F59E0B', fontWeight: 800 }}>Step 4:</span> 🤝 Deal Closer & Contract Sign
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Registered Leads Table ─────────────────────────────────────── */}
      <div className="glass-panel table-container">
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Registered Leads Ledger</h3>
          <span className="badge badge-indigo">{leads.length}</span>
        </div>

        {loading ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading leads...
          </div>
        ) : leads.length === 0 ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No leads found matching current filters.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Practitioner & Clinic</th>
                <th>City • Zone</th>
                <th>Specialty</th>
                <th>AI ICP Score</th>
                <th>Monthly OPD</th>
                <th>Stage</th>
                <th>Assigned Rep</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} onClick={() => setSelectedLeadId(lead.id)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{lead.name}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{lead.organization}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>{lead.city || 'Metro'}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--accent-cyan)' }}>{lead.zone || 'Zone'}</div>
                  </td>
                  <td><span className="badge badge-indigo">{lead.specialty}</span></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div
                        style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: lead.score >= 90 ? 'rgba(16,185,129,0.15)' : lead.score >= 75 ? 'rgba(99,102,241,0.15)' : 'rgba(245,158,11,0.15)',
                          color: lead.score >= 90 ? '#34D399' : lead.score >= 75 ? '#818CF8' : '#FBBF24',
                          border: `1px solid ${lead.score >= 90 ? 'rgba(16,185,129,0.3)' : lead.score >= 75 ? 'rgba(99,102,241,0.3)' : 'rgba(245,158,11,0.3)'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '11.5px',
                        }}
                      >
                        {lead.score}
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--text-primary)' }}>{lead.patientVolumeMonthly?.toLocaleString() || 1000}</strong>
                  </td>
                  <td>
                    <span className={`badge ${lead.stage === 'Closed Won' ? 'badge-emerald' : lead.stage === 'Negotiation' || lead.stage === 'Proposal Sent' ? 'badge-amber' : 'badge-cyan'}`}>
                      {lead.stage || lead.status || 'New Lead'}
                    </span>
                  </td>
                  <td style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>{lead.assignedRep || 'Unassigned'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => setPitchLead(lead)} className="btn btn-secondary btn-sm" title="AI Pitch" style={{ padding: '4px 8px' }}>✨</button>
                      <button onClick={() => setVoiceDialerLead(lead)} className="btn btn-secondary btn-sm" title="AI Voice Call" style={{ padding: '4px 8px' }}>🎙️</button>
                      {hasPermission('delete_leads') && (
                        <button onClick={(e) => handleDelete(lead.id, lead.name, e)} className="btn btn-danger btn-sm" title="Delete" style={{ padding: '4px 8px' }}>✕</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      {showAssignModal && (
        <AssignToCrmModal
          clinics={discoveredClinics.filter((c) => selectedClinicIds.has(c.id))}
          onClose={() => setShowAssignModal(false)}
          onConfirm={handleAssignToCrm}
        />
      )}
      {showImportModal && (
        <ImportLeadsModal
          onClose={() => setShowImportModal(false)}
          onImport={handleImportLeads}
        />
      )}
    </div>
  );
}
