import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useToast } from '../../hooks/useToast';

export default function PulseAuditCompliance() {
  const toast = useToast();

  // Scorecard & Logs state
  const [scorecard, setScorecard] = useState(null);
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(false);

  // Filters state
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [limit] = useState(30);
  const [offset, setOffset] = useState(0);

  // Modal inspection state
  const [selectedLog, setSelectedLog] = useState(null);

  // PII masking state
  const [piiMasked, setPiiMasked] = useState(false);

  // Data erasure request state
  const [erasureLeadId, setErasureLeadId] = useState('');
  const [erasing, setErasing] = useState(false);
  const [showErasureModal, setShowErasureModal] = useState(false);

  useEffect(() => {
    loadScorecard();
    loadLogs();
  }, [offset, actionFilter, roleFilter]);

  async function loadScorecard() {
    try {
      const data = await api.getComplianceScorecard();
      setScorecard(data);
    } catch (err) {
      console.error('Failed to load compliance scorecard:', err);
    }
  }

  async function loadLogs() {
    setLoading(true);
    try {
      const data = await api.getAuditLogs({
        limit,
        offset,
        action: actionFilter || undefined,
        actorRole: roleFilter || undefined,
        search: search || undefined,
      });
      setLogs(data.logs || []);
      setTotalLogs(data.total || 0);
    } catch (err) {
      toast(err.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    if (e) e.preventDefault();
    setOffset(0);
    loadLogs();
  }

  async function handleTogglePiiMask() {
    try {
      await api.anonymizeAuditPii();
      setPiiMasked(!piiMasked);
      toast(piiMasked ? 'PII Unmasked for Super Admin' : '🔒 Doctor & Patient PII Masked');
      loadLogs();
    } catch (err) {
      toast(err.message || 'Failed to toggle PII masking');
    }
  }

  async function handleExecuteErasure() {
    if (!erasureLeadId) {
      toast('Please enter a Lead ID');
      return;
    }
    setErasing(true);
    try {
      await api.requestDataErasure({ leadId: erasureLeadId, reason: 'DPDP Doctor erasure request' });
      toast('✅ Doctor PII successfully redacted under DPDP Act rules');
      setErasureLeadId('');
      setShowErasureModal(false);
      loadLogs();
      loadScorecard();
    } catch (err) {
      toast(err.message || 'Erasure request failed');
    } finally {
      setErasing(false);
    }
  }

  return (
    <div className="pulse-page px-audit" style={{ padding: 24, maxWidth: 1320, margin: '0 auto' }}>
      {/* Header */}
      <header className="pulse-head" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p className="px-eyebrow" style={{ color: '#0d9488', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.78rem' }}>
            Healthcare Governance &amp; Security
          </p>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, margin: '4px 0 6px', letterSpacing: '-0.02em' }}>
            Audit Logs &amp; Data Privacy Compliance Hub
          </h1>
          <p className="muted" style={{ margin: 0, fontSize: '0.9rem' }}>
            Immutable audit trails, administrative change tracking, HIPAA security indicators, and India DPDP 2023 compliance enforcement.
          </p>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            type="button"
            className={`pulse-btn ${piiMasked ? 'teal' : 'ghost'}`}
            onClick={handleTogglePiiMask}
            style={{ padding: '8px 14px', fontSize: '0.82rem' }}
          >
            {piiMasked ? '🔒 PII Masking: Active' : '👁️ Mask Doctor PII'}
          </button>
          <button
            type="button"
            className="pulse-btn ghost"
            onClick={() => setShowErasureModal(true)}
            style={{ padding: '8px 14px', fontSize: '0.82rem' }}
          >
            🗑️ DPDP Erasure Request
          </button>
        </div>
      </header>

      {/* Compliance Scorecard KPIs */}
      {scorecard && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="pulse-card" style={{ padding: 18, borderRadius: 14 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              HIPAA Security Readiness
            </span>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.6rem', fontWeight: 800, color: '#10b981' }}>
              {scorecard.hipaaComplianceScore}%
            </h3>
            <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.75rem' }}>
              Access controls, audit logging &amp; transit TLS 1.3
            </p>
          </div>

          <div className="pulse-card" style={{ padding: 18, borderRadius: 14 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              India DPDP Act 2023
            </span>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.2rem', fontWeight: 800, color: '#38bdf8' }}>
              Compliant
            </h3>
            <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.75rem' }}>
              Consent trails &amp; right-to-erase ready
            </p>
          </div>

          <div className="pulse-card" style={{ padding: 18, borderRadius: 14 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Audit Trail Entries
            </span>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.6rem', fontWeight: 800, color: '#a855f7' }}>
              {scorecard.totalAuditRecords}
            </h3>
            <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.75rem' }}>
              +{scorecard.auditsLast24h} records in last 24h
            </p>
          </div>

          <div className="pulse-card" style={{ padding: 18, borderRadius: 14 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase' }}>
              Storage Encryption
            </span>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.2rem', fontWeight: 800, color: '#f59e0b' }}>
              AES-256 / WAL
            </h3>
            <p className="muted" style={{ margin: '2px 0 0', fontSize: '0.75rem' }}>
              Encrypted at rest · Cloud syncable
            </p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <section className="pulse-card px-glass" style={{ padding: 16, borderRadius: 14, marginBottom: 20 }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 180px 180px auto', gap: 12, alignItems: 'center' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by action, details, actor name, or entity ID..."
            className="ai-input"
            style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem' }}
          />

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem', borderRadius: 8 }}
          >
            <option value="">All Actions</option>
            <option value="USER_LOGIN">User Login</option>
            <option value="USER_CREATED">User Created</option>
            <option value="STAGE_UPDATED">Stage Updated</option>
            <option value="AI_PITCH_GENERATED">AI Pitch Generated</option>
            <option value="REPORT_SAVED">Report Saved</option>
            <option value="DATA_EXPORTED">Data Exported</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', fontSize: '0.85rem', borderRadius: 8 }}
          >
            <option value="">All Roles</option>
            <option value="superadmin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="manager">Sales Manager</option>
            <option value="agent">Sales Agent</option>
            <option value="auditor">Auditor</option>
          </select>

          <button type="submit" className="pulse-btn" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
            Filter
          </button>
        </form>
      </section>

      {/* Audit Log Table */}
      <section className="pulse-card px-glass" style={{ padding: 24, borderRadius: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
            Immutable Audit Trail <span className="muted" style={{ fontSize: '0.85rem' }}>({totalLogs} total events)</span>
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              className="pulse-btn ghost"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              ← Prev
            </button>
            <button
              type="button"
              className="pulse-btn ghost"
              disabled={offset + limit >= totalLogs}
              onClick={() => setOffset(offset + limit)}
              style={{ padding: '4px 10px', fontSize: '0.75rem' }}
            >
              Next →
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 32, textAlign: 'center' }}>Loading audit stream...</div>
        ) : logs.length ? (
          <div className="pulse-table-wrap" style={{ overflowX: 'auto' }}>
            <table className="pulse-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: 10 }}>Timestamp</th>
                  <th style={{ padding: 10 }}>Actor &amp; Role</th>
                  <th style={{ padding: 10 }}>Action</th>
                  <th style={{ padding: 10 }}>Target Entity</th>
                  <th style={{ padding: 10 }}>Details</th>
                  <th style={{ padding: 10 }}>IP / Compliance</th>
                  <th style={{ padding: 10 }}>Payload</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 10, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                      {new Date(l.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td style={{ padding: 10 }}>
                      <strong>{l.actor_name}</strong>
                      <div style={{ fontSize: '0.72rem', color: '#0d9488' }}>{l.actor_role}</div>
                    </td>
                    <td style={{ padding: 10 }}>
                      <span
                        className="pulse-status-pill ok"
                        style={{
                          fontSize: '0.72rem',
                          background: l.action.includes('ERASURE')
                            ? 'rgba(239, 68, 68, 0.15)'
                            : l.action.includes('EXPORT')
                            ? 'rgba(245, 158, 11, 0.15)'
                            : undefined,
                          color: l.action.includes('ERASURE')
                            ? '#ef4444'
                            : l.action.includes('EXPORT')
                            ? '#f59e0b'
                            : undefined,
                        }}
                      >
                        {l.action}
                      </span>
                    </td>
                    <td style={{ padding: 10 }}>
                      <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{l.entity_type}</span>
                      {l.entity_id ? (
                        <div className="muted" style={{ fontSize: '0.7rem' }}>{l.entity_id.slice(0, 12)}</div>
                      ) : null}
                    </td>
                    <td style={{ padding: 10, maxWidth: 280, color: 'var(--text-main)' }}>
                      {piiMasked ? l.details.replace(/[0-9]{10}/g, 'XXXXXXXXXX') : l.details}
                    </td>
                    <td style={{ padding: 10, color: 'var(--muted)', fontSize: '0.75rem' }}>
                      <div>{l.ip_address}</div>
                      <span style={{ fontSize: '0.68rem', color: '#2dd4bf' }}>{l.compliance_tag}</span>
                    </td>
                    <td style={{ padding: 10 }}>
                      <button
                        type="button"
                        className="pulse-btn ghost"
                        style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                        onClick={() => setSelectedLog(l)}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 32, textAlign: 'center' }} className="muted">
            No audit records matching query filters.
          </div>
        )}
      </section>

      {/* Payload / Diff Inspector Modal */}
      {selectedLog && (
        <div
          className="pulse-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(8px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            className="pulse-card"
            style={{ width: '100%', maxWidth: 560, padding: 24, borderRadius: 16, background: 'var(--card-bg)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>Audit Event Payload Inspector</h3>
              <button
                type="button"
                className="pulse-btn ghost"
                style={{ padding: '2px 8px' }}
                onClick={() => setSelectedLog(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.82rem' }}>
              <div><strong>Event ID:</strong> <code>{selectedLog.id}</code></div>
              <div><strong>Actor:</strong> {selectedLog.actor_name} ({selectedLog.actor_role})</div>
              <div><strong>Timestamp:</strong> {new Date(selectedLog.created_at).toISOString()}</div>
              <div><strong>Details:</strong> {selectedLog.details}</div>

              <div style={{ marginTop: 8 }}>
                <strong style={{ display: 'block', marginBottom: 4, color: '#38bdf8' }}>Payload Diff / State:</strong>
                <pre
                  style={{
                    background: 'rgba(0,0,0,0.3)',
                    padding: 12,
                    borderRadius: 8,
                    maxHeight: 200,
                    overflowY: 'auto',
                    fontSize: '0.75rem',
                    color: 'var(--text-main)',
                  }}
                >
                  {JSON.stringify({ oldState: selectedLog.old_state, newState: selectedLog.new_state }, null, 2)}
                </pre>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="button" className="pulse-btn" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Erasure Request Modal */}
      {showErasureModal && (
        <div
          className="pulse-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(8px)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 1000,
          }}
        >
          <div
            className="pulse-card"
            style={{ width: '100%', maxWidth: 440, padding: 24, borderRadius: 16, background: 'var(--card-bg)' }}
          >
            <h3 style={{ margin: '0 0 10px', fontSize: '1.2rem', color: '#ef4444' }}>
              DPDP Right to Be Forgotten (Data Erasure)
            </h3>
            <p className="muted" style={{ margin: '0 0 16px', fontSize: '0.82rem' }}>
              Under India DPDP Section 12, an individual doctor or clinic contact can request complete removal of personal contact data.
            </p>
            <input
              type="text"
              value={erasureLeadId}
              onChange={(e) => setErasureLeadId(e.target.value)}
              placeholder="Enter Lead ID to redact..."
              className="ai-input"
              style={{ width: '100%', padding: '10px 14px', fontSize: '0.88rem', marginBottom: 16 }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="pulse-btn ghost"
                onClick={() => setShowErasureModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="pulse-btn"
                style={{ background: '#ef4444', borderColor: '#ef4444' }}
                disabled={erasing}
                onClick={handleExecuteErasure}
              >
                {erasing ? 'Redacting...' : 'Execute Redaction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
