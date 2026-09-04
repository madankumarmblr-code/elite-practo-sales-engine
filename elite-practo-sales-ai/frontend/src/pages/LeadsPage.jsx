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

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stage, setStage] = useState('');
  const [workflowTab, setWorkflowTab] = useState('all'); // 'all' | 'autopilot' | 'manual'
  const [productFilter, setProductFilter] = useState(''); // '' | 'prime' | 'reach'

  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', company: '', title: '', city: 'Bangalore', locality: 'Indiranagar', source: 'manual', stage: 'new', notes: '', product_interest: 'prime' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Batch modal
  const [batchModal, setBatchModal] = useState(false);
  const [batchProduct, setBatchProduct] = useState('prime');
  const [batchProcessing, setBatchProcessing] = useState(false);

  const fileInputRef = useRef(null);

  async function fetchLeads() {
    setLoading(true);
    try {
      const data = await api.getLeads({
        search,
        stage: stage || undefined,
        limit: 100,
      });
      let filtered = data.leads || [];
      if (workflowTab === 'autopilot') filtered = filtered.filter((l) => l.workflow_stage === 'autopilot');
      if (workflowTab === 'manual') filtered = filtered.filter((l) => l.workflow_stage === 'manual');
      if (productFilter) filtered = filtered.filter((l) => l.product_interest === productFilter);

      setLeads(filtered);
      setTotal(data.total || 0);
    } catch (e) {
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
      setSelectedIds([]);
      fetchLeads();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  function handleExportCsv() {
    const url = api.exportLeadsUrl({ stage, workflowStage: workflowTab !== 'all' ? workflowTab : undefined });
    window.open(url, '_blank');
  }

  function handleImportClick() {
    if (fileInputRef.current) fileInputRef.current.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target.result;
      const lines = text.split(/\r?\n/);
      if (lines.length < 2) return;

      const importedLeads = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const parts = line.split(',');
        if (parts.length >= 2) {
          importedLeads.push({
            name: parts[0]?.replace(/"/g, '').trim(),
            company: parts[1]?.replace(/"/g, '').trim() || '',
            phone: parts[2]?.replace(/"/g, '').trim() || '',
            email: parts[3]?.replace(/"/g, '').trim() || '',
            city: parts[4]?.replace(/"/g, '').trim() || 'Bangalore',
            title: parts[5]?.replace(/"/g, '').trim() || 'General Physician',
            source: 'csv_import',
            stage: 'new',
            score: 70,
          });
        }
      }

      if (importedLeads.length > 0) {
        try {
          await api.bulkImportLeads(importedLeads);
          setMessage({ type: 'success', text: `Imported ${importedLeads.length} leads from CSV!` });
          fetchLeads();
        } catch (err) {
          setMessage({ type: 'error', text: err.message });
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.createLead(form);
      setShowModal(false);
      setForm({ name: '', phone: '', email: '', company: '', title: '', city: 'Bangalore', locality: 'Indiranagar', source: 'manual', stage: 'new', notes: '', product_interest: 'prime' });
      setMessage({ type: 'success', text: 'New lead added successfully!' });
      fetchLeads();
    } catch (err) { setMessage({ type: 'error', text: err.message }); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this lead?')) return;
    try { await api.deleteLead(id); fetchLeads(); } catch (e) { setMessage({ type: 'error', text: e.message }); }
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
            {leads.length} active leads · Multi-level import/export · Instant push to Autopilot AI
          </p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            style={{ display: 'none' }}
          />
          <button className="btn btn-secondary btn-sm" onClick={handleImportClick}>
            📥 Import CSV
          </button>
          <button className="btn btn-secondary btn-sm" onClick={handleExportCsv}>
            📤 Export CSV
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

          <button className="btn btn-ghost btn-sm" onClick={fetchLeads}>⟳</button>
        </div>
      </div>

      {/* Leads Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
            <p className="text-sm text-secondary">Loading CRM leads...</p>
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
                  <th>Stage</th>
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
                          {lead.company || lead.name}
                        </div>
                        <div className="text-xs text-secondary mt-1">
                          👤 {lead.owner_name || lead.name} · 📞 <strong>{lead.phone || '—'}</strong>
                        </div>
                        {lead.email && <div className="text-xs text-muted truncate" style={{ maxWidth: 180 }}>✉️ {lead.email}</div>}
                      </td>

                      <td>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{lead.city || 'Bangalore'}</div>
                        <div className="text-xs text-muted">{lead.locality || lead.title || 'General'}</div>
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
                        <div className="flex items-center gap-2">
                          <div style={{ width: 44, height: 6, background: '#E2E8F0', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${lead.score || 0}%`, height: '100%', background: lead.score >= 70 ? '#10B981' : lead.score >= 40 ? '#F59E0B' : '#94A3B8' }} />
                          </div>
                          <span className="text-xs font-bold text-secondary">{lead.score || 0}</span>
                        </div>
                      </td>

                      <td>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '3px 8px', fontSize: 11 }}
                            onClick={() => {
                              setSelectedIds([lead.id]);
                              setBatchModal(true);
                            }}
                            title="Push to Autopilot AI"
                          >
                            🚀
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ padding: '3px 8px', fontSize: 11 }}
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
          <div className="modal fade-in">
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
                  <input className="input" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required placeholder="+91 98..." />
                </div>
                <div>
                  <label className="text-xs text-muted font-bold mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>Clinic / Hospital Name</label>
                  <input className="input" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} placeholder="Indiranagar Care Clinic" />
                </div>
                <div>
                  <label className="text-xs text-muted font-bold mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>Speciality</label>
                  <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Cardiologist" />
                </div>
                <div>
                  <label className="text-xs text-muted font-bold mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>City</label>
                  <input className="input" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Bangalore" />
                </div>
                <div>
                  <label className="text-xs text-muted font-bold mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>Product Target</label>
                  <select className="input" value={form.product_interest} onChange={(e) => setForm((f) => ({ ...f, product_interest: e.target.value }))}>
                    <option value="prime">Practo Prime</option>
                    <option value="reach">Practo Reach</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className="text-xs text-muted font-bold mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>Notes & Context</label>
                <textarea className="input" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} placeholder="Clinic highlights, patient volume..." style={{ resize: 'vertical' }} />
              </div>

              <div className="flex gap-3 justify-between items-center">
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Lead'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
