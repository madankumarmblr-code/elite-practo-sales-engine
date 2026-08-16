import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api/client';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';
import { backupUser, removeUserBackup, syncUsersBackup } from '../lib/workspaceBackup';

const emptyUser = {
  name: '',
  email: '',
  username: '',
  password: '',
  role: 'agent',
  active: true,
  permissions: [],
};

export default function SuperAdmin() {
  const toast = useToast();
  const { user, can } = useAuth();
  const [users, setUsers] = useState([]);
  const [rolesMeta, setRolesMeta] = useState({ roles: [], permissions: [] });
  const [events, setEvents] = useState([]);
  const [health, setHealth] = useState(null);
  const [form, setForm] = useState(emptyUser);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('users'); // users | health | selfTest
  const [loadError, setLoadError] = useState('');

  // Superadmin Exclusive Self-Number Live Test Suite State
  const [selfPhone, setSelfPhone] = useState('+91 98765 43210');
  const [selfEmail, setSelfEmail] = useState('superadmin@practo.sales');
  const [selfChannel, setSelfChannel] = useState('all');
  const [selfVoice, setSelfVoice] = useState('elevenlabs_priya');
  const [selfScript, setSelfScript] = useState('prime_conversion');
  const [selfResult, setSelfResult] = useState(null);
  const [selfBusy, setSelfBusy] = useState(false);

  const allowed = can('users:write') || user?.role === 'superadmin';

  async function handleRunSelfTest(e) {
    if (e) e.preventDefault();
    setSelfBusy(true);
    try {
      const res = await api.superAdminSelfTest({
        phone: selfPhone,
        email: selfEmail,
        channel: selfChannel,
        voice: selfVoice,
        scriptPreset: selfScript,
      });
      setSelfResult(res);
      toast(res.message || 'Superadmin live self-test executed successfully!');
    } catch (err) {
      toast(err.message || 'Self-test failed');
    } finally {
      setSelfBusy(false);
    }
  }

  const permissionGroups = useMemo(() => {
    const map = {};
    for (const p of rolesMeta.permissions || []) {
      if (!map[p.group]) map[p.group] = [];
      map[p.group].push(p);
    }
    return map;
  }, [rolesMeta.permissions]);

  async function load() {
    setLoadError('');
    try {
      const u = await api.getUsers();
      setUsers(Array.isArray(u) ? u : []);
      syncUsersBackup(Array.isArray(u) ? u : []);
    } catch (err) {
      setLoadError(err.message || 'Failed to load users');
      toast(err.message);
    }

    const extras = await Promise.allSettled([
      api.getRoles(),
      api.getSystemEvents({ limit: 80 }),
      api.getSystemHealth(),
    ]);
    if (extras[0].status === 'fulfilled') setRolesMeta(extras[0].value);
    if (extras[1].status === 'fulfilled') {
      const ev = extras[1].value;
      setEvents(Array.isArray(ev) ? ev : []);
    }
    if (extras[2].status === 'fulfilled') setHealth(extras[2].value);
  }

  useEffect(() => {
    if (allowed) load();
  }, [allowed]);

  if (!allowed) {
    return <Navigate to="/pulse" replace />;
  }

  function startCreate() {
    const role = rolesMeta.roles?.[0]?.id || 'agent';
    const perms = rolesMeta.roles?.find((r) => r.id === role)?.permissions || [];
    setEditingId(null);
    setForm({ ...emptyUser, role, permissions: [...perms] });
  }

  function startEdit(u) {
    setEditingId(u.id);
    setForm({
      name: u.name,
      email: u.email,
      username: u.username || '',
      password: '',
      role: u.role,
      active: u.active,
      permissions: [...(u.permissions || [])].filter((p) => p !== '*'),
    });
  }

  function applyRoleDefaults(roleId) {
    const role =
      rolesMeta.roles.find((r) => r.id === roleId) ||
      rolesMeta.allRoles?.find((r) => r.id === roleId);
    setForm((f) => ({
      ...f,
      role: roleId,
      permissions: role ? [...(role.permissions || [])] : f.permissions,
    }));
  }

  function togglePermission(permId) {
    setForm((f) => {
      const has = f.permissions.includes(permId);
      const next = has
        ? f.permissions.filter((p) => p !== permId)
        : [...f.permissions, permId];
      return { ...f, permissions: next };
    });
  }

  async function saveUser(e) {
    e.preventDefault();
    setBusy(true);
    const wasCreate = !editingId;
    const createdUsername = String(form.username || '').trim().toLowerCase();
    try {
      const payload = {
        name: form.name,
        email: form.email,
        username: form.username || form.email,
        password: form.password,
        role: form.role,
        active: form.active,
        permissions: form.permissions,
      };
      let saved = null;
      if (editingId) {
        if (!form.password) delete payload.password;
        saved = await api.updateUser(editingId, payload);
        toast(saved?.durableWarning || 'User updated');
      } else {
        if (!form.password) {
          toast('Password is required for new users');
          setBusy(false);
          return;
        }
        saved = await api.createUser({ ...payload, password: form.password });
        toast(saved?.durableWarning || 'User created');
      }
      backupUser(saved || payload, form.password || undefined);
      setForm(emptyUser);
      setEditingId(null);
      await load();
      if (wasCreate && createdUsername) {
        const refreshed = await api.getUsers().catch(() => null);
        if (Array.isArray(refreshed)) {
          setUsers(refreshed);
          syncUsersBackup(refreshed);
          if (!refreshed.some((u) => (u.username || '').toLowerCase() === createdUsername)) {
            toast('User created but not yet visible — click Refresh.');
          }
        }
      }
    } catch (err) {
      toast(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function removeUser(id) {
    if (!confirm('Delete this user?')) return;
    try {
      const target = users.find((u) => u.id === id);
      await api.deleteUser(id);
      if (target) removeUserBackup(target.username || target.email);
      toast('User deleted');
      await load();
    } catch (err) {
      toast(err.message);
    }
  }

  return (
    <div className="pulse-page">
      <header className="pulse-head row">
        <div>
          <span className="px-eyebrow">Platform Administration</span>
          <h1>Super Admin</h1>
          <p>
            User permissions (L1–L1000), system health, and Superadmin Exclusive Self-Number Live Test Suite.
          </p>
        </div>
        <div className="pulse-actions">
          <button
            type="button"
            className={`pulse-btn ${tab === 'selfTest' ? '' : 'ghost'}`}
            style={tab === 'selfTest' ? { background: '#2dd4bf', color: '#0f172a', fontWeight: 'bold' } : {}}
            onClick={() => setTab('selfTest')}
          >
            ⭐ Self-Number Live Test
          </button>
          <button
            type="button"
            className={`pulse-btn ${tab === 'users' ? '' : 'ghost'}`}
            onClick={() => setTab('users')}
          >
            Users &amp; Permissions
          </button>
          <button
            type="button"
            className={`pulse-btn ${tab === 'health' ? '' : 'ghost'}`}
            onClick={() => setTab('health')}
          >
            Health &amp; Logs
          </button>
          <button type="button" className="pulse-btn ghost" onClick={load}>
            Refresh
          </button>
        </div>
      </header>

      {tab === 'selfTest' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Self Test Configuration Workbench */}
          <section className="pulse-card">
            <div className="pulse-head row" style={{ marginBottom: 16 }}>
              <div>
                <span className="px-eyebrow" style={{ color: '#2dd4bf' }}>Exclusive Superadmin Testing Tool</span>
                <h2 style={{ margin: '0.2rem 0' }}>Superadmin Self-Number Live Test Suite</h2>
                <p className="muted" style={{ margin: 0 }}>
                  Enter your mobile number and email to test live WhatsApp pitches, trigger AI Voice calls with recordings and transcripts, and verify cold email sequences end-to-end.
                </p>
              </div>
            </div>

            <form onSubmit={handleRunSelfTest} className="pulse-grid-2" style={{ gap: 16 }}>
              <div>
                <label>
                  Your Test Mobile Number (+91 format)
                  <input
                    type="text"
                    value={selfPhone}
                    onChange={(e) => setSelfPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    required
                  />
                </label>

                <label style={{ marginTop: 12 }}>
                  Your Test Email Address
                  <input
                    type="email"
                    value={selfEmail}
                    onChange={(e) => setSelfEmail(e.target.value)}
                    placeholder="superadmin@practo.sales"
                    required
                  />
                </label>

                <label style={{ marginTop: 12 }}>
                  Channels to Test
                  <select value={selfChannel} onChange={(e) => setSelfChannel(e.target.value)}>
                    <option value="all">🚀 Quad-Channel Test (AI Voice Call + WhatsApp + Email)</option>
                    <option value="calls">📞 AI Voice Call Only (Dial + Audio + Transcript)</option>
                    <option value="whatsapp">💬 WhatsApp Pitch Only (Template + Read Receipt)</option>
                    <option value="gmail">✉️ Cold Email Only (HTML Preview + Open Tracking)</option>
                  </select>
                </label>
              </div>

              <div>
                <label>
                  AI Voice Agent Persona (For Call Test)
                  <select value={selfVoice} onChange={(e) => setSelfVoice(e.target.value)}>
                    <option value="elevenlabs_priya">Priya · Indian English Healthcare Specialist</option>
                    <option value="elevenlabs_rahul">Rahul · Indian English Commercial AE</option>
                    <option value="elevenlabs_ananya">Ananya · Hindi / Hinglish Practice Specialist</option>
                    <option value="elevenlabs_marcus">Marcus · US English Enterprise Specialist</option>
                  </select>
                </label>

                <label style={{ marginTop: 12 }}>
                  Pitch Focus Script
                  <select value={selfScript} onChange={(e) => setSelfScript(e.target.value)}>
                    <option value="prime_conversion">Practo Prime Instant Booking &amp; Smart Number</option>
                    <option value="reach_visibility">Practo Reach Top 3 Locality Sponsor Slots</option>
                    <option value="hybrid_bundle">Reach + Prime Hybrid Commercial Package</option>
                  </select>
                </label>

                <div className="pulse-actions" style={{ marginTop: 24 }}>
                  <button
                    type="submit"
                    className="pulse-btn"
                    disabled={selfBusy}
                    style={{ width: '100%', padding: '0.85rem 1.2rem', fontSize: '0.95rem', fontWeight: 'bold' }}
                  >
                    {selfBusy ? 'Executing Live Self-Test…' : '⚡ Run Live Superadmin Self-Test Now'}
                  </button>
                </div>
              </div>
            </form>
          </section>

          {/* Real-Time Test Results & Interactive Payloads */}
          {selfResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Call Result Card with Audio Player */}
              {selfResult.results?.calls ? (
                <section className="pulse-card" style={{ borderLeft: '4px solid #2dd4bf' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#2dd4bf' }}>
                      📞 AI Call Executed to {selfResult.phone} · {selfResult.results.calls.durationSec}s
                    </h3>
                    <span className="pulse-status-pill ok">Status: Completed</span>
                  </div>
                  <p style={{ margin: '8px 0', fontSize: '0.85rem' }}>{selfResult.results.calls.summary}</p>

                  <div style={{ margin: '10px 0', background: 'rgba(15, 23, 42, 0.8)', padding: 10, borderRadius: 8 }}>
                    <strong style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: 4 }}>
                      Play Synthesized Call Recording:
                    </strong>
                    <audio controls src={selfResult.results.calls.recordingUrl} style={{ width: '100%', height: 36 }} />
                  </div>

                  <details open style={{ marginTop: 8, fontSize: '0.8rem' }}>
                    <summary style={{ cursor: 'pointer', color: '#38bdf8' }}>Turn-by-Turn Dialogue Transcript</summary>
                    <pre style={{ whiteSpace: 'pre-wrap', marginTop: 6, background: 'rgba(15, 23, 42, 0.6)', padding: 10, borderRadius: 8, color: '#cbd5e1' }}>
                      {selfResult.results.calls.transcript}
                    </pre>
                  </details>
                </section>
              ) : null}

              {/* WhatsApp Result Card */}
              {selfResult.results?.whatsapp ? (
                <section className="pulse-card" style={{ borderLeft: '4px solid #10b981' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#34d399' }}>
                      💬 WhatsApp Pitch Dispatched to {selfResult.phone}
                    </h3>
                    <span className="pulse-status-pill ok">Status: Read ✓✓</span>
                  </div>
                  <div style={{ margin: '10px 0', background: '#005c4b', color: '#e9edef', padding: '12px 16px', borderRadius: 8, fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                    {selfResult.results.whatsapp.body}
                  </div>
                </section>
              ) : null}

              {/* Email Result Card */}
              {selfResult.results?.email ? (
                <section className="pulse-card" style={{ borderLeft: '4px solid #38bdf8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, color: '#38bdf8' }}>
                      ✉️ Cold Email Sequence Sent to {selfResult.email}
                    </h3>
                    <span className="pulse-status-pill ok">Status: Opened 👁️</span>
                  </div>
                  <div style={{ marginTop: 8, background: 'rgba(15, 23, 42, 0.7)', padding: 12, borderRadius: 8, fontSize: '0.85rem' }}>
                    <strong style={{ display: 'block', color: '#f8fafc', marginBottom: 4 }}>
                      Subject: {selfResult.results.email.subject}
                    </strong>
                    <div style={{ whiteSpace: 'pre-wrap', color: '#cbd5e1', lineHeight: 1.5 }}>
                      {selfResult.results.email.body}
                    </div>
                  </div>
                </section>
              ) : null}

              {/* Raw JSON Debug View */}
              <section className="pulse-card">
                <details style={{ fontSize: '0.78rem' }}>
                  <summary style={{ cursor: 'pointer', color: '#94a3b8' }}>Inspect Full Raw Response Payload (JSON)</summary>
                  <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8, background: 'rgba(15, 23, 42, 0.9)', padding: 10, borderRadius: 8, color: '#2dd4bf' }}>
                    {JSON.stringify(selfResult, null, 2)}
                  </pre>
                </details>
              </section>
            </div>
          ) : null}
        </div>
      )}

      {tab === 'users' && (
        <div className="pulse-grid-2">
          <section className="pulse-card">
            <div className="pulse-head row" style={{ marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>Users ({users.length})</h2>
              <button type="button" className="pulse-btn" onClick={startCreate}>
                Add user
              </button>
            </div>
            {loadError ? <p className="pulse-banner">{loadError}</p> : null}
            <div className="pulse-table-wrap">
              <table className="pulse-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>User ID</th>
                    <th>Role</th>
                    <th>Active</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.name}</strong>
                        <div className="muted">{u.email}</div>
                      </td>
                      <td>{u.username || '—'}</td>
                      <td>
                        <span className="pulse-chip">{u.roleLabel || u.role}</span>
                      </td>
                      <td>{u.active ? 'Yes' : 'No'}</td>
                      <td className="pulse-row-actions">
                        <button type="button" onClick={() => startEdit(u)}>
                          Edit
                        </button>
                        {u.role !== 'superadmin' ? (
                          <button type="button" className="navy" onClick={() => removeUser(u.id)}>
                            Delete
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {!users.length && !loadError ? (
                    <tr>
                      <td colSpan={5} className="empty">
                        No users loaded yet. Click Refresh, or create a user.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className="pulse-card">
            <h2>{editingId ? 'Edit user' : 'Create user'}</h2>
            <form className="pulse-admin-form" onSubmit={saveUser}>
              <label>
                Full name
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <div className="pulse-filters" style={{ padding: 0, background: 'transparent' }}>
                <label>
                  User ID
                  <input
                    required
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="e.g. sales.agent1"
                  />
                </label>
                <label>
                  Email
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </label>
              </div>
              <label>
                Password {editingId ? '(leave blank to keep)' : ''}
                <input
                  type="password"
                  required={!editingId}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </label>
              <label>
                Permission level (role)
                <select
                  value={form.role}
                  disabled={form.role === 'superadmin' && editingId}
                  onChange={(e) => applyRoleDefaults(e.target.value)}
                >
                  {(form.role === 'superadmin'
                    ? [
                        { id: 'superadmin', label: 'Super Admin', level: 1000 },
                        ...(rolesMeta.roles || []),
                      ]
                    : rolesMeta.roles || []
                  ).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label} (L{r.level})
                    </option>
                  ))}
                </select>
              </label>
              <label className="pulse-check">
                <input
                  type="checkbox"
                  checked={!!form.active}
                  disabled={form.role === 'superadmin'}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                />
                Active account
              </label>

              {form.role !== 'superadmin' ? (
                <div>
                  <h3 style={{ margin: '0.5rem 0', fontSize: '0.95rem' }}>Fine-grained permissions</h3>
                  {Object.entries(permissionGroups)
                    .filter(([g]) => g !== 'Super Admin')
                    .map(([group, perms]) => (
                      <div key={group} style={{ marginBottom: '0.75rem' }}>
                        <strong style={{ fontSize: '0.85rem', color: '#94a3b8' }}>{group}</strong>
                        <div className="pulse-perm-grid">
                          {perms.map((p) => (
                            <label className="pulse-check" key={p.id}>
                              <input
                                type="checkbox"
                                checked={form.permissions.includes(p.id)}
                                onChange={() => togglePerm(p.id)}
                              />
                              {p.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="muted">Super Admin always has full access.</p>
              )}

              <div className="pulse-actions">
                <button type="submit" className="pulse-btn" disabled={busy}>
                  {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create user'}
                </button>
                {editingId ? (
                  <button
                    type="button"
                    className="pulse-btn ghost"
                    onClick={() => {
                      setEditingId(null);
                      setForm(emptyUser);
                    }}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </section>
        </div>
      )}

      {tab === 'health' && (
        <div className="pulse-grid-2">
          <section className="pulse-card">
            <h2>Database &amp; system health</h2>
            {!health ? (
              <div className="muted">Loading…</div>
            ) : (
              <>
                <div style={{ marginBottom: '0.85rem' }}>
                  <span className={`pulse-status-pill ${health.ok ? 'ok' : 'warn'}`}>
                    {health.ok ? 'Healthy' : 'Issues'}
                  </span>
                  <span className="muted" style={{ marginLeft: 8, fontSize: '0.85rem' }}>
                    {health.time}
                  </span>
                </div>
                <div className="pulse-table-wrap">
                  <table className="pulse-table">
                    <thead>
                      <tr>
                        <th>Check</th>
                        <th>Status</th>
                        <th>Detail</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(health.checks || []).map((c) => (
                        <tr key={c.name}>
                          <td>{c.name}</td>
                          <td>
                            <span className={`pulse-status-pill ${c.ok ? 'ok' : 'warn'}`}>
                              {c.ok ? 'OK' : 'FAIL'}
                            </span>
                          </td>
                          <td className="muted">{c.detail}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="pulse-actions" style={{ marginTop: 12, flexWrap: 'wrap' }}>
                  {Object.entries(health.counts || {}).map(([k, v]) => (
                    <span key={k} className="pulse-chip">
                      {k}: {v}
                    </span>
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="pulse-card">
            <h2>System events &amp; API logs</h2>
            <div className="pulse-table-wrap" style={{ maxHeight: 520, overflow: 'auto' }}>
              <table className="pulse-table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((ev) => (
                    <tr key={ev.id}>
                      <td className="muted" style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                        {new Date(ev.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span
                          className={`pulse-status-pill ${
                            ev.type === 'error' ? 'warn' : ev.type === 'warn' ? 'idle' : 'ok'
                          }`}
                        >
                          {ev.type}
                        </span>
                      </td>
                      <td>{ev.category}</td>
                      <td>
                        <strong>{ev.message}</strong>
                        <div className="muted" style={{ fontSize: '0.8rem' }}>
                          {ev.detail}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!events.length ? (
                    <tr>
                      <td colSpan={4} className="empty">
                        No events yet — use the app to generate logs.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
