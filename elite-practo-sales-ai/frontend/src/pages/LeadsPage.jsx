import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';

const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
const STAGE_COLORS = { new: 'badge-blue', contacted: 'badge-purple', qualified: 'badge-yellow', proposal: 'badge-yellow', won: 'badge-green', lost: 'badge-gray' };

function StageDropdown({ lead, onUpdate }) {
  const [loading, setLoading] = useState(false);
  async function handleChange(e) {
    const stage = e.target.value;
    setLoading(true);
    try { await api.updateLead(lead.id, { stage }); onUpdate(); } catch { /* ignore */ }
    finally { setLoading(false); }
  }
  return (
    <select className="input" value={lead.stage} onChange={handleChange} disabled={loading} style={{ padding: '4px 8px', fontSize: 12, width: 'auto' }}>
      {STAGES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
    </select>
  );
}

function StatusBadge({ status, stage }) {
  const st = String(status || '').toLowerCase();
  const sg = String(stage || '').toLowerCase();

  if (st === 'requires_attention') {
    return <span className="badge" style={{ background: '#FEE2E2', color: '#B91C1C', fontWeight: 600, border: '1px solid #FCA5A5' }}>🤝 Human Requested</span>;
  }
  if (st === 'contacted' || sg === 'contacted') {
    return <span className="badge badge-purple" style={{ fontWeight: 600 }}>📞 AI Call Done</span>;
  }
  if (st === 'follow_up') {
    return <span className="badge badge-yellow" style={{ fontWeight: 600 }}>🔄 Follow-Up / RNR</span>;
  }
  if (st === 'proposal_sent' || sg === 'proposal') {
    return <span className="badge badge-teal" style={{ fontWeight: 600 }}>📄 Proposal Sent</span>;
  }
  if (st === 'objection_handled') {
    return <span className="badge badge-blue" style={{ fontWeight: 600 }}>💬 Objection Handled</span>;
  }
  if (st === 'won' || sg === 'won') {
    return <span className="badge badge-green" style={{ fontWeight: 600 }}>🏆 Closed Won</span>;
  }
  if (st === 'call_failed' || st === 'unreachable') {
    return <span className="badge" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>⚠️ Call Failed</span>;
  }
  return <span className="badge badge-gray" style={{ color: '#64748B' }}>🌱 Open / New</span>;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('elite_leads_cache') || '[]');
    } catch {
      return [];
    }
  });
  const [total, setTotal] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('elite_leads_cache') || '[]');
      return cached.length;
    } catch {
      return 0;
    }
  });
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [workflowTab, setWorkflowTab] = useState('all'); // 'all' | 'autopilot' | 'manual'
  const [productFilter, setProductFilter] = useState(''); // '' | 'prime' | 'reach'

  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    title: 'General Physician',
    city: 'Bangalore',
    locality: 'Indiranagar',
    source: 'manual',
    stage: 'new',
    status: 'open',
    notes: '',
    product_interest: 'prime',
    workflow_stage: 'manual'
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Quick Action State
  const [callingLeadId, setCallingLeadId] = useState(null);
  const [detailLead, setDetailLead] = useState(null);
  const [newActivityText, setNewActivityText] = useState('');
  const [addingActivity, setAddingActivity] = useState(false);

  // Batch modal
  const [batchModal, setBatchModal] = useState(false);
  const [batchProduct, setBatchProduct] = useState('prime');
  const [batchProcessing, setBatchProcessing] = useState(false);

  const fileInputRef = useRef(null);
  const csvModalFileInputRef = useRef(null);

  // CSV Custom Upload & Push Modal State
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [columnMapping, setColumnMapping] = useState({
    doctor_name: '',
    clinic_name: '',
    phone: '',
    email: '',
    city: '',
    locality: '',
    speciality: '',
    product_interest: '',
    notes: '',
  });
  const [batchDefaults, setBatchDefaults] = useState({
    city: 'Bangalore',
    speciality: 'General Physician',
    product_interest: 'prime',
    workflow_stage: 'manual',
  });
  const [uploadTab, setUploadTab] = useState('preview'); // 'preview' | 'mapping'
  const [selectedUploadRowIndices, setSelectedUploadRowIndices] = useState(new Set());
  const [uploadSearch, setUploadSearch] = useState('');
  const [pushTarget, setPushTarget] = useState('crm'); // 'crm' | 'autopilot' | 'both'
  const [pushProduct, setPushProduct] = useState('prime');
  const [isPushing, setIsPushing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  async function fetchLeads() {
    setLoading(true);
    try {
      const data = await api.getLeads({
        search,
        stage: stage || undefined,
        workflowStage: workflowTab !== 'all' ? workflowTab : undefined,
        productInterest: productFilter || undefined,
        limit: 100,
      });
      let filtered = data.leads || [];
      if (workflowTab === 'autopilot') filtered = filtered.filter((l) => l.workflow_stage === 'autopilot');
      if (workflowTab === 'manual') filtered = filtered.filter((l) => l.workflow_stage === 'manual');
      if (productFilter) filtered = filtered.filter((l) => l.product_interest === productFilter);

      // Persist full server list into browser cache if unfiltered
      if (data.leads && data.leads.length > 0 && !search && !stage && workflowTab === 'all' && !productFilter) {
        try {
          localStorage.setItem('elite_leads_cache', JSON.stringify(data.leads));
        } catch {}
      }

      // RESILIENCY: If server returned 0 leads (e.g. serverless cold start / container reset)
      // but browser has cached leads, seamlessly recover and re-hydrate server!
      if ((!data.leads || data.leads.length === 0) && !search && !stage && workflowTab === 'all' && !productFilter) {
        try {
          const cached = JSON.parse(localStorage.getItem('elite_leads_cache') || '[]');
          if (cached.length > 0) {
            console.log(`[Resilient CRM] Restoring ${cached.length} leads from browser storage after server reset...`);
            filtered = cached;
            api.bulkImportLeads(cached, { target: 'crm' }).catch(() => {});
          }
        } catch {}
      }

      setLeads(filtered);
      setTotal(data.total || filtered.length || 0);
    } catch (e) {
      // Fallback to cache on network / server restart error
      try {
        const cached = JSON.parse(localStorage.getItem('elite_leads_cache') || '[]');
        if (cached.length > 0) {
          setLeads(cached);
          setTotal(cached.length);
        }
      } catch {}
      setMessage({ type: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLeads(); }, [search, stage, workflowTab, productFilter]); // eslint-disable-line

  function toggleSelectAll() {
    if (selectedIds.length === leads.length) setSelectedIds([]);
    else setSelectedIds(leads.map((l) => l.id));
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  async function handleBatchAutopilot() {
    if (selectedIds.length === 0) return;
    setBatchProcessing(true);
    try {
      await api.batchActionLeads({
        leadIds: selectedIds,
        action: 'push_autopilot',
        product: batchProduct,
      });
      setMessage({ type: 'success', text: `Successfully pushed ${selectedIds.length} leads to Auto Pilot [${batchProduct.toUpperCase()}]!` });
      setBatchModal(false);
      setSelectedIds([]);
      fetchLeads();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setBatchProcessing(false);
    }
  }

  async function handleBatchManual() {
    if (selectedIds.length === 0) return;
    try {
      await api.batchActionLeads({ leadIds: selectedIds, action: 'assign_manual' });
      setMessage({ type: 'success', text: `Assigned ${selectedIds.length} leads to Manual Dialing Queue!` });
      setSelectedIds([]);
      fetchLeads();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  async function handleBatchDelete() {
    if (!confirm(`Delete ${selectedIds.length} selected leads?`)) return;
    try {
      await api.batchActionLeads({ leadIds: selectedIds, action: 'delete' });
      setMessage({ type: 'success', text: `Deleted ${selectedIds.length} leads.` });
      const delSet = new Set(selectedIds);
      setLeads((prev) => {
        const next = prev.filter((l) => !delSet.has(l.id));
        try { localStorage.setItem('elite_leads_cache', JSON.stringify(next)); } catch {}
        return next;
      });
      setTotal((prev) => Math.max(0, prev - selectedIds.length));
      setSelectedIds([]);
      fetchLeads();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  async function handleDirectAiCall(lead) {
    if (!lead.phone) {
      setMessage({ type: 'error', text: 'Doctor phone number is required to trigger AI call' });
      return;
    }
    setCallingLeadId(lead.id);
    try {
      const res = await api.dialVoiceAgent({
        leadId: lead.id,
        toPhone: lead.phone,
        doctorName: lead.owner_name || lead.doctor_name || lead.name,
        clinicName: lead.company || lead.clinic_name || 'Clinic',
        city: lead.city || 'Bangalore',
        locality: lead.locality || 'Indiranagar',
        speciality: lead.speciality || lead.title || 'General Physician',
        product: lead.product_interest || 'prime',
        voiceEngine: 'sarvam',
      });
      setMessage({
        type: 'success',
        text: `📞 Outbound Voice AI Call placed to ${lead.owner_name || lead.name}! Attempt: ${res.call?.callId || res.callId || 'Initiated'}`
      });
      fetchLeads();
      if (detailLead && detailLead.id === lead.id) {
        handleOpenDetail(lead);
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to place AI call: ${err.message}` });
    } finally {
      setCallingLeadId(null);
    }
  }

  async function handleOpenDetail(lead) {
    try {
      const full = await api.getLead(lead.id);
      setDetailLead(full);
    } catch {
      setDetailLead(lead);
    }
  }

  async function handleAddActivity(e) {
    e.preventDefault();
    if (!newActivityText.trim() || !detailLead) return;
    setAddingActivity(true);
    try {
      await api.addLeadActivity(detailLead.id, {
        title: 'Manual Activity Note',
        detail: newActivityText.trim(),
        type: 'note',
      });
      setNewActivityText('');
      const updated = await api.getLead(detailLead.id);
      setDetailLead(updated);
      fetchLeads();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setAddingActivity(false);
    }
  }

  function handleExportCsv() {
    const url = api.exportLeadsUrl({ stage, workflowStage: workflowTab !== 'all' ? workflowTab : undefined, format: 'csv' });
    window.open(url, '_blank');
  }

  function handleExportJson() {
    const url = api.exportLeadsUrl({ stage, workflowStage: workflowTab !== 'all' ? workflowTab : undefined, format: 'json' });
    window.open(url, '_blank');
  }

  function parseCsvText(text) {
    if (!text) return [];
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }
    const rows = [];
    let currentRow = [];
    let currentVal = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"' && nextChar === '"') {
          currentVal += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          currentVal += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          currentRow.push(currentVal.trim());
          currentVal = '';
        } else if (char === '\r') {
          if (nextChar === '\n') i++;
          currentRow.push(currentVal.trim());
          if (currentRow.some(c => c.length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentVal = '';
        } else if (char === '\n') {
          currentRow.push(currentVal.trim());
          if (currentRow.some(c => c.length > 0)) {
            rows.push(currentRow);
          }
          currentRow = [];
          currentVal = '';
        } else {
          currentVal += char;
        }
      }
    }
    if (currentVal.length > 0 || currentRow.length > 0) {
      currentRow.push(currentVal.trim());
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
    }
    return rows;
  }

  function guessColumnMapping(headers) {
    const mapping = {
      doctor_name: '',
      clinic_name: '',
      phone: '',
      email: '',
      city: '',
      locality: '',
      speciality: '',
      product_interest: '',
      notes: '',
    };

    const cleanHeaders = headers.map(h => (h || '').toLowerCase().replace(/[^a-z0-9]/g, ''));

    headers.forEach((originalHeader, idx) => {
      const h = cleanHeaders[idx];
      if (!mapping.phone && (/phone|mobile|cell|contactno|contactnum|mobilenum/i.test(h) || h === 'contact' || h === 'tel')) {
        mapping.phone = originalHeader;
      } else if (!mapping.email && /email|mail|emailaddress/i.test(h)) {
        mapping.email = originalHeader;
      } else if (!mapping.doctor_name && (/doctor|doc|physician|drname|doctorname|leadname|fullname|provider/i.test(h) || h === 'name')) {
        mapping.doctor_name = originalHeader;
      } else if (!mapping.clinic_name && (/clinic|hospital|centre|center|company|organization|facility|practice/i.test(h))) {
        mapping.clinic_name = originalHeader;
      } else if (!mapping.city && /city|town|metro/i.test(h)) {
        mapping.city = originalHeader;
      } else if (!mapping.locality && (/locality|area|suburb|address|location/i.test(h))) {
        mapping.locality = originalHeader;
      } else if (!mapping.speciality && (/spec|speciality|specialization|dept|department|category/i.test(h))) {
        mapping.speciality = originalHeader;
      } else if (!mapping.product_interest && (/product|package|plan|tier|interest/i.test(h))) {
        mapping.product_interest = originalHeader;
      } else if (!mapping.notes && (/note|notes|remark|comment/i.test(h))) {
        mapping.notes = originalHeader;
      }
    });

    if (!mapping.doctor_name && headers.length > 0 && mapping.clinic_name !== headers[0] && mapping.phone !== headers[0]) {
      mapping.doctor_name = headers[0];
    }
    if (!mapping.clinic_name && headers.length > 1 && mapping.doctor_name !== headers[1] && mapping.phone !== headers[1]) {
      mapping.clinic_name = headers[1];
    }

    return mapping;
  }

  function downloadSampleCsv() {
    const header = 'doctor_name,clinic_name,phone,email,city,locality,speciality,product_interest,notes\n';
    const row1 = 'Dr. Rohan Mehra,Apex Dental Care,+919876543210,rohan@apexdental.com,Bangalore,Indiranagar,Dentist,prime,Interested in patient appointments\n';
    const row2 = 'Dr. Shalini Gupta,Skin Radiance Clinic,+919811223344,shalini@skinradiance.in,Bangalore,Koramangala,Dermatologist,reach,Wants Practo reach ads\n';
    const row3 = 'Dr. Vikram Rao,Bangalore Heart Clinic,+919988776655,vikram@heartcare.org,Bangalore,Whitefield,Cardiologist,ray,Looking for Practo Ray EMR\n';
    const blob = new Blob([header + row1 + row2 + row3], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'practo_sales_leads_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleCsvFileSelect(file) {
    if (!file) return;
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const rows = parseCsvText(text);
      if (rows.length < 1) {
        setMessage({ type: 'error', text: 'Uploaded CSV file appears to be empty.' });
        return;
      }
      const headers = rows[0].map(h => (h || '').trim());
      const dataRows = rows.slice(1).filter(r => r.some(cell => (cell || '').trim().length > 0));
      setRawHeaders(headers);
      setRawRows(dataRows);
      const guessed = guessColumnMapping(headers);
      setColumnMapping(guessed);
      setSelectedUploadRowIndices(new Set(dataRows.map((_, idx) => idx)));
      setUploadTab('preview');
      setShowUploadModal(true);
    };
    reader.readAsText(file);
  }

  function mapRowToLead(row) {
    const getValue = (fieldKey) => {
      const colName = columnMapping[fieldKey];
      if (!colName) return '';
      const colIdx = rawHeaders.indexOf(colName);
      return colIdx >= 0 && row[colIdx] ? row[colIdx].trim() : '';
    };

    const docName = getValue('doctor_name') || 'Dr. ' + (getValue('clinic_name') || 'Doctor');
    const clinicName = getValue('clinic_name') || '';
    const phone = getValue('phone') || '';
    const email = getValue('email') || '';
    const city = getValue('city') || batchDefaults.city || 'Bangalore';
    const locality = getValue('locality') || '';
    const speciality = getValue('speciality') || batchDefaults.speciality || 'General Physician';
    const product = getValue('product_interest') || pushProduct || batchDefaults.product_interest || 'prime';
    const notes = getValue('notes') || '';

    return {
      name: docName,
      doctor_name: docName,
      company: clinicName,
      clinic_name: clinicName,
      phone,
      email,
      city,
      locality,
      speciality,
      title: speciality,
      product_interest: product,
      workflow_stage: pushTarget === 'crm' ? 'manual' : 'autopilot',
      notes,
      source: 'csv_custom_upload',
      stage: 'new',
      status: 'open',
      score: 75,
    };
  }

  async function handleExecutePush() {
    if (selectedUploadRowIndices.size === 0) return;
    setIsPushing(true);
    try {
      const leadsToPush = Array.from(selectedUploadRowIndices).map(idx => mapRowToLead(rawRows[idx]));
      const res = await api.bulkImportLeads(leadsToPush, {
        target: pushTarget,
        pushToAutopilot: pushTarget === 'autopilot' || pushTarget === 'both',
        defaultProduct: pushProduct,
      });

      // Immediately cache newly pushed leads so any instant browser refresh preserves them
      setLeads((prev) => {
        const next = [...leadsToPush.map((l, i) => ({ ...l, id: l.id || `lead_pushed_${Date.now()}_${i}` })), ...prev];
        try { localStorage.setItem('elite_leads_cache', JSON.stringify(next)); } catch {}
        return next;
      });
      setTotal((prev) => prev + leadsToPush.length);

      const msg = pushTarget === 'crm'
        ? `Successfully imported ${res.imported || leadsToPush.length} leads into CRM!`
        : `Successfully pushed ${res.imported || leadsToPush.length} leads into CRM and enqueued ${res.enqueued || res.imported || leadsToPush.length} into Autopilot queue!`;
      setMessage({ type: 'success', text: msg });
      setShowUploadModal(false);
      setUploadFile(null);
      setRawRows([]);
      fetchLeads();
    } catch (err) {
      setMessage({ type: 'error', text: `Failed to push leads: ${err.message}` });
    } finally {
      setIsPushing(false);
    }
  }

  function handleImportClick() {
    setShowUploadModal(true);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await api.createLead(form);
      setShowModal(false);
      setForm({
        name: '',
        phone: '',
        email: '',
        company: '',
        title: 'General Physician',
        city: 'Bangalore',
        locality: 'Indiranagar',
        source: 'manual',
        stage: 'new',
        status: 'open',
        notes: '',
        product_interest: 'prime',
        workflow_stage: 'manual'
      });
      setMessage({ type: 'success', text: 'New lead added and persisted successfully!' });
      if (created) {
        setLeads((prev) => {
          const next = [created, ...prev.filter((l) => l.id !== created.id)];
          try { localStorage.setItem('elite_leads_cache', JSON.stringify(next)); } catch {}
          return next;
        });
        setTotal((prev) => prev + 1);
      }
      fetchLeads();
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this lead?')) return;
    try {
      await api.deleteLead(id);
      setLeads((prev) => {
        const next = prev.filter((l) => l.id !== id);
        try { localStorage.setItem('elite_leads_cache', JSON.stringify(next)); } catch {}
        return next;
      });
      setTotal((prev) => Math.max(0, prev - 1));
      if (detailLead && detailLead.id === id) setDetailLead(null);
      fetchLeads();
    } catch (e) {
      setMessage({ type: 'error', text: e.message });
    }
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 24 }}>👥</span>
            <h1 className="page-title">Enterprise CRM Leads</h1>
          </div>
          <p className="text-sm text-secondary mt-1">
            {leads.length} active leads · Multi-level import/export · Real-time AI Call & Outreach Tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleCsvFileSelect(f);
              e.target.value = '';
            }}
            accept=".csv"
            style={{ display: 'none' }}
          />
          <button className="btn btn-secondary btn-sm" onClick={() => setShowUploadModal(true)}>
            📥 Upload CSV (Custom & Push)
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExportCsv}>
            📤 Export CSV
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExportJson}>
            📤 Export JSON
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            + Add Lead
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          {message.type === 'error' ? '❌' : '✅'} {message.text}
        </div>
      )}

      {/* Batch Actions Bar (visible when items checked) */}
      {selectedIds.length > 0 && (
        <div
          className="card mb-4 flex justify-between items-center"
          style={{ background: '#EFF6FF', borderColor: '#BFDBFE', padding: '12px 20px' }}
        >
          <div className="flex items-center gap-3">
            <span className="badge badge-blue">{selectedIds.length} Selected</span>
            <span className="text-xs font-medium text-secondary">Apply batch actions:</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-primary btn-sm" onClick={() => setBatchModal(true)}>
              🚀 Push to Auto Pilot
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleBatchManual}>
              📞 Assign to Manual Queue
            </button>
            <button className="btn btn-danger btn-sm" onClick={handleBatchDelete}>
              🗑 Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Filters & Tabs */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="tab-group">
          {[
            ['all', 'All Leads'],
            ['autopilot', '🚀 Autopilot Queue'],
            ['manual', '📞 Manual Dialing Queue'],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`tab-btn ${workflowTab === key ? 'active' : ''}`}
              onClick={() => setWorkflowTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          <input
            className="input"
            placeholder="🔍 Search name, clinic, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 220, padding: '6px 12px', fontSize: 13 }}
          />

          <select
            className="input"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            style={{ width: 140, padding: '6px 10px', fontSize: 12.5 }}
          >
            <option value="">All Stages</option>
            {STAGES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>

          <select
            className="input"
            value={productFilter}
            onChange={(e) => setProductFilter(e.target.value)}
            style={{ width: 130, padding: '6px 10px', fontSize: 12.5 }}
          >
            <option value="">All Products</option>
            <option value="prime">Practo Prime</option>
            <option value="reach">Practo Reach</option>
          </select>

          <button className="btn btn-ghost btn-sm" onClick={fetchLeads} title="Refresh CRM Leads">⟳</button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
            <p className="text-sm text-secondary">Loading CRM leads & live statuses...</p>
          </div>
        ) : leads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>👥</div>
            <h3 className="section-title">No Leads Match Your Criteria</h3>
            <p className="text-sm text-muted mt-1">
              Find new clinics using the <strong>Lead Scraper</strong> or click <strong>Add Lead</strong> above.
            </p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === leads.length && leads.length > 0}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th>Clinic / Doctor</th>
                  <th>Location</th>
                  <th>Practo Status</th>
                  <th>Product</th>
                  <th>Workflow</th>
                  <th>Pipeline Stage</th>
                  <th>Live Outreach / Call Status</th>
                  <th>Score</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const isChecked = selectedIds.includes(lead.id);
                  const isPrime = lead.product_interest === 'prime';

                  return (
                    <tr key={lead.id} style={isChecked ? { background: '#F8FAFC' } : {}}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(lead.id)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>

                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 13.5 }}>
                          {lead.company || lead.clinic_name || lead.name}
                        </div>
                        <div className="text-xs text-secondary mt-1">
                          👤 {lead.owner_name || lead.doctor_name || lead.name} · 📞 <strong>{lead.phone || '—'}</strong>
                        </div>
                        {lead.email && <div className="text-xs text-muted truncate" style={{ maxWidth: 180 }}>✉️ {lead.email}</div>}
                      </td>

                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{lead.city || 'Bangalore'}</div>
                        <div className="text-xs text-muted">{lead.locality || lead.speciality || lead.title || 'General'}</div>
                      </td>

                      <td>
                        {lead.on_practo === 1 ? (
                          <span className="badge badge-practo">✓ On Practo</span>
                        ) : (
                          <span className="badge badge-unlisted">⚡ Unlisted</span>
                        )}
                      </td>

                      <td>
                        <span className={`badge ${isPrime ? 'badge-blue' : 'badge-teal'}`}>
                          {isPrime ? '⚡ Prime' : '🎯 Reach'}
                        </span>
                      </td>

                      <td>
                        <span className={`badge ${lead.workflow_stage === 'autopilot' ? 'badge-purple' : 'badge-gray'}`}>
                          {lead.workflow_stage === 'autopilot' ? '🚀 Autopilot' : '📞 Manual'}
                        </span>
                      </td>

                      <td>
                        <StageDropdown lead={lead} onUpdate={fetchLeads} />
                      </td>

                      <td>
                        <StatusBadge status={lead.status} stage={lead.stage} />
                        {lead.next_action && (
                          <div className="text-xs text-secondary mt-1 truncate" style={{ maxWidth: 200 }} title={lead.next_action}>
                            🎯 {lead.next_action}
                          </div>
                        )}
                        {lead.value > 0 && (
                          <div className="text-xs font-bold text-success mt-0.5">
                            ₹{Number(lead.value).toLocaleString('en-IN')}
                          </div>
                        )}
                        {lead.last_contacted_at && (
                          <div className="text-xs text-muted mt-0.5">
                            🕒 {new Date(lead.last_contacted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </td>

                      <td>
                        <div className="flex items-center gap-2">
                          <div style={{ width: 44, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${lead.score || 0}%`, height: '100%', background: lead.score >= 70 ? '#10B981' : lead.score >= 40 ? '#F59E0B' : '#94A3B8' }} />
                          </div>
                          <span className="text-xs font-bold text-secondary">{lead.score || 0}</span>
                        </div>
                      </td>

                      <td>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() => handleDirectAiCall(lead)}
                            disabled={callingLeadId === lead.id}
                            title="Directly trigger Sarvam Voice AI Call"
                          >
                            {callingLeadId === lead.id ? '📞 Dialing...' : '📞 Call AI'}
                          </button>

                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '4px 8px', fontSize: 12 }}
                            onClick={() => handleOpenDetail(lead)}
                            title="View Full Lead Details & Timeline"
                          >
                            👁️
                          </button>

                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '4px 8px', fontSize: 12 }}
                            onClick={() => {
                              setSelectedIds([lead.id]);
                              setBatchModal(true);
                            }}
                            title="Push to Autopilot AI Pipeline"
                          >
                            🚀
                          </button>

                          <button
                            className="btn btn-danger btn-sm"
                            style={{ padding: '4px 8px', fontSize: 11 }}
                            onClick={() => handleDelete(lead.id)}
                            title="Delete Lead"
                          >
                            🗑
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

      {/* Batch Push to Autopilot Modal */}
      {batchModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setBatchModal(false)}>
          <div className="modal fade-in">
            <div className="modal-header">
              <h2 className="section-title">Push {selectedIds.length} Lead(s) to Autopilot AI</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setBatchModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p className="text-sm text-secondary">
                Selected leads will enter the multi-stage outreach workflow: Sarvam Voice AI Call → WhatsApp AI follow-up → Draft Proposal.
              </p>

              <div>
                <label className="text-xs font-bold text-secondary mb-2" style={{ display: 'block', textTransform: 'uppercase' }}>
                  Select Outbound Campaign Product
                </label>
                <div className="grid-2" style={{ gap: 10 }}>
                  <label
                    style={{
                      border: `2px solid ${batchProduct === 'prime' ? '#1456FD' : '#E2E8F0'}`,
                      background: batchProduct === 'prime' ? '#EFF6FF' : '#FFFFFF',
                      padding: 14,
                      borderRadius: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="batchProduct"
                      checked={batchProduct === 'prime'}
                      onChange={() => setBatchProduct('prime')}
                      style={{ marginRight: 8 }}
                    />
                    <strong>Practo Prime</strong>
                    <p className="text-xs text-secondary mt-1">Pitch assured appointments & 24/7 online scheduling.</p>
                  </label>

                  <label
                    style={{
                      border: `2px solid ${batchProduct === 'reach' ? '#0D9488' : '#E2E8F0'}`,
                      background: batchProduct === 'reach' ? '#F0FDFA' : '#FFFFFF',
                      padding: 14,
                      borderRadius: 12,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="batchProduct"
                      checked={batchProduct === 'reach'}
                      onChange={() => setBatchProduct('reach')}
                      style={{ marginRight: 8 }}
                    />
                    <strong>Practo Reach</strong>
                    <p className="text-xs text-secondary mt-1">Pitch top-ranked spotlight placement in local search.</p>
                  </label>
                </div>
              </div>

              <div className="flex justify-between items-center mt-2 pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setBatchModal(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleBatchAutopilot}
                  disabled={batchProcessing}
                >
                  {batchProcessing ? <span className="spinner" style={{ width: 16, height: 16 }} /> : `Launch Autopilot (${selectedIds.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal fade-in" style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h2 className="section-title">Add Clinic Lead</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="text-xs text-muted font-bold mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>Doctor Name *</label>
                  <input className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Dr. Rajesh Kumar" />
                </div>
                <div>
                  <label className="text-xs text-muted font-bold mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>Phone *</label>
                  <input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required placeholder="+91 98765 43210" />
                </div>
                <div>
                  <label className="text-xs text-muted font-bold mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>Clinic / Hospital Name</label>
                  <input className="input" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} placeholder="Indiranagar Care Clinic" />
                </div>
                <div>
                  <label className="text-xs text-muted font-bold mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>Email</label>
                  <input className="input" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="doctor@clinic.com" />
                </div>
                <div>
                  <label className="text-xs text-muted font-bold mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>Speciality</label>
                  <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="General Physician / Cardiologist" />
                </div>
                <div>
                  <label className="text-xs text-muted font-bold mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>City</label>
                  <input className="input" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Bangalore" />
                </div>
                <div>
                  <label className="text-xs text-muted font-bold mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>Locality / Area</label>
                  <input className="input" value={form.locality} onChange={(e) => setForm((f) => ({ ...f, locality: e.target.value }))} placeholder="Indiranagar" />
                </div>
                <div>
                  <label className="text-xs text-muted font-bold mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>Product Target</label>
                  <select className="input" value={form.product_interest} onChange={(e) => setForm((f) => ({ ...f, product_interest: e.target.value }))}>
                    <option value="prime">⚡ Practo Prime</option>
                    <option value="reach">🎯 Practo Reach</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted font-bold mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>Initial Workflow</label>
                  <select className="input" value={form.workflow_stage} onChange={(e) => setForm((f) => ({ ...f, workflow_stage: e.target.value }))}>
                    <option value="manual">📞 Manual Dialing</option>
                    <option value="autopilot">🚀 Auto Pilot Queue</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted font-bold mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>Pipeline Stage</label>
                  <select className="input" value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}>
                    {STAGES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="text-xs text-muted font-bold mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>Notes & Context</label>
                <textarea className="input" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Clinic highlights, patient volume, consultation fee..." style={{ resize: 'vertical' }} />
              </div>

              <div className="flex gap-3 justify-between items-center">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving Lead...' : 'Save Lead to CRM'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Details & Activity History Drawer / Modal */}
      {detailLead && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setDetailLead(null)}>
          <div className="modal fade-in" style={{ maxWidth: 720, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <h2 className="section-title">{detailLead.company || detailLead.clinic_name || detailLead.name}</h2>
                <p className="text-xs text-secondary mt-1">
                  👤 {detailLead.owner_name || detailLead.doctor_name || detailLead.name} · 📞 {detailLead.phone || 'No phone'} · 📍 {detailLead.locality || detailLead.city || 'Bangalore'}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setDetailLead(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Summary card */}
              <div className="card" style={{ background: '#F8FAFC', padding: '14px 18px', borderLeft: '4px solid #1456FD' }}>
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <div>
                    <span className="text-xs text-muted uppercase font-bold">Pipeline Stage:</span>
                    <span className="badge badge-blue ml-2">{detailLead.stage?.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted uppercase font-bold">Live Status:</span>
                    <span className="ml-2"><StatusBadge status={detailLead.status} stage={detailLead.stage} /></span>
                  </div>
                  <div>
                    <span className="text-xs text-muted uppercase font-bold">Product:</span>
                    <span className="badge badge-teal ml-2">Practo {detailLead.product_interest?.toUpperCase()}</span>
                  </div>
                  {detailLead.value > 0 && (
                    <div>
                      <span className="text-xs text-muted uppercase font-bold">Pipeline Value:</span>
                      <strong className="text-success ml-2">₹{Number(detailLead.value).toLocaleString('en-IN')}</strong>
                    </div>
                  )}
                </div>

                {detailLead.next_action && (
                  <div className="text-xs text-secondary mt-2 pt-2" style={{ borderTop: '1px dashed #E2E8F0' }}>
                    <strong>🎯 Next Action:</strong> {detailLead.next_action}
                  </div>
                )}
                {detailLead.last_contacted_at && (
                  <div className="text-xs text-muted mt-1">
                    <strong>🕒 Last Contact:</strong> {new Date(detailLead.last_contacted_at).toLocaleString()}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleDirectAiCall(detailLead)}
                  disabled={callingLeadId === detailLead.id}
                >
                  {callingLeadId === detailLead.id ? '📞 Dialing AI...' : '📞 Place Outbound AI Call'}
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setSelectedIds([detailLead.id]);
                    setBatchModal(true);
                  }}
                >
                  🚀 Push to Auto Pilot
                </button>
              </div>

              {/* Notes */}
              {detailLead.notes && (
                <div className="card" style={{ padding: 14 }}>
                  <h4 className="text-xs font-bold text-secondary uppercase mb-2">Lead Notes & Call History</h4>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#334155', fontFamily: 'inherit' }}>
                    {detailLead.notes}
                  </pre>
                </div>
              )}

              {/* Add Activity Form */}
              <form onSubmit={handleAddActivity} className="card" style={{ padding: 14 }}>
                <h4 className="text-xs font-bold text-secondary uppercase mb-2">Log Activity / Note</h4>
                <div className="flex gap-2">
                  <input
                    className="input"
                    placeholder="Enter call notes, objection notes, or follow-up task..."
                    value={newActivityText}
                    onChange={(e) => setNewActivityText(e.target.value)}
                    style={{ flex: 1, fontSize: 12.5 }}
                  />
                  <button type="submit" className="btn btn-secondary btn-sm" disabled={addingActivity || !newActivityText.trim()}>
                    {addingActivity ? 'Adding...' : 'Add Note'}
                  </button>
                </div>
              </form>

              {/* Activities Timeline */}
              <div>
                <h4 className="text-xs font-bold text-secondary uppercase mb-2">Activity & Outreach Timeline</h4>
                {(!detailLead.activities || detailLead.activities.length === 0) ? (
                  <p className="text-xs text-muted">No logged activities yet. Click "Place Outbound AI Call" above to initiate outreach.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {detailLead.activities.map((act) => (
                      <div key={act.id} className="card" style={{ padding: '10px 14px', fontSize: 12 }}>
                        <div className="flex justify-between items-center">
                          <strong>{act.title}</strong>
                          <span className="text-xs text-muted">{new Date(act.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {act.detail && <p className="text-xs text-secondary mt-1">{act.detail}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload CSV & Custom Mapping & Choose & Push Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowUploadModal(false)}>
          <div className="modal fade-in" style={{ maxWidth: 940, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-header flex justify-between items-center" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: 14 }}>
              <div>
                <h3 className="modal-title flex items-center gap-2">
                  <span>📥</span> Leads CSV Upload & Push Engine
                </h3>
                <p className="text-xs text-secondary mt-1">
                  Upload custom lead CSVs, customize column mappings, select individual leads, and push to CRM or Autopilot queue.
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowUploadModal(false)}>✕</button>
            </div>

            {/* File Upload / Source Bar */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
              <input
                type="file"
                ref={csvModalFileInputRef}
                accept=".csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleCsvFileSelect(f);
                  e.target.value = '';
                }}
              />
              {!uploadFile ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f && f.name.endsWith('.csv')) handleCsvFileSelect(f);
                    else setMessage({ type: 'error', text: 'Please drop a valid .csv file' });
                  }}
                  style={{
                    border: isDragOver ? '2px dashed #0ea5e9' : '2px dashed #cbd5e1',
                    borderRadius: 10,
                    padding: '24px 20px',
                    textAlign: 'center',
                    background: isDragOver ? '#f0f9ff' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => csvModalFileInputRef.current?.click()}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
                  <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>
                    Click to browse or drag & drop your leads CSV file here
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    Supports any CSV format (Google Sheets, Apollo, Practo Scrapes, Excel). Intelligent auto-mapping will detect headers.
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => { e.stopPropagation(); downloadSampleCsv(); }}
                    >
                      📥 Download Sample CSV Template
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 10 }}>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 20 }}>📄</span>
                    <div>
                      <strong style={{ fontSize: 13, color: '#0f172a' }}>{uploadFile.name}</strong>
                      <div className="text-xs text-secondary">
                        {Math.round(uploadFile.size / 1024)} KB · {rawRows.length} data rows detected · {rawHeaders.length} columns found
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => csvModalFileInputRef.current?.click()}
                    >
                      🔄 Change CSV File
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={downloadSampleCsv}
                    >
                      📥 Sample Template
                    </button>
                  </div>
                </div>
              )}
            </div>

            {uploadFile && (
              <>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: 6, padding: '10px 20px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <button
                    type="button"
                    onClick={() => setUploadTab('preview')}
                    style={{
                      padding: '8px 16px',
                      fontSize: 13,
                      fontWeight: 600,
                      borderBottom: uploadTab === 'preview' ? '2px solid #0284c7' : '2px solid transparent',
                      color: uploadTab === 'preview' ? '#0284c7' : '#64748b',
                      background: 'none',
                      borderTop: 'none',
                      borderLeft: 'none',
                      borderRight: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    📋 1. Preview & Choose Leads ({selectedUploadRowIndices.size} selected)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadTab('mapping')}
                    style={{
                      padding: '8px 16px',
                      fontSize: 13,
                      fontWeight: 600,
                      borderBottom: uploadTab === 'mapping' ? '2px solid #0284c7' : '2px solid transparent',
                      color: uploadTab === 'mapping' ? '#0284c7' : '#64748b',
                      background: 'none',
                      borderTop: 'none',
                      borderLeft: 'none',
                      borderRight: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    ⚙️ 2. Custom Column Mapping ({Object.values(columnMapping).filter(Boolean).length} mapped)
                  </button>
                </div>

                {/* Tab 1: Preview & Choose Leads */}
                {uploadTab === 'preview' && (
                  <div style={{ padding: '14px 20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {/* Toolbar */}
                    <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 8 }}>
                      <div className="flex items-center gap-2" style={{ flex: 1, minWidth: 220 }}>
                        <input
                          className="input"
                          placeholder="🔍 Filter preview by doctor, clinic, city, or phone..."
                          value={uploadSearch}
                          onChange={(e) => setUploadSearch(e.target.value)}
                          style={{ fontSize: 12, padding: '6px 10px', width: '100%' }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            const filtered = rawRows
                              .map((row, idx) => ({ row, idx }))
                              .filter(({ row }) => {
                                if (!uploadSearch) return true;
                                const l = uploadSearch.toLowerCase();
                                return row.some(c => (c || '').toLowerCase().includes(l));
                              })
                              .map(({ idx }) => idx);
                            setSelectedUploadRowIndices(new Set([...selectedUploadRowIndices, ...filtered]));
                          }}
                        >
                          ☑️ Select Filtered
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setSelectedUploadRowIndices(new Set())}
                        >
                          ◻️ Deselect All
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => setUploadTab('mapping')}
                        >
                          ⚙️ Adjust Mapping
                        </button>
                      </div>
                    </div>

                    {/* Stats pill bar */}
                    <div className="flex items-center gap-3 text-xs" style={{ color: '#475569' }}>
                      <span className="badge badge-secondary">
                        Total Rows: {rawRows.length}
                      </span>
                      <span className="badge badge-primary">
                        Selected: {selectedUploadRowIndices.size}
                      </span>
                      {rawRows.filter(r => !mapRowToLead(r).phone).length > 0 && (
                        <span className="badge badge-warning" style={{ background: '#fef3c7', color: '#92400e' }}>
                          ⚠️ {rawRows.filter(r => !mapRowToLead(r).phone).length} missing phone number
                        </span>
                      )}
                    </div>

                    {/* Interactive Table */}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ maxHeight: 310, overflowY: 'auto' }}>
                        <table className="table" style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                          <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 2, borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                              <th style={{ width: 40, padding: '8px 10px', textAlign: 'center' }}>
                                <input
                                  type="checkbox"
                                  checked={rawRows.length > 0 && selectedUploadRowIndices.size === rawRows.length}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedUploadRowIndices(new Set(rawRows.map((_, i) => i)));
                                    } else {
                                      setSelectedUploadRowIndices(new Set());
                                    }
                                  }}
                                />
                              </th>
                              <th style={{ padding: '8px 10px' }}>Doctor Name</th>
                              <th style={{ padding: '8px 10px' }}>Clinic Name</th>
                              <th style={{ padding: '8px 10px' }}>Phone Number</th>
                              <th style={{ padding: '8px 10px' }}>Speciality</th>
                              <th style={{ padding: '8px 10px' }}>City / Locality</th>
                              <th style={{ padding: '8px 10px' }}>Product</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rawRows.map((row, idx) => {
                              const lead = mapRowToLead(row);
                              if (uploadSearch) {
                                const q = uploadSearch.toLowerCase();
                                const matches = Object.values(lead).some(val => String(val).toLowerCase().includes(q));
                                if (!matches) return null;
                              }
                              const isSelected = selectedUploadRowIndices.has(idx);
                              const hasPhone = Boolean(lead.phone && lead.phone.replace(/\D/g, '').length >= 10);
                              return (
                                <tr
                                  key={idx}
                                  style={{
                                    background: isSelected ? '#f0fdf4' : 'transparent',
                                    borderBottom: '1px solid #f1f5f9',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => {
                                    const next = new Set(selectedUploadRowIndices);
                                    if (next.has(idx)) next.delete(idx);
                                    else next.add(idx);
                                    setSelectedUploadRowIndices(next);
                                  }}
                                >
                                  <td style={{ textAlign: 'center', padding: '8px 10px' }}>
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        const next = new Set(selectedUploadRowIndices);
                                        if (e.target.checked) next.add(idx);
                                        else next.delete(idx);
                                        setSelectedUploadRowIndices(next);
                                      }}
                                    />
                                  </td>
                                  <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f172a' }}>
                                    {lead.name}
                                  </td>
                                  <td style={{ padding: '8px 10px', color: '#334155' }}>
                                    {lead.company || <span className="text-muted italic">None</span>}
                                  </td>
                                  <td style={{ padding: '8px 10px' }}>
                                    {hasPhone ? (
                                      <span style={{ fontFamily: 'monospace', color: '#0369a1' }}>{lead.phone}</span>
                                    ) : (
                                      <span className="badge badge-warning" style={{ fontSize: 10, background: '#fef3c7', color: '#b45309' }}>
                                        ⚠️ {lead.phone || 'No phone'}
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '8px 10px', color: '#475569' }}>
                                    {lead.speciality}
                                  </td>
                                  <td style={{ padding: '8px 10px', color: '#64748b' }}>
                                    {lead.city}{lead.locality ? `, ${lead.locality}` : ''}
                                  </td>
                                  <td style={{ padding: '8px 10px' }}>
                                    <span className="badge badge-secondary" style={{ textTransform: 'uppercase', fontSize: 10 }}>
                                      {lead.product_interest}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Custom Column Mapping */}
                {uploadTab === 'mapping' && (
                  <div style={{ padding: '16px 20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <div className="flex justify-between items-center mb-2">
                        <strong className="text-xs text-secondary uppercase font-bold">
                          Detected Columns in Your CSV ({rawHeaders.length}):
                        </strong>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            onClick={() => setColumnMapping(guessColumnMapping(rawHeaders))}
                          >
                            ⚡ Re-run Auto-Detect
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            onClick={() => setColumnMapping({
                              doctor_name: '', clinic_name: '', phone: '', email: '',
                              city: '', locality: '', speciality: '', product_interest: '', notes: ''
                            })}
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {rawHeaders.map((h, i) => (
                          <span key={i} className="badge badge-secondary" style={{ fontSize: 11 }}>
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Mapping Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                      {[
                        { key: 'doctor_name', label: 'Doctor / Provider Name *', desc: 'Primary contact or doctor name' },
                        { key: 'clinic_name', label: 'Clinic / Hospital Name *', desc: 'Facility, clinic, or company' },
                        { key: 'phone', label: 'Phone / Mobile Number *', desc: 'Used for Voice AI calling & WhatsApp' },
                        { key: 'email', label: 'Email Address', desc: 'Commercial proposal dispatch' },
                        { key: 'city', label: 'City', desc: 'e.g. Bangalore, Mumbai, Delhi' },
                        { key: 'locality', label: 'Locality / Area', desc: 'e.g. Indiranagar, Koramangala' },
                        { key: 'speciality', label: 'Speciality / Category', desc: 'e.g. Dentist, Dermatologist' },
                        { key: 'product_interest', label: 'Product Interest', desc: 'Reach, Prime, Ray, Insta' },
                        { key: 'notes', label: 'Notes / Remarks', desc: 'Custom lead notes or history' },
                      ].map(({ key, label, desc }) => {
                        const mappedCol = columnMapping[key];
                        const sampleVal = mappedCol && rawRows.length > 0 && rawHeaders.indexOf(mappedCol) >= 0
                          ? rawRows[0][rawHeaders.indexOf(mappedCol)]
                          : null;
                        return (
                          <div key={key} className="card" style={{ padding: 12, background: '#ffffff' }}>
                            <label className="text-xs font-bold text-slate-700 block mb-1">
                              {label}
                            </label>
                            <select
                              className="input text-xs"
                              value={columnMapping[key] || ''}
                              onChange={(e) => setColumnMapping({ ...columnMapping, [key]: e.target.value })}
                              style={{ width: '100%', marginBottom: 4 }}
                            >
                              <option value="">(Skip / Not Mapped)</option>
                              {rawHeaders.map((h, idx) => (
                                <option key={idx} value={h}>{h}</option>
                              ))}
                            </select>
                            <div className="flex justify-between items-center text-xs text-muted" style={{ fontSize: 11 }}>
                              <span>{desc}</span>
                              {sampleVal && (
                                <span style={{ color: '#0369a1', fontStyle: 'italic', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  Ex: "{sampleVal}"
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Batch Defaults */}
                    <div className="card" style={{ padding: 14, background: '#f8fafc' }}>
                      <h4 className="text-xs font-bold text-secondary uppercase mb-2">
                        Fallback / Batch Defaults (Used when column is skipped or cell is blank):
                      </h4>
                      <div className="flex gap-4" style={{ flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: 140 }}>
                          <label className="text-xs text-secondary block mb-1">Default City</label>
                          <input
                            className="input text-xs"
                            value={batchDefaults.city}
                            onChange={(e) => setBatchDefaults({ ...batchDefaults, city: e.target.value })}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 140 }}>
                          <label className="text-xs text-secondary block mb-1">Default Speciality</label>
                          <input
                            className="input text-xs"
                            value={batchDefaults.speciality}
                            onChange={(e) => setBatchDefaults({ ...batchDefaults, speciality: e.target.value })}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: 140 }}>
                          <label className="text-xs text-secondary block mb-1">Default Product</label>
                          <select
                            className="input text-xs"
                            value={batchDefaults.product_interest}
                            onChange={(e) => setBatchDefaults({ ...batchDefaults, product_interest: e.target.value })}
                          >
                            <option value="prime">Practo PRIME (Growth)</option>
                            <option value="reach">Practo REACH (High Ad Intent)</option>
                            <option value="ray">Practo RAY (Clinic EMR)</option>
                            <option value="insta">Practo INSTA (Enterprise)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setUploadTab('preview')}
                      >
                        ✓ Done & View Preview Table →
                      </button>
                    </div>
                  </div>
                )}

                {/* Footer: Push Action Bar */}
                <div style={{ borderTop: '1px solid #e2e8f0', padding: '14px 20px', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  {/* Push Destination Selection */}
                  <div className="flex items-center gap-3" style={{ flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                      Choose Push Destination:
                    </span>
                    <div style={{ display: 'inline-flex', borderRadius: 6, border: '1px solid #cbd5e1', overflow: 'hidden' }}>
                      <button
                        type="button"
                        onClick={() => setPushTarget('crm')}
                        style={{
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          background: pushTarget === 'crm' ? '#0284c7' : '#ffffff',
                          color: pushTarget === 'crm' ? '#ffffff' : '#334155'
                        }}
                      >
                        📁 CRM Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setPushTarget('autopilot')}
                        style={{
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          borderLeft: '1px solid #cbd5e1',
                          cursor: 'pointer',
                          background: pushTarget === 'autopilot' ? '#8b5cf6' : '#ffffff',
                          color: pushTarget === 'autopilot' ? '#ffffff' : '#334155'
                        }}
                      >
                        🚀 Autopilot Queue (AI Call)
                      </button>
                      <button
                        type="button"
                        onClick={() => setPushTarget('both')}
                        style={{
                          padding: '6px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          border: 'none',
                          borderLeft: '1px solid #cbd5e1',
                          cursor: 'pointer',
                          background: pushTarget === 'both' ? '#10b981' : '#ffffff',
                          color: pushTarget === 'both' ? '#ffffff' : '#334155'
                        }}
                      >
                        ⚡ Both (CRM + Autopilot)
                      </button>
                    </div>

                    {(pushTarget === 'autopilot' || pushTarget === 'both') && (
                      <div className="flex items-center gap-1">
                        <span style={{ fontSize: 11, color: '#64748b' }}>Campaign:</span>
                        <select
                          className="input text-xs"
                          value={pushProduct}
                          onChange={(e) => setPushProduct(e.target.value)}
                          style={{ padding: '4px 8px', height: 32 }}
                        >
                          <option value="reach">Practo REACH</option>
                          <option value="prime">Practo PRIME</option>
                          <option value="ray">Practo RAY</option>
                          <option value="insta">Practo INSTA</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setShowUploadModal(false)}
                      disabled={isPushing}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleExecutePush}
                      disabled={selectedUploadRowIndices.size === 0 || isPushing}
                      style={{
                        background: pushTarget === 'crm' ? '#0284c7' : pushTarget === 'autopilot' ? '#8b5cf6' : '#10b981',
                        borderColor: pushTarget === 'crm' ? '#0284c7' : pushTarget === 'autopilot' ? '#8b5cf6' : '#10b981'
                      }}
                    >
                      {isPushing
                        ? 'Pushing Leads...'
                        : `🚀 Push ${selectedUploadRowIndices.size} Selected Leads`}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
