import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';

export default function PulseValidation() {
  const toast = useToast();
  const [leads, setLeads] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selected, setSelected] = useState({});
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadLeads();
  }, []);

  async function loadLeads() {
    setBusy(true);
    try {
      const data = await api.pulseLeads();
      const raw = data.leads || [];
      const res = await api.validateLeads(raw);
      setLeads(res.leads || []);
      setSummary(res.summary || null);
    } catch (err) {
      toast(err.message || 'Failed to validate leads');
    } finally {
      setBusy(false);
    }
  }

  async function revalidate() {
    setBusy(true);
    try {
      const res = await api.validateLeads(leads);
      setLeads(res.leads || []);
      setSummary(res.summary || null);
      toast('Lead validation updated');
    } catch (err) {
      toast(err.message || 'Re-validation failed');
    } finally {
      setBusy(false);
    }
  }

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      if (filterStatus === 'valid' && l.validationStatus !== 'VALID') return false;
      if (filterStatus === 'duplicate' && !l.isDuplicate) return false;
      if (filterStatus === 'invalid' && l.validationStatus !== 'INVALID') return false;
      if (filterStatus === 'high' && (l.authenticityScore || 0) < 75) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const blob = `${l.clinicName} ${l.doctorName} ${l.phone} ${l.email} ${l.locality} ${l.specialty}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [leads, filterStatus, searchTerm]);

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const selectedLeads = leads.filter((l) => selected[l.id]);

  function toggleAll() {
    if (filteredLeads.every((l) => selected[l.id])) {
      const next = { ...selected };
      filteredLeads.forEach((l) => delete next[l.id]);
      setSelected(next);
    } else {
      const next = { ...selected };
      filteredLeads.forEach((l) => {
        next[l.id] = true;
      });
      setSelected(next);
    }
  }

  async function pushValidatedToAutopilot() {
    const toPush = selectedCount ? selectedLeads : filteredLeads.filter((l) => l.validationStatus === 'VALID');
    if (!toPush.length) {
      toast('No valid leads selected to push');
      return;
    }
    setBusy(true);
    try {
      const res = await api.pulseAutopilotPush({ leads: toPush, level: 'sequence' });
      toast(res.message || `Pushed ${toPush.length} validated leads to AI Autopilot`);
      setSelected({});
    } catch (err) {
      toast(err.message || 'Push to autopilot failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="pulse-page">
      <header className="pulse-head row">
        <div>
          <span className="px-eyebrow">Data Quality &amp; Verification</span>
          <h1>Lead Validation Studio</h1>
          <p>
            Verify 10-digit Indian phone numbers (+91 standard), email format validity, duplicate checks against CRM, and calculate Authenticity Confidence Scores before pushing to Autopilot.
          </p>
        </div>
        <div className="pulse-actions">
          <button type="button" className="pulse-btn ghost" disabled={busy} onClick={revalidate}>
            {busy ? 'Validating…' : 'Re-Validate'}
          </button>
          <button
            type="button"
            className="pulse-btn"
            disabled={busy || (!selectedCount && !filteredLeads.length)}
            onClick={pushValidatedToAutopilot}
          >
            Push Validated to Autopilot {selectedCount ? `(${selectedCount})` : ''}
          </button>
        </div>
      </header>

      {/* Validation Metrics KPIs */}
      <div className="pulse-kpis" style={{ marginBottom: 16 }}>
        <div className="pulse-kpi tone-teal">
          <span>Total Checked</span>
          <strong>{summary?.total ?? leads.length}</strong>
          <em>pipeline leads</em>
        </div>
        <div className="pulse-kpi tone-teal">
          <span>Verified Valid</span>
          <strong style={{ color: '#2dd4bf' }}>{summary?.valid ?? 0}</strong>
          <em>10-digit phone ready</em>
        </div>
        <div className="pulse-kpi tone-amber">
          <span>Duplicates</span>
          <strong style={{ color: '#fbbf24' }}>{summary?.duplicates ?? 0}</strong>
          <em>matched in CRM</em>
        </div>
        <div className="pulse-kpi tone-blue">
          <span>High Quality (&gt;75%)</span>
          <strong style={{ color: '#38bdf8' }}>{summary?.highQuality ?? 0}</strong>
          <em>rich profile &amp; ratings</em>
        </div>
        <div className="pulse-kpi tone-teal">
          <span>Avg. Authenticity</span>
          <strong>{summary?.avgScore ?? 0}%</strong>
          <em>composite confidence</em>
        </div>
      </div>

      {/* Filters and Controls */}
      <section className="pulse-card" style={{ marginBottom: 16 }}>
        <div className="pulse-filters" style={{ padding: 0, background: 'transparent' }}>
          <label>
            Filter Status
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Leads ({leads.length})</option>
              <option value="valid">Valid &amp; Verified Only</option>
              <option value="high">High Quality Score (&gt;75%)</option>
              <option value="duplicate">Duplicates in CRM</option>
              <option value="invalid">Invalid / Needs Review</option>
            </select>
          </label>
          <label style={{ flex: 1 }}>
            Search Verified Leads
            <input
              type="search"
              placeholder="Search by clinic, doctor, phone, locality…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
        </div>
      </section>

      {/* Validation Table */}
      <section className="pulse-card">
        <div className="pulse-head row" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Verified Clinics ({filteredLeads.length})</h2>
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            {selectedCount ? `${selectedCount} selected` : 'Select leads or push all valid'}
          </span>
        </div>

        <div className="pulse-table-wrap">
          <table className="pulse-table">
            <thead>
              <tr>
                <th>
                  <input
                    type="checkbox"
                    checked={filteredLeads.length > 0 && filteredLeads.every((l) => selected[l.id])}
                    onChange={toggleAll}
                  />
                </th>
                <th>Clinic / Doctor</th>
                <th>Phone Validation</th>
                <th>Email Check</th>
                <th>Authenticity Score</th>
                <th>Practo Status</th>
                <th>Verification Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!selected[lead.id]}
                      onChange={() => setSelected((s) => ({ ...s, [lead.id]: !s[lead.id] }))}
                    />
                  </td>
                  <td>
                    <strong>{lead.clinicName}</strong>
                    <div className="muted">{lead.doctorName} · {lead.locality}, {lead.city}</div>
                  </td>
                  <td>
                    {lead.phoneValid ? (
                      <div>
                        <span className="pulse-status-pill ok">{lead.phone}</span>
                        <div className="muted" style={{ fontSize: '0.75rem', marginTop: 2 }}>
                          {lead.phoneType === 'mobile' ? 'Mobile (WhatsApp ready ✓)' : 'Landline ✓'}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <span className="pulse-status-pill warn">{lead.phone || 'Missing'}</span>
                        <div className="muted" style={{ fontSize: '0.75rem', marginTop: 2, color: '#f87171' }}>
                          Invalid number format
                        </div>
                      </div>
                    )}
                  </td>
                  <td>
                    {lead.emailValid ? (
                      <span className="pulse-status-pill ok" title={lead.email}>
                        Valid ({lead.email})
                      </span>
                    ) : lead.email ? (
                      <span className="pulse-status-pill warn" title={lead.email}>
                        Domain issue ({lead.email})
                      </span>
                    ) : (
                      <span className="pulse-status-pill idle">Phone-only</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          flex: 1,
                          height: 6,
                          background: 'rgba(148, 163, 184, 0.2)',
                          borderRadius: 3,
                          overflow: 'hidden',
                          minWidth: 50,
                        }}
                      >
                        <div
                          style={{
                            width: `${lead.authenticityScore || 50}%`,
                            height: '100%',
                            background:
                              (lead.authenticityScore || 0) >= 75
                                ? '#2dd4bf'
                                : (lead.authenticityScore || 0) >= 50
                                ? '#38bdf8'
                                : '#f59e0b',
                          }}
                        />
                      </div>
                      <strong style={{ fontSize: '0.85rem' }}>{lead.authenticityScore || 50}%</strong>
                    </div>
                  </td>
                  <td>
                    <span className="pulse-chip">{lead.practoProfileStatus || 'Unclaimed'}</span>
                  </td>
                  <td>
                    <span
                      className={`pulse-status-pill ${
                        lead.validationStatus === 'VALID'
                          ? 'ok'
                          : lead.validationStatus === 'DUPLICATE'
                          ? 'idle'
                          : 'warn'
                      }`}
                    >
                      {lead.validationStatus}
                    </span>
                    {lead.validationIssues?.length ? (
                      <div className="muted" style={{ fontSize: '0.72rem', marginTop: 2 }}>
                        {lead.validationIssues[0]}
                      </div>
                    ) : null}
                  </td>
                  <td className="pulse-row-actions">
                    <Link className="pulse-btn ghost" to={`/pulse/crm?search=${encodeURIComponent(lead.clinicName)}`}>
                      CRM
                    </Link>
                  </td>
                </tr>
              ))}
              {!filteredLeads.length ? (
                <tr>
                  <td colSpan={8} className="empty">
                    No leads matching current validation filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
