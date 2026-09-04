import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [testing, setTesting] = useState({});
  const [testResult, setTestResult] = useState({});
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [error, setError] = useState('');

  useEffect(() => { fetchIntegrations(); }, []);

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
      setSelected(null);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  }

  const PROVIDER_LABELS = {
    nvidia_nemotron: { icon: '⚡', color: '#76b900' },
    sarvam_voice: { icon: '🎙️', color: '#7c3aed' },
    meta_whatsapp: { icon: '💬', color: '#25d366' },
    meta_llama: { icon: '🤖', color: '#00d4ff' },
    google_maps: { icon: '🗺️', color: '#4285f4' },
    google_sheets: { icon: '📊', color: '#0f9d58' },
  };

  if (loading) return <div className="fade-in" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Integrations</h1>
          <p className="text-sm text-muted mt-2">Manage API connections and credentials</p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid-2">
        {integrations.map((integ) => {
          const meta = PROVIDER_LABELS[integ.provider] || { icon: '🔌', color: '#6b7280' };
          const tr = testResult[integ.provider];
          return (
            <div key={integ.provider} className="card" style={{ borderColor: `${meta.color}22` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${meta.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{meta.icon}</div>
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
                <div className={`alert ${tr.success ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 12 }}>
                  {tr.success ? '✅' : '❌'} {tr.message}
                </div>
              )}

              <div className="flex gap-2">
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(integ)}>⚙️ Configure</button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleTest(integ.provider)} disabled={testing[integ.provider]}>
                  {testing[integ.provider] ? '...' : '🔌 Test'}
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
    </div>
  );
}
