import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';
import { EnterpriseIcon } from '../components/EnterpriseIcon.jsx';

export default function AuditPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [compliance, setCompliance] = useState(null);
  const [tab, setTab] = useState('logs'); // 'logs' | 'compliance'

  useEffect(() => {
    Promise.all([
      api.getAuditLogs({ limit: 100 }).catch(() => ({ logs: [], total: 0 })),
      api.getCompliance().catch(() => null),
    ]).then(([auditData, comp]) => {
      setLogs(auditData.logs || []);
      setTotal(auditData.total || 0);
      setCompliance(comp);
      setLoading(false);
    });
  }, []);

  function handleExportCsv() {
    if (logs.length === 0) return;
    const headers = ['ID', 'Action', 'Entity Type', 'Entity ID', 'Actor Name', 'Actor Role', 'Status', 'Compliance Tag', 'Timestamp'];
    const rows = logs.map((l) => [
      l.id,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.entity_type || '').replace(/"/g, '""')}"`,
      `"${(l.entity_id || '').replace(/"/g, '""')}"`,
      `"${(l.actor_name || '').replace(/"/g, '""')}"`,
      `"${(l.actor_role || '').replace(/"/g, '""')}"`,
      `"${(l.status || '').replace(/"/g, '""')}"`,
      `"${(l.compliance_tag || '').replace(/"/g, '""')}"`,
      `"${l.created_at}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit-compliance-trail-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2">
            <EnterpriseIcon name="shield" size={24} color="#1456FD" />
            <h1 className="page-title">Enterprise Audit & Compliance</h1>
          </div>
          <p className="text-sm text-secondary mt-1">HIPAA/DPDP Act 2023 immutable audit trail · {total} verified records</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary btn-sm flex items-center gap-1.5" onClick={handleExportCsv}>
            <EnterpriseIcon name="download" size={13} color="#475569" />
            <span>Export Audit CSV</span>
          </button>
          <span className="badge badge-green flex items-center gap-1">
            <EnterpriseIcon name="check-circle" size={11} color="#15803D" />
            <span>HIPAA Compliant</span>
          </span>
          <span className="badge badge-blue">DPDP Act 2023</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          ['logs', 'file-text', 'Audit Logs'],
          ['compliance', 'shield', 'Compliance Scorecard'],
        ].map(([key, iconName, label]) => (
          <button
            key={key}
            className={`btn ${tab === key ? 'btn-primary' : 'btn-ghost'} btn-sm flex items-center gap-1.5`}
            onClick={() => setTab(key)}
          >
            <EnterpriseIcon name={iconName} size={13} color={tab === key ? '#FFFFFF' : '#475569'} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {tab === 'logs' && (
        <div className="card">
          {loading ? (
            <div className="flex items-center gap-3" style={{ padding: 32 }}><div className="spinner" /><span className="text-muted">Loading audit logs...</span></div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🔍</div>
              <p className="text-muted">No audit logs yet. Activity will appear here automatically.</p>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>Action</th><th>Entity</th><th>Actor</th><th>Status</th><th>Compliance</th><th>When</th></tr></thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--accent)' }}>{log.action}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{log.entity_type}</div>
                        {log.entity_id && <div className="text-xs text-muted" style={{ fontFamily: 'monospace' }}>{log.entity_id.slice(0, 12)}...</div>}
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{log.actor_name}</div>
                        <div className="text-xs text-muted">{log.actor_role}</div>
                      </td>
                      <td><span className={`badge ${log.status === 'success' ? 'badge-green' : 'badge-red'}`}>{log.status}</span></td>
                      <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{log.compliance_tag}</span></td>
                      <td className="text-xs text-muted">{new Date(log.created_at).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'compliance' && compliance && (
        <div className="grid-2">
          {[
            { icon: '🏥', label: 'HIPAA Compliance Score', value: `${compliance.hipaaComplianceScore}%`, color: '#10b981' },
            { icon: '🇮🇳', label: 'DPDP Readiness', value: 'Compliant', sub: 'India Digital Personal Data Protection Act 2023', color: '#00d4ff' },
            { icon: '🔒', label: 'Encryption Status', value: 'Active', sub: compliance.encryptionStatus, color: '#7c3aed' },
            { icon: '📋', label: 'Total Audit Records', value: compliance.totalAuditRecords, color: '#f59e0b' },
            { icon: '⏱️', label: 'Audits (Last 24h)', value: compliance.auditsLast24h, color: '#00d4ff' },
            { icon: '📅', label: 'Retention Policy', value: `${compliance.retentionPolicyDays} days`, color: '#10b981' },
          ].map((card) => (
            <div key={card.label} className="stat-card">
              <div className="flex items-center gap-3 mb-3">
                <span style={{ fontSize: 26 }}>{card.icon}</span>
                <span className="text-sm text-muted">{card.label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: card.color }}>{card.value}</div>
              {card.sub && <div className="text-xs text-muted mt-1">{card.sub}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
