import { useEffect, useMemo, useState } from 'react';
import { api, downloadExport } from '../api/client';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../hooks/useAuth';

function ConnectivitySymbol({ connectivity, testing }) {
  if (testing) {
    return (
      <span className="connectivity-pill connectivity-pill--busy" title="Running live API check…">
        <span className="connectivity-dot connectivity-dot--busy" aria-hidden />
        Testing…
      </span>
    );
  }
  const c = connectivity || { code: 'idle', label: 'Untested', symbol: '○', tone: 'gray', hint: '' };
  return (
    <span
      className={`connectivity-pill connectivity-pill--${c.tone}`}
      title={c.hint || c.label}
    >
      <span className={`connectivity-dot connectivity-dot--${c.tone}`} aria-hidden>
        {c.symbol || '●'}
      </span>
      <span className="connectivity-label">{c.label}</span>
    </span>
  );
}

function formatTestedAt(value) {
  if (!value) return 'Never tested';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function ApiIntegrations() {
  const toast = useToast();
  const { can } = useAuth();
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [selfTest, setSelfTest] = useState(null);
  const [selfForm, setSelfForm] = useState({ phone: '', email: '', product: 'prime' });
  const [selfBusy, setSelfBusy] = useState(false);
  const [testAllBusy, setTestAllBusy] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [autoRan, setAutoRan] = useState(false);

  async function load() {
    try {
      setItems(await api.getIntegrations());
    } catch (e) {
      toast(e.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Keep real connectivity status fresh when the page opens
  useEffect(() => {
    if (!can('api_integrations:write') || autoRan || !items.length) return undefined;
    let cancelled = false;
    (async () => {
      setAutoRan(true);
      setTestAllBusy(true);
      try {
        await api.testAllIntegrations();
        if (!cancelled) await load();
      } catch (e) {
        if (!cancelled) toast(e.message);
      } finally {
        if (!cancelled) setTestAllBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [can, items.length, autoRan]);

  const counts = useMemo(() => {
    const live = items.filter((i) => i.connectivity?.code === 'live').length;
    const ready = items.filter((i) => i.connectivity?.code === 'ready').length;
    const needsKey = items.filter((i) => i.connectivity?.code === 'needs_key').length;
    const failed = items.filter((i) => i.connectivity?.code === 'error').length;
    return { live, ready, needsKey, failed, total: items.length };
  }, [items]);

  const grouped = useMemo(() => {
    const filtered = items.filter((item) => {
      const code = item.connectivity?.code;
      if (filter === 'working') return code === 'live' || code === 'ready';
      if (filter === 'needs_key') return code === 'needs_key';
      if (filter === 'failed') return code === 'error';
      return true;
    });
    const map = {};
    for (const item of filtered) {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    }
    return map;
  }, [items, filter]);

  function openEdit(item) {
    setEditing(item.id);
    setForm({
      enabled: item.enabled,
      status: item.status,
      notes: item.notes || '',
      config: { ...item.config },
      secrets: Object.fromEntries(Object.keys(item.secrets || {}).map((k) => [k, ''])),
    });
  }

  async function save() {
    if (!can('api_integrations:write')) {
      toast('You do not have permission to edit integrations');
      return;
    }
    setBusy(true);
    try {
      const secrets = {};
      for (const [k, v] of Object.entries(form.secrets || {})) {
        if (v) secrets[k] = v;
      }
      const saved = await api.updateIntegration(editing, {
        enabled: form.enabled,
        status: form.status,
        notes: form.notes,
        config: form.config,
        secrets,
      });
      toast('Integration saved — running live connectivity check…');
      setEditing(null);
      setTestingId(saved.id);
      try {
        const res = await api.testIntegration(saved.id);
        toast(res.message || (res.ok ? 'Connected' : 'Needs attention'));
      } catch (e) {
        toast(e.message);
      } finally {
        setTestingId(null);
      }
      load();
    } catch (e) {
      toast(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function test(id) {
    if (!can('api_integrations:write')) {
      toast('You do not have permission to test integrations');
      return;
    }
    setTestingId(id);
    try {
      const res = await api.testIntegration(id);
      toast(res.message || (res.ok ? 'Test passed' : 'Test failed'));
      load();
    } catch (e) {
      toast(e.message);
    } finally {
      setTestingId(null);
    }
  }

  async function testAll() {
    if (!can('api_integrations:write')) {
      toast('You do not have permission to test integrations');
      return;
    }
    setTestAllBusy(true);
    try {
      const res = await api.testAllIntegrations();
      toast(
        `Live check: ${res.passed} connected · ${res.needsCredentials} need keys · ${res.failed} failed`
      );
      load();
    } catch (e) {
      toast(e.message);
    } finally {
      setTestAllBusy(false);
    }
  }

  function openSelfTest(item) {
    if (!['whatsapp', 'gmail', 'calls'].includes(item.channel)) {
      toast('Self-test to your number/email is for WhatsApp, Gmail, and Calls');
      return;
    }
    setSelfTest(item);
    setSelfForm({ phone: '', email: '', product: 'prime' });
  }

  async function runSelfTest() {
    if (!can('api_integrations:write')) {
      toast('You do not have permission to test integrations');
      return;
    }
    setSelfBusy(true);
    try {
      const res = await api.selfTestIntegration(selfTest.id, selfForm);
      toast(res.message);
      setSelfTest(null);
      load();
    } catch (e) {
      toast(e.message);
    } finally {
      setSelfBusy(false);
    }
  }

  async function exportIntegrations(format) {
    try {
      await downloadExport('integrations', format);
      toast(`Exported integrations as ${format.toUpperCase()}`);
    } catch (e) {
      toast(e.message);
    }
  }

  const current = items.find((i) => i.id === editing);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>API Integrations</h1>
          <p>
            Live API connectivity for WhatsApp, Gmail, Calls, AI, Discovery, enrichment, and webhooks.
            Status symbols update from real provider checks — not placeholders.
          </p>
        </div>
        <div className="topbar-actions">
          {can('api_integrations:write') ? (
            <button type="button" className="btn btn-primary" disabled={testAllBusy} onClick={testAll}>
              {testAllBusy ? 'Checking APIs…' : 'Refresh connectivity'}
            </button>
          ) : null}
          <button type="button" className="btn btn-secondary" onClick={() => exportIntegrations('json')}>
            Export JSON
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => exportIntegrations('csv')}>
            Export CSV
          </button>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: '1rem' }}>
        <div className="connectivity-summary">
          <div className="connectivity-stat">
            <ConnectivitySymbol connectivity={{ code: 'live', label: 'Connected', symbol: '●', tone: 'green' }} />
            <strong>{counts.live}</strong>
            <span className="muted">live</span>
          </div>
          <div className="connectivity-stat">
            <ConnectivitySymbol connectivity={{ code: 'ready', label: 'Ready', symbol: '●', tone: 'teal' }} />
            <strong>{counts.ready}</strong>
            <span className="muted">ready</span>
          </div>
          <div className="connectivity-stat">
            <ConnectivitySymbol connectivity={{ code: 'needs_key', label: 'Needs key', symbol: '●', tone: 'amber' }} />
            <strong>{counts.needsKey}</strong>
            <span className="muted">need keys</span>
          </div>
          <div className="connectivity-stat">
            <ConnectivitySymbol connectivity={{ code: 'error', label: 'Failed', symbol: '●', tone: 'coral' }} />
            <strong>{counts.failed}</strong>
            <span className="muted">failed</span>
          </div>
        </div>
        <div className="toolbar" style={{ marginTop: 12, marginBottom: 0, flexWrap: 'wrap', gap: 8 }}>
          {[
            { id: 'all', label: `All (${counts.total})` },
            { id: 'working', label: `Working (${counts.live + counts.ready})` },
            { id: 'needs_key', label: `Needs key (${counts.needsKey})` },
            { id: 'failed', label: `Failed (${counts.failed})` },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`btn ${filter === opt.id ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(opt.id)}
            >
              {opt.label}
            </button>
          ))}
          {testAllBusy ? (
            <span className="muted" style={{ fontSize: '0.85rem' }}>
              Running live connectivity checks…
            </span>
          ) : null}
        </div>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="panel">
          <p className="muted" style={{ margin: 0 }}>
            No integrations match this filter.
          </p>
        </div>
      ) : (
        Object.entries(grouped).map(([category, list]) => (
          <div className="panel" key={category} style={{ marginBottom: '1rem' }}>
            <h2>{category}</h2>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>API connectivity</th>
                    <th>Integration</th>
                    <th>Channel</th>
                    <th>Pricing</th>
                    <th>Enabled</th>
                    <th>Last checked</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {list.map((item) => (
                    <tr key={item.id}>
                      <td style={{ minWidth: 150 }}>
                        <ConnectivitySymbol
                          connectivity={item.connectivity}
                          testing={testingId === item.id || (testAllBusy && !item.last_tested_at)}
                        />
                        {item.last_test_message ? (
                          <div className="muted" style={{ fontSize: '0.75rem', marginTop: 4, maxWidth: 220 }}>
                            {item.last_test_message}
                          </div>
                        ) : null}
                      </td>
                      <td>
                        <strong>{item.label}</strong>
                        <div className="muted" style={{ fontSize: '0.82rem' }}>
                          {item.provider}
                          {item.is_default ? ' · default' : ''}
                          {item.notes ? ` · ${item.notes}` : ''}
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-gray">{item.channel || '—'}</span>
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            item.pricing === 'free'
                              ? 'badge-green'
                              : item.pricing === 'freemium'
                                ? 'badge-teal'
                                : 'badge-coral'
                          }`}
                        >
                          {item.pricing || 'paid'}
                        </span>
                      </td>
                      <td>{item.enabled ? 'Yes' : 'No'}</td>
                      <td className="muted" style={{ fontSize: '0.82rem' }}>
                        {formatTestedAt(item.last_tested_at)}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button type="button" className="btn btn-ghost" onClick={() => openEdit(item)}>
                          Configure
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          disabled={testingId === item.id || testAllBusy}
                          onClick={() => test(item.id)}
                        >
                          {testingId === item.id ? 'Testing…' : 'Test API'}
                        </button>
                        {['whatsapp', 'gmail', 'calls'].includes(item.channel) ? (
                          <button type="button" className="btn btn-primary" onClick={() => openSelfTest(item)}>
                            Test on my {item.channel === 'gmail' ? 'email' : 'number'}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      {editing && form && current ? (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(640px, 100%)' }}>
            <header>
              <h2>{current.label}</h2>
              <button type="button" className="btn btn-ghost" onClick={() => setEditing(null)}>
                Close
              </button>
            </header>
            <div className="form-grid">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ConnectivitySymbol connectivity={current.connectivity} testing={testingId === current.id} />
                <span className="muted" style={{ fontSize: '0.85rem' }}>
                  {current.last_test_message || current.connectivity?.hint}
                </span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={!!form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  disabled={!can('api_integrations:write')}
                />
                Enabled
              </label>
              <label className="field">
                Status
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  disabled={!can('api_integrations:write')}
                >
                  <option value="ready">Ready</option>
                  <option value="connected">Connected</option>
                  <option value="error">Error</option>
                  <option value="disabled">Disabled</option>
                </select>
              </label>
              <h3 style={{ margin: '0.5rem 0 0' }}>Config</h3>
              {Object.entries(form.config || {}).map(([key, value]) => (
                <label className="field" key={key}>
                  {key}
                  <input
                    value={value ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, config: { ...form.config, [key]: e.target.value } })
                    }
                    disabled={!can('api_integrations:write')}
                  />
                </label>
              ))}
              <h3 style={{ margin: '0.5rem 0 0' }}>Secrets</h3>
              <p className="muted" style={{ margin: 0, fontSize: '0.85rem' }}>
                Leave blank to keep existing values. Saving runs a live API connectivity check.
              </p>
              {Object.keys(current.secrets || {}).map((key) => (
                <label className="field" key={key}>
                  {key}
                  <input
                    type="password"
                    placeholder={current.hasSecrets ? '•••••••• (unchanged)' : 'Paste credential'}
                    value={form.secrets[key] || ''}
                    onChange={(e) =>
                      setForm({ ...form, secrets: { ...form.secrets, [key]: e.target.value } })
                    }
                    disabled={!can('api_integrations:write')}
                  />
                </label>
              ))}
              <label className="field">
                Notes
                <textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  disabled={!can('api_integrations:write')}
                />
              </label>
              {can('api_integrations:write') ? (
                <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>
                  {busy ? 'Saving…' : 'Save & test API'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {selfTest ? (
        <div className="modal-backdrop" onClick={() => setSelfTest(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header>
              <h2>
                Test {selfTest.label} on your {selfTest.channel === 'gmail' ? 'email' : 'number'}
              </h2>
              <button type="button" className="btn btn-ghost" onClick={() => setSelfTest(null)}>
                Close
              </button>
            </header>
            <div className="form-grid">
              <p className="muted" style={{ margin: 0 }}>
                Sends a self-test{' '}
                {selfTest.channel === 'calls'
                  ? 'call script log'
                  : selfTest.channel === 'gmail'
                    ? 'email'
                    : 'WhatsApp message'}{' '}
                and stores it under Autopilot → Sent records.
              </p>
              {selfTest.channel === 'gmail' ? (
                <label className="field">
                  Your email
                  <input
                    type="email"
                    required
                    placeholder="you@company.com"
                    value={selfForm.email}
                    onChange={(e) => setSelfForm({ ...selfForm, email: e.target.value })}
                  />
                </label>
              ) : (
                <label className="field">
                  Your mobile number
                  <input
                    required
                    placeholder="+91 9XXXXXXXXX"
                    value={selfForm.phone}
                    onChange={(e) => setSelfForm({ ...selfForm, phone: e.target.value })}
                  />
                </label>
              )}
              <label className="field">
                Product pitching in test
                <select
                  value={selfForm.product}
                  onChange={(e) => setSelfForm({ ...selfForm, product: e.target.value })}
                >
                  <option value="prime">Practo Prime</option>
                  <option value="reach">Practo Reach</option>
                  <option value="video">Video Shoot</option>
                  <option value="prime_reach">Prime + Reach</option>
                  <option value="full_suite">Full Enterprise Suite</option>
                </select>
              </label>
              <button type="button" className="btn btn-primary" disabled={selfBusy} onClick={runSelfTest}>
                {selfBusy ? 'Sending…' : 'Send self-test'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
