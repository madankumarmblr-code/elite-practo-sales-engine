import React, { useState, useEffect } from 'react';
import { useCrm } from '../context/CrmContext';
import { api } from '../services/api';

export default function Reports() {
  const { addToast, hasPermission } = useCrm();
  const [metric, setMetric] = useState('revenue');
  const [groupBy, setGroupBy] = useState('specialty');
  const [dateRange, setDateRange] = useState('30d');
  const [reportResult, setReportResult] = useState(null);
  const [savedReports, setSavedReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [customReportName, setCustomReportName] = useState('');

  const runQuery = async () => {
    try {
      setLoading(true);
      const data = await api.queryReport({ metric, groupBy, dateRange });
      setReportResult(data);
    } catch (err) {
      addToast(err.message || 'Failed to generate report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedReports = async () => {
    try {
      const data = await api.getSavedReports();
      setSavedReports(data || []);
    } catch (err) {
      console.warn('Error loading saved reports');
    }
  };

  useEffect(() => {
    runQuery();
    loadSavedReports();
  }, [metric, groupBy, dateRange]);

  const handleSaveReport = async (e) => {
    e.preventDefault();
    if (!customReportName.trim()) return;
    try {
      const newRep = await api.saveReport({
        name: customReportName.trim(),
        metric,
        groupBy,
        chartType: 'bar',
      });
      setSavedReports((prev) => [newRep, ...prev]);
      setCustomReportName('');
      addToast('Custom report saved successfully', 'success');
    } catch (err) {
      addToast(err.message || 'Failed to save report', 'error');
    }
  };

  const handleExportData = () => {
    if (!reportResult?.results) return;
    const jsonStr = JSON.stringify(reportResult, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `custom_crm_report_${metric}_by_${groupBy}.json`;
    a.click();
    addToast('Report JSON exported', 'success');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-indigo">Custom Reporting Studio</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>BI & Revenue Aggregation</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            Custom Sales & Clinic Reports
          </h1>
        </div>

        <button onClick={handleExportData} className="btn btn-secondary btn-sm">
          📥 Export JSON Report
        </button>
      </div>

      {/* Query Configurator Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <label className="input-label">Target Metric</label>
          <select className="select-field" value={metric} onChange={(e) => setMetric(e.target.value)}>
            <option value="revenue">Pipeline Revenue ($)</option>
            <option value="deal_count">Total Deal Count</option>
            <option value="avg_deal_size">Average Deal Size ($)</option>
            <option value="lead_count">Leads Volume</option>
            <option value="avg_score">Average AI Score</option>
          </select>
        </div>

        <div>
          <label className="input-label">Group Dimension</label>
          <select className="select-field" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            <option value="specialty">Medical Specialty</option>
            <option value="rep">Sales Representative</option>
            <option value="city">Metro City</option>
            <option value="stage">Pipeline Stage</option>
          </select>
        </div>

        <div>
          <label className="input-label">Date Window</label>
          <select className="select-field" value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last Quarter (90 Days)</option>
            <option value="1y">Year to Date (2026)</option>
          </select>
        </div>

        <div>
          <button onClick={runQuery} className="btn btn-primary btn-sm" style={{ width: '100%', height: '38px' }}>
            🔄 Execute Query
          </button>
        </div>
      </div>

      {/* Report Visual & Data Table Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '20px' }}>
        {/* Results Bar Visualization */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>
            Aggregated Breakdown ({metric.toUpperCase().replace('_', ' ')})
          </h3>

          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Running aggregation...</div>
          ) : reportResult?.results?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reportResult.results.map((r, i) => {
                const max = Math.max(...reportResult.results.map((x) => x.totalValue || x.count || 1));
                const val = r.totalValue || r.count || 0;
                const pct = Math.max(8, Math.round((val / max) * 100));

                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.label}</span>
                      <strong style={{ color: 'var(--accent-cyan)' }}>
                        {metric === 'revenue' || metric === 'avg_deal_size' ? `$${val.toLocaleString()}` : val}
                      </strong>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--bg-input)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #6366F1, #06B6D4)',
                          borderRadius: 'var(--radius-full)',
                          transition: 'width 0.4s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No records found</div>
          )}
        </div>

        {/* Saved Custom Reports */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Saved Custom Reports</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {savedReports.map((sr) => (
                <div
                  key={sr.id}
                  onClick={() => {
                    setMetric(sr.metric);
                    setGroupBy(sr.groupBy);
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{sr.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {sr.metric} by {sr.groupBy}
                    </div>
                  </div>
                  <span className="badge badge-cyan" style={{ fontSize: '10px' }}>Load</span>
                </div>
              ))}
            </div>
          </div>

          {/* Save Current Report Form */}
          {hasPermission('custom_reports') && (
            <form onSubmit={handleSaveReport} style={{ marginTop: '20px', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="input-field"
                placeholder="Name this report..."
                value={customReportName}
                onChange={(e) => setCustomReportName(e.target.value)}
              />
              <button type="submit" disabled={!customReportName.trim()} className="btn btn-primary btn-sm">
                Save
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
