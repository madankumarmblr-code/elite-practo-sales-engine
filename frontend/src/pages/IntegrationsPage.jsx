import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api/client.js';
import { EnterpriseIcon } from '../components/EnterpriseIcon.jsx';

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [testing, setTesting] = useState({});
  const [testResult, setTestResult] = useState({});
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [error, setError] = useState('');

  // Enterprise Data Storage State
  const [storageStatus, setStorageStatus] = useState(null);
  const [storageModal, setStorageModal] = useState(false);
  const [storageForm, setStorageForm] = useState({
    provider: 'vercel_blob',
    token: '',
    databaseUrl: '',
  });
  const [storageTesting, setStorageTesting] = useState(false);
  const [storageTestResult, setStorageTestResult] = useState(null);
  const [syncingStorage, setSyncingStorage] = useState(false);
  const [storageMessage, setStorageMessage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchIntegrations();
    fetchStorageStatus();
  }, []);

  async function fetchStorageStatus() {
    try {
      const data = await api.getStorageStatus();
      setStorageStatus(data);
    } catch {}
  }

  async function fetchIntegrations() {
    setLoading(true);
    try { const data = await api.getIntegrations(); setIntegrations(data); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  function openEdit(integ) {
    setSelected(integ);
    const secrets = integ.secrets || {};
    const config = integ.config || {};
    setEditForm({ ...config, ...Object.fromEntries(Object.entries(secrets).map(([k, v]) => [`secret_${k}`, v])) });
    setTestResult({});
    setError('');
  }

  async function handleTest(provider) {
    setTesting((t) => ({ ...t, [provider]: true }));
    setTestResult((r) => ({ ...r, [provider]: null }));
    try {
      let result;
      if (provider === 'sarvam_voice') result = await api.sarvamTestConnection();
      else if (provider === 'meta_whatsapp') result = await api.whatsappTestConnection();
      else if (provider === 'nvidia_nemotron' || provider === 'meta_llama') result = await api.testAiConnection();
      else result = await api.testIntegration(provider);
      setTestResult((r) => ({ ...r, [provider]: result }));
      fetchIntegrations();
    } catch (e) {
      setTestResult((r) => ({ ...r, [provider]: { success: false, message: e.message } }));
    } finally {
      setTesting((t) => ({ ...t, [provider]: false }));
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const secrets = {};
      const config = {};
      for (const [k, v] of Object.entries(editForm)) {
        if (k.startsWith('secret_')) secrets[k.slice(7)] = v;
        else config[k] = v;
      }
      if (selected.provider === 'sarvam_voice') {
        await api.sarvamSaveConfig({ ...config, apiKey: secrets.apiKey });
      } else if (selected.provider === 'meta_whatsapp') {
        await api.whatsappSaveConfig({ ...config, accessToken: secrets.accessToken, appSecret: secrets.appSecret });
      } else {
        await api.updateIntegration(selected.provider, { config, secrets });
      }
      fetchIntegrations();
      fetchStorageStatus();
      setSelected(null);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleSyncStorageNow() {
    setSyncingStorage(true);
    setStorageMessage(null);
    try {
      const res = await api.syncStorageNow();
      if (res.persisted) {
        setStorageMessage({ type: 'success', text: `Storage synchronized to remote cloud successfully at ${new Date().toLocaleTimeString()}!` });
      } else {
        setStorageMessage({ type: 'info', text: `Sync status: ${res.reason || 'Storage active'}. Database is healthy.` });
      }
      fetchStorageStatus();
    } catch (err) {
      setStorageMessage({ type: 'error', text: err.message });
    } finally {
      setSyncingStorage(false);
    }
  }

  async function handleTestStorageConnection() {
    setStorageTesting(true);
    setStorageTestResult(null);
    try {
      const res = await api.testStorage(storageForm);
      setStorageTestResult(res);
    } catch (err) {
      setStorageTestResult({ success: false, message: err.message });
    } finally {
      setStorageTesting(false);
    }
  }

  function handleExportSnapshot() {
    window.open('/api/storage/export-snapshot', '_blank');
  }

  async function handleImportSnapshotFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const snapshot = JSON.parse(text);
      setLoading(true);
      const res = await api.importStorageSnapshot(snapshot);
      alert(`Snapshot restored successfully! Restored ${res.importedCount} records across ${res.tablesRestored} tables.`);
      fetchIntegrations();
      fetchStorageStatus();
    } catch (err) {
      alert(`Snapshot import failed: ${err.message}`);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const PROVIDER_LABELS = {
    nvidia_nemotron: { icon: 'zap', color: '#76b900' },
    sarvam_voice: { icon: 'phone-call', color: '#7c3aed' },
    meta_whatsapp: { icon: 'message', color: '#25d366' },
    meta_llama: { icon: 'cpu', color: '#00d4ff' },
    google_maps: { icon: 'map-pin', color: '#4285f4' },
    google_sheets: { icon: 'bar-chart', color: '#0f9d58' },
  };

  if (loading) return <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <div className="flex items-center gap-2">
            <EnterpriseIcon name="sliders" size={24} color="#1456FD" />
            <h1 className="page-title">Enterprise Integrations & Data Storage</h1>
          </div>
          <p className="text-sm text-secondary mt-1">
            Configure AI models, telephony, messaging channels, and persistent cloud storage for Vercel durability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary btn-sm flex items-center gap-2" onClick={handleExportSnapshot}>
            <EnterpriseIcon name="download" size={14} color="#475569" />
            <span>Export Snapshot</span>
          </button>
          <button className="btn btn-primary btn-sm flex items-center gap-2" onClick={() => setStorageModal(true)}>
            <EnterpriseIcon name="database" size={14} color="#FFFFFF" />
            <span>Connect Storage</span>
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {storageMessage && (
        <div className={`alert ${storageMessage.type === 'error' ? 'alert-error' : 'alert-success'} flex items-center gap-2 mb-4`}>
          <EnterpriseIcon name={storageMessage.type === 'error' ? 'alert-triangle' : 'check-circle'} size={16} color={storageMessage.type === 'error' ? '#EF4444' : '#10B981'} />
          <span>{storageMessage.text}</span>
        </div>
      )}

      {/* Enterprise Data Storage & Vercel Durability Card */}
      <div className="card mb-6" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EnterpriseIcon name="database" size={22} color="#1456FD" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span style={{ fontWeight: 700, fontSize: 16, color: '#0F172A' }}>Enterprise Data Storage & Durability</span>
                <span className={`badge ${storageStatus?.connectedStores?.vercelBlob || storageStatus?.connectedStores?.postgres ? 'badge-green' : 'badge-blue'}`}>
                  {storageStatus?.activeEngine === 'vercel_blob' ? 'Vercel Blob Active' : storageStatus?.activeEngine === 'neon_postgres' ? 'PostgreSQL Connected' : 'Local SQLite + Snapshot Sync'}
                </span>
              </div>
              <p className="text-xs text-secondary mt-0.5">
                Protects all settings, leads, calls, proposals & audit logs across Vercel deployments and redeployments.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="btn btn-secondary btn-sm flex items-center gap-1.5"
              onClick={handleSyncStorageNow}
              disabled={syncingStorage}
            >
              <EnterpriseIcon name="refresh" size={13} color="#475569" />
              <span>{syncingStorage ? 'Syncing...' : 'Sync Cloud Storage Now'}</span>
            </button>
            <button
              className="btn btn-ghost btn-sm flex items-center gap-1.5"
              onClick={() => fileInputRef.current?.click()}
            >
              <EnterpriseIcon name="database" size={13} color="#475569" />
              <span>Restore Snapshot</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept=".json"
              onChange={handleImportSnapshotFile}
            />
          </div>
        </div>

        {/* Database Metrics Bar */}
        {storageStatus && (
          <div className="grid-4 mt-3 pt-3" style={{ borderTop: '1px solid #F1F5F9', gap: 12 }}>
            <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: 8 }}>
              <div className="text-xs text-muted">Database Engine</div>
              <div className="text-sm font-bold mt-0.5" style={{ color: '#0F172A' }}>
                {storageStatus.activeEngine === 'vercel_blob' ? 'Vercel Blob Store' : storageStatus.activeEngine === 'neon_postgres' ? 'PostgreSQL' : 'SQLite Shim (WASM)'}
              </div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: 8 }}>
              <div className="text-xs text-muted">Storage Size</div>
              <div className="text-sm font-bold mt-0.5" style={{ color: '#0F172A' }}>
                {storageStatus.dbSizeFormatted || '180 KB'}
              </div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: 8 }}>
              <div className="text-xs text-muted">Stored Leads & Clinics</div>
              <div className="text-sm font-bold mt-0.5" style={{ color: '#1456FD' }}>
                {(storageStatus.tableCounts?.leads || 0) + (storageStatus.tableCounts?.scraped_clinics || 0)} records
              </div>
            </div>
            <div style={{ background: '#F8FAFC', padding: '10px 14px', borderRadius: 8 }}>
              <div className="text-xs text-muted">Calls & Proposals</div>
              <div className="text-sm font-bold mt-0.5" style={{ color: '#10B981' }}>
                {(storageStatus.tableCounts?.call_logs || 0) + (storageStatus.tableCounts?.commercial_proposals || 0)} records
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid-2">
        {integrations.map((integ) => {
          const meta = PROVIDER_LABELS[integ.provider] || { icon: 'zap', color: '#6b7280' };
          const tr = testResult[integ.provider];
          return (
            <div key={integ.provider} className="card" style={{ borderColor: `${meta.color}22` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <EnterpriseIcon name={meta.icon} size={22} color={meta.color} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{integ.label}</div>
                    <div className="text-xs text-muted">{integ.category}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`status-dot ${integ.status || 'offline'}`} />
                  <span className="text-xs text-muted" style={{ textTransform: 'capitalize' }}>{integ.status || 'unknown'}</span>
                </div>
              </div>

              {integ.notes && <p className="text-sm text-muted mb-3">{integ.notes}</p>}

              {tr && (
                <div className={`alert ${tr.success ? 'alert-success' : 'alert-error'} flex items-center gap-2`} style={{ marginBottom: 12 }}>
                  <EnterpriseIcon name={tr.success ? 'check-circle' : 'alert-triangle'} size={14} color={tr.success ? '#10B981' : '#EF4444'} />
                  <span>{tr.message}</span>
                </div>
              )}

              <div className="flex gap-2">
                <button className="btn btn-secondary btn-sm flex items-center gap-1.5" onClick={() => openEdit(integ)}>
                  <EnterpriseIcon name="sliders" size={13} color="#475569" />
                  <span>Configure</span>
                </button>
                <button className="btn btn-ghost btn-sm flex items-center gap-1.5" onClick={() => handleTest(integ.provider)} disabled={testing[integ.provider]}>
                  <EnterpriseIcon name="zap" size={13} color="#475569" />
                  <span>{testing[integ.provider] ? 'Testing...' : 'Test Connection'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit modal */}
      {selected && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal fade-in" style={{ maxWidth: 580 }}>
            <div className="modal-header">
              <h2 className="section-title">Configure {selected.label}</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              {selected.provider === 'sarvam_voice' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div><label className="text-xs text-muted" style={{ textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>API Key (X-API-Key)</label><input className="input" type="password" placeholder="sk_samvaad_..." value={editForm.secret_apiKey || ''} onChange={(e) => setEditForm((f) => ({ ...f, secret_apiKey: e.target.value }))} /></div>
                  <div><label className="text-xs text-muted" style={{ textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Organization ID</label><input className="input" value={editForm.orgId || ''} onChange={(e) => setEditForm((f) => ({ ...f, orgId: e.target.value }))} /></div>
                  <div><label className="text-xs text-muted" style={{ textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Workspace ID</label><input className="input" value={editForm.workspaceId || ''} onChange={(e) => setEditForm((f) => ({ ...f, workspaceId: e.target.value }))} /></div>
                  <div className="grid-2" style={{ gap: 12 }}>
                    <div><label className="text-xs text-muted" style={{ textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Agent App ID</label><input className="input" value={editForm.appId || ''} onChange={(e) => setEditForm((f) => ({ ...f, appId: e.target.value }))} /></div>
                    <div><label className="text-xs text-muted" style={{ textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>App Version</label><input className="input" type="number" value={editForm.appVersion || 1} onChange={(e) => setEditForm((f) => ({ ...f, appVersion: Number(e.target.value) }))} /></div>
                  </div>
                  <div><label className="text-xs text-muted" style={{ textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Connection ID</label><input className="input" value={editForm.connectionId || ''} onChange={(e) => setEditForm((f) => ({ ...f, connectionId: e.target.value }))} /></div>
                  <div><label className="text-xs text-muted" style={{ textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Agent Phone Number</label><input className="input" value={editForm.agentPhoneNumber || ''} onChange={(e) => setEditForm((f) => ({ ...f, agentPhoneNumber: e.target.value }))} placeholder="+918071579481" /></div>
                </div>
              )}

              {selected.provider === 'meta_whatsapp' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div><label className="text-xs text-muted" style={{ textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Phone Number ID</label><input className="input" value={editForm.phoneNumberId || ''} onChange={(e) => setEditForm((f) => ({ ...f, phoneNumberId: e.target.value }))} /></div>
                  <div><label className="text-xs text-muted" style={{ textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>WABA ID</label><input className="input" value={editForm.wabaId || ''} onChange={(e) => setEditForm((f) => ({ ...f, wabaId: e.target.value }))} /></div>
                  <div><label className="text-xs text-muted" style={{ textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Access Token</label><input className="input" type="password" value={editForm.secret_accessToken || ''} onChange={(e) => setEditForm((f) => ({ ...f, secret_accessToken: e.target.value }))} /></div>
                  <div><label className="text-xs text-muted" style={{ textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Verify Token</label><input className="input" value={editForm.verifyToken || ''} onChange={(e) => setEditForm((f) => ({ ...f, verifyToken: e.target.value }))} /></div>
                </div>
              )}

              {selected.provider === 'nvidia_nemotron' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label className="text-xs text-muted" style={{ textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                      NVIDIA NIM API Key
                    </label>
                    <input
                      className="input"
                      type="password"
                      value={editForm.secret_apiKey || ''}
                      onChange={(e) => setEditForm((f) => ({ ...f, secret_apiKey: e.target.value }))}
                      placeholder="nvapi-..."
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted" style={{ textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>
                      NVIDIA Model ID
                    </label>
                    <select
                      className="input"
                      value={editForm.model || 'nvidia/nemotron-3-ultra-550b-a55b'}
                      onChange={(e) => setEditForm((f) => ({ ...f, model: e.target.value }))}
                    >
                      <option value="nvidia/nemotron-3-ultra-550b-a55b">nvidia/nemotron-3-ultra-550b-a55b (Nemotron 3 Ultra 550B - Default)</option>
                      <option value="nvidia/llama-3.1-nemotron-70b-instruct">nvidia/llama-3.1-nemotron-70b-instruct (Nemotron 70B)</option>
                      <option value="nvidia/nemotron-4-340b-instruct">nvidia/nemotron-4-340b-instruct (Nemotron 4 340B)</option>
                      <option value="nvidia/nemotron-3-super-120b-a12b">nvidia/nemotron-3-super-120b-a12b (Nemotron 3 Super)</option>
                    </select>
                  </div>
                </div>
              )}

              {selected.provider === 'meta_llama' && (
                <div><label className="text-xs text-muted" style={{ textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Meta Llama API Key</label><input className="input" type="password" value={editForm.secret_apiKey || ''} onChange={(e) => setEditForm((f) => ({ ...f, secret_apiKey: e.target.value }))} placeholder="LLM_..." /></div>
              )}

              {['google_maps', 'google_sheets'].includes(selected.provider) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selected.provider === 'google_maps' && <div><label className="text-xs text-muted" style={{ textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Google Maps API Key</label><input className="input" type="password" value={editForm.secret_apiKey || ''} onChange={(e) => setEditForm((f) => ({ ...f, secret_apiKey: e.target.value }))} /></div>}
                  {selected.provider === 'google_sheets' && <div><label className="text-xs text-muted" style={{ textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>CSV URL</label><input className="input" value={editForm.csvUrl || ''} onChange={(e) => setEditForm((f) => ({ ...f, csvUrl: e.target.value }))} /></div>}
                </div>
              )}

              {error && <div className="alert alert-error mt-4">{error}</div>}
              <div className="flex gap-3 mt-4" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setSelected(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Config'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enterprise Data Storage Modal */}
      {storageModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setStorageModal(false)}>
          <div className="modal fade-in" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div className="flex items-center gap-2">
                <EnterpriseIcon name="database" size={20} color="#1456FD" />
                <h2 className="section-title">Connect Enterprise Cloud Storage</h2>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setStorageModal(false)}>✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                  Storage Provider / Engine
                </label>
                <select
                  className="input"
                  value={storageForm.provider}
                  onChange={(e) => setStorageForm((f) => ({ ...f, provider: e.target.value }))}
                >
                  <option value="vercel_blob">Vercel Blob Storage (Recommended for Vercel)</option>
                  <option value="postgres">PostgreSQL (Neon / Supabase / AWS RDS)</option>
                  <option value="turso_libsql">Turso libSQL (Edge SQLite Replica)</option>
                </select>
              </div>

              {storageForm.provider === 'vercel_blob' && (
                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Vercel Blob Read/Write Token
                  </label>
                  <input
                    className="input"
                    type="password"
                    placeholder="vercel_blob_rw_..."
                    value={storageForm.token}
                    onChange={(e) => setStorageForm((f) => ({ ...f, token: e.target.value }))}
                  />
                  <p className="text-xs text-muted mt-1">
                    Available in Vercel Project Dashboard → Storage → Blob. Set as <code>BLOB_READ_WRITE_TOKEN</code>.
                  </p>
                </div>
              )}

              {(storageForm.provider === 'postgres' || storageForm.provider === 'turso_libsql') && (
                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Connection URL
                  </label>
                  <input
                    className="input"
                    type="password"
                    placeholder={storageForm.provider === 'postgres' ? 'postgres://user:pass@ep-cool-fog-123.neon.tech/neondb' : 'libsql://my-db.turso.io'}
                    value={storageForm.databaseUrl}
                    onChange={(e) => setStorageForm((f) => ({ ...f, databaseUrl: e.target.value }))}
                  />
                  <p className="text-xs text-muted mt-1">
                    Set in Vercel Project Settings → Environment Variables.
                  </p>
                </div>
              )}

              {storageTestResult && (
                <div className={`alert ${storageTestResult.success ? 'alert-success' : 'alert-error'} flex items-center gap-2`}>
                  <EnterpriseIcon name={storageTestResult.success ? 'check-circle' : 'alert-triangle'} size={14} color={storageTestResult.success ? '#10B981' : '#EF4444'} />
                  <span>{storageTestResult.message}</span>
                </div>
              )}

              <div className="flex gap-2 justify-between mt-2 pt-3" style={{ borderTop: '1px solid #F1F5F9' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm flex items-center gap-1.5"
                  onClick={handleTestStorageConnection}
                  disabled={storageTesting}
                >
                  <EnterpriseIcon name="zap" size={13} color="#475569" />
                  <span>{storageTesting ? 'Testing Connection...' : 'Test Connection'}</span>
                </button>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setStorageModal(false)}>Close</button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm flex items-center gap-1.5"
                    onClick={async () => {
                      await handleTestStorageConnection();
                      await handleSyncStorageNow();
                      setStorageModal(false);
                    }}
                  >
                    <EnterpriseIcon name="check-circle" size={13} color="#FFFFFF" />
                    <span>Apply & Sync Storage</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

