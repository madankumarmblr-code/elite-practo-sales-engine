import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';

export default function PulseReports() {
  const toast = useToast();

  // Filters state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [stage, setStage] = useState('all');
  const [city, setCity] = useState('all');
  const [specialty, setSpecialty] = useState('all');
  const [assignedTo, setAssignedTo] = useState('all');
  const [groupBy, setGroupBy] = useState('stage');

  // Report query results
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);

  // Saved templates
  const [savedReports, setSavedReports] = useState([]);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);

  useEffect(() => {
    runReportQuery();
    loadSavedReports();
  }, []);

  async function loadSavedReports() {
    try {
      const data = await api.getSavedReports();
      setSavedReports(data.reports || []);
    } catch (err) {
      console.error('Failed to load saved reports:', err);
    }
  }

  async function runReportQuery(e) {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const data = await api.queryReport({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        stage,
        city,
        specialty,
        assignedTo,
        groupBy,
      });
      setReportData(data);
    } catch (err) {
      toast(err.message || 'Report query failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format = 'csv') {
    try {
      const res = await api.exportReport({
        filters: { startDate, endDate, stage, city, specialty, assignedTo, groupBy },
        format,
      });

      if (format === 'csv') {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `practo_custom_report_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast('📥 Report downloaded as CSV');
      } else {
        const json = await res.json();
        const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `practo_custom_report_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast('📥 Report downloaded as JSON');
      }
    } catch (err) {
      toast(err.message || 'Export failed');
    }
  }

  async function handleSaveTemplate() {
    if (!templateName) {
      toast('Please enter a template name');
      return;
    }
    setSavingTemplate(true);
    try {
      await api.saveReport({
        name: templateName,
        filters: { startDate, endDate, stage, city, specialty, assignedTo, groupBy },
        metrics: ['count', 'totalValue', 'avgScore'],
      });
      toast(`✅ Template "${templateName}" saved!`);
      setTemplateName('');
      setShowSaveModal(false);
      loadSavedReports();
    } catch (err) {
      toast(err.message || 'Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  }

  function applyTemplate(tpl) {
    if (!tpl.filters) return;
    const f = tpl.filters;
    if (f.startDate) setStartDate(f.startDate);
    if (f.endDate) setEndDate(f.endDate);
    if (f.stage) setStage(f.stage);
    if (f.city) setCity(f.city);
    if (f.specialty) setSpecialty(f.specialty);
    if (f.assignedTo) setAssignedTo(f.assignedTo);
    if (f.groupBy) setGroupBy(f.groupBy);
    toast(`Applied template: ${tpl.name}`);
    setTimeout(() => runReportQuery(), 50);
  }

  return (
    <div className="pulse-page px-reports" style={{ padding: 24, maxWidth: 1320, margin: '0 auto' }}>
      {/* Header */}
      <header className="pulse-head" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p className="px-eyebrow" style={{ color: '#0d9488', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.78rem' }}>
            Practo Analytics &amp; BI Engine
          </p>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '4px 0 6px', letterSpacing: '-0.02em' }}>
            Custom Report Builder &amp; Data Studio
          </h1>
          <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
            Generate multi-dimensional clinic sales breakdowns, pipeline velocity metrics, and export compliance-audited dataset reports.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className="pulse-btn ghost"
            onClick={() => setShowSaveModal(true)}
            style={{ padding: '8px 14px', fontSize: '0.82rem' }}
          >
            💾 Save As Template
          </button>
          <button
            type="button"
            className="pulse-btn ghost"
            onClick={() => handleExport('json')}
            style={{ padding: '8px 14px', fontSize: '0.82rem' }}
          >
            📋 JSON Export
          </button>
          <button
            type="button"
            className="pulse-btn teal"
            onClick={() => handleExport('csv')}
            style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700 }}
          >
            📥 Download CSV
          </button>
        </div>
      </header>

      {/* Saved Report Templates Quick-Chips */}
      {savedReports.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' }}>
            Saved Templates:
          </span>
          {savedReports.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              className="pulse-status-pill ok"
              style={{ cursor: 'pointer', border: 'none', fontSize: '0.78rem', padding: '4px 10px' }}
              onClick={() => applyTemplate(tpl)}
            >
              📑 {tpl.name}
            </button>
          ))}
        </div>
      )}

      {/* Multi-Metric Query Builder Form */}
      <section className="pulse-card px-glass" style={{ padding: 20, borderRadius: 16, marginBottom: 24 }}>
        <form onSubmit={runReportQuery} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 14, alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: 'var(--muted)' }}>
              Group Results By
            </label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem', borderRadius: 8 }}
            >
              <option value="stage">Pipeline Stage</option>
              <option value="company">Clinic Name</option>
              <option value="assigned_to">Sales Rep (AE)</option>
              <option value="source">Lead Source</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: 'var(--muted)' }}>
              Stage Filter
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem', borderRadius: 8 }}
            >
              <option value="all">All Stages</option>
              <option value="new">Discovered</option>
              <option value="validated">Validated</option>
              <option value="pitching">Pitching</option>
              <option value="demo_scheduled">Demo Scheduled</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Closed Won</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: 'var(--muted)' }}>
              City / Zone
            </label>
            <input
              type="text"
              value={city === 'all' ? '' : city}
              onChange={(e) => setCity(e.target.value || 'all')}
              placeholder="All Cities (e.g. Bangalore)"
              className="ai-input"
              style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: 'var(--muted)' }}>
              Medical Specialty
            </label>
            <input
              type="text"
              value={specialty === 'all' ? '' : specialty}
              onChange={(e) => setSpecialty(e.target.value || 'all')}
              placeholder="All (e.g. Dental)"
              className="ai-input"
              style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: 'var(--muted)' }}>
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="ai-input"
              style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4, color: 'var(--muted)' }}>
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="ai-input"
              style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <button
              type="submit"
              className="pulse-btn"
              disabled={loading}
              style={{ width: '100%', padding: '9px 16px', fontWeight: 700 }}
            >
              {loading ? 'Querying...' : '⚡ Run Query'}
            </button>
          </div>
        </form>
      </section>

      {/* Summary KPI Cards */}
      {reportData && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="pulse-card" style={{ padding: 18, borderRadius: 14 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Matching Leads
            </span>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8' }}>
              {reportData.totalMatching}
            </h3>
            <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.75rem' }}>Across {reportData.groups.length} distinct groups</p>
          </div>

          <div className="pulse-card" style={{ padding: 18, borderRadius: 14 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Total Grouped Value
            </span>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.6rem', fontWeight: 800, color: '#2dd4bf' }}>
              ₹{reportData.summary?.totalValue?.toLocaleString()}
            </h3>
            <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.75rem' }}>Estimated pipeline potential</p>
          </div>

          <div className="pulse-card" style={{ padding: 18, borderRadius: 14 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Avg Qualification Score
            </span>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b' }}>
              {reportData.summary?.avgLeadScore} / 100
            </h3>
            <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.75rem' }}>Clinic conversion readiness</p>
          </div>
        </div>
      )}

      {/* Group Aggregation Bars & Table */}
      {reportData && (
        <section className="pulse-card px-glass" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem' }}>
            Grouped Breakdown by <span style={{ color: '#2dd4bf', textTransform: 'capitalize' }}>{reportData.groupBy}</span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {reportData.groups.map((g) => {
              const maxVal = Math.max(...reportData.groups.map((x) => x.totalValue || 1));
              const pct = Math.max(8, Math.round(((g.totalValue || 0) / maxVal) * 100));

              return (
                <div key={g.groupKey} style={{ background: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 12, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div>
                      <strong style={{ fontSize: '0.95rem', textTransform: 'capitalize' }}>{g.groupKey}</strong>
                      <span className="muted" style={{ marginLeft: 8, fontSize: '0.78rem' }}>
                        ({g.count} leads · Avg Score: {g.avgScore})
                      </span>
                    </div>
                    <strong style={{ fontSize: '0.95rem', color: '#2dd4bf' }}>
                      ₹{g.totalValue?.toLocaleString()}
                    </strong>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #0d9488, #38bdf8)',
                        borderRadius: 6,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>

                  {/* Sample Leads in Group */}
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    {g.leads?.slice(0, 4).map((l) => (
                      <span
                        key={l.id}
                        style={{
                          background: 'rgba(148, 163, 184, 0.08)',
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '0.72rem',
                          color: 'var(--text-main)',
                        }}
                      >
                        🏥 {l.company || l.name} (₹{l.value?.toLocaleString()})
                      </span>
                    ))}
                    {g.leads?.length > 4 && (
                      <span className="muted" style={{ fontSize: '0.72rem', alignSelf: 'center' }}>
                        +{g.leads.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Save Template Modal */}
      {showSaveModal && (
        <div
          className="pulse-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            className="pulse-card"
            style={{ width: '100%', maxWidth: 420, padding: 24, borderRadius: 16, background: 'var(--card-bg)' }}
          >
            <h3 style={{ margin: '0 0 12px', fontSize: '1.2rem' }}>Save Report Template</h3>
            <p className="muted" style={{ margin: '0 0 16px', fontSize: '0.82rem' }}>
              Save current filter parameters to your quick-access templates.
            </p>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g. Bangalore Dental Prime Pipeline"
              className="ai-input"
              style={{ width: '100%', padding: '10px 14px', fontSize: '0.88rem', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="pulse-btn ghost"
                onClick={() => setShowSaveModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pulse-btn"
                disabled={savingTemplate}
                onClick={handleSaveTemplate}
              >
                {savingTemplate ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
