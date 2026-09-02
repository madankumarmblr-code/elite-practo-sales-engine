import React, { useState, useEffect } from 'react';
import { useCrm } from '../context/CrmContext';
import { api } from '../services/api';

export default function AuditLogs() {
  const { addToast } = useCrm();
  const [logs, setLogs] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const data = await api.getAuditLogs({ category: categoryFilter, search });
      setLogs(data.logs || []);
    } catch (err) {
      addToast(err.message || 'Error fetching audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-emerald">SHA-256 Ledger</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Compliance & Security Trail</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            Administrative Audit & Security Logs
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={fetchLogs} className="btn btn-secondary btn-sm">
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="glass-panel"
        style={{
          padding: '16px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ flex: 1, minWidth: '220px', display: 'flex', gap: '6px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Search action, actor, or entity..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="btn btn-secondary btn-sm">
            Search
          </button>
        </form>

        <select
          className="select-field"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ width: 'auto', minWidth: '180px' }}
        >
          <option value="ALL">All Categories</option>
          <option value="AUTH">Authentication</option>
          <option value="LEADS">Leads Operations</option>
          <option value="PIPELINE">Deals & Pipeline</option>
          <option value="AI_PILOT">AI Pilot & Hunter</option>
          <option value="OUTREACH">Outreach & Dialer</option>
          <option value="COMPLIANCE">Privacy & GDPR</option>
          <option value="ADMIN">System Administration</option>
        </select>
      </div>

      {/* Log Table */}
      <div className="glass-panel table-container">
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading audit ledger...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No audit records matching criteria.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action Type</th>
                <th>Entity / Mutation</th>
                <th>Actor User</th>
                <th>IP / Origin</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        log.action.includes('WON')
                          ? 'badge-emerald'
                          : log.action.includes('DELETED') || log.action.includes('RESET')
                          ? 'badge-rose'
                          : log.action.includes('AI')
                          ? 'badge-cyan'
                          : 'badge-indigo'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500, color: 'var(--text-primary)', maxWidth: '340px' }}>
                    {log.entity}
                  </td>
                  <td style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>
                    {log.user}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                    {log.ip}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
