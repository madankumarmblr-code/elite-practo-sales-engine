import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';

const ROLES = [
  { id: 'superadmin', label: 'Super Admin', badge: 'badge-purple', desc: 'Unrestricted full access across all modules, users & billing' },
  { id: 'sales_manager', label: 'Sales Manager', badge: 'badge-blue', desc: 'Team oversight, lead distribution, and audit access' },
  { id: 'sales_agent', label: 'Sales Representative', badge: 'badge-teal', desc: 'Daily calling, lead outreach, and commercial proposals' },
];

export default function UsersManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'sales_agent',
    phone: '',
    territory: 'Bangalore',
    monthlyQuota: 50,
    dailyCallLimit: 100,
    canExport: true,
    canTriggerAutopilot: true,
    canApproveProposals: false,
  });

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleCreateUser(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const territories = form.territory.split(',').map((t) => t.trim()).filter(Boolean);
      await api.createUser({
        ...form,
        territory: territories.length > 0 ? territories : ['Bangalore'],
      });
      setMessage({ type: 'success', text: `User ${form.name} created successfully!` });
      setShowAddModal(false);
      setForm({
        name: '',
        email: '',
        username: '',
        password: '',
        role: 'sales_agent',
        phone: '',
        territory: 'Bangalore',
        monthlyQuota: 50,
        dailyCallLimit: 100,
        canExport: true,
        canTriggerAutopilot: true,
        canApproveProposals: false,
      });
      loadUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(u) {
    const newStatus = u.status === 'active' ? 'suspended' : 'active';
    try {
      await api.updateUser(u.id, { status: newStatus });
      setMessage({ type: 'success', text: `User status updated to ${newStatus}` });
      loadUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  async function handleDeleteUser(id, name) {
    if (!confirm(`Are you sure you want to delete user "${name}"? This action cannot be undone.`)) return;
    try {
      await api.deleteUser(id);
      setMessage({ type: 'success', text: `User ${name} deleted.` });
      loadUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 26 }}>👥</span>
            <div>
              <h1 className="page-title">User Management & Permissions</h1>
              <p className="text-sm text-secondary mt-1">
                Configure Super Admin, Manager, and Sales Agent accounts, assigned territories, call limits, and granular access rights.
              </p>
            </div>
          </div>
        </div>

        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
          + Add New User
        </button>
      </div>

      {message && (
        <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'}`}>
          {message.type === 'error' ? '❌' : '✅'} {message.text}
        </div>
      )}

      {/* Role Summary Badges */}
      <div className="grid-3 mb-6">
        {ROLES.map((r) => {
          const count = users.filter((u) => u.role === r.id).length;
          return (
            <div key={r.id} className="card" style={{ padding: 16 }}>
              <div className="flex justify-between items-center mb-1">
                <span className={`badge ${r.badge}`}>{r.label}</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: '#0F172A' }}>{count}</span>
              </div>
              <p className="text-xs text-muted mt-2">{r.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Users Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="flex justify-between items-center" style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', background: '#FAFAFC' }}>
          <h3 className="section-title">Platform Accounts ({users.length})</h3>
          <button className="btn btn-ghost btn-sm" onClick={loadUsers}>⟳ Refresh</button>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
            <p className="text-sm text-secondary">Loading users and permissions...</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User / Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Assigned Territory</th>
                  <th>Monthly Quota</th>
                  <th>Daily Calls</th>
                  <th>Permissions</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const roleObj = ROLES.find((r) => r.id === u.role) || ROLES[2];
                  const isActive = u.status === 'active';

                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 13.5 }}>{u.name}</div>
                        <div className="text-xs text-secondary mt-0.5">
                          ✉️ {u.email} {u.phone && `· 📞 ${u.phone}`}
                        </div>
                      </td>

                      <td>
                        <span className={`badge ${roleObj.badge}`}>{roleObj.label}</span>
                      </td>

                      <td>
                        <span className={`badge ${isActive ? 'badge-green' : 'badge-red'}`}>
                          {isActive ? '● Active' : '✕ Suspended'}
                        </span>
                      </td>

                      <td>
                        <div className="flex gap-1 flex-wrap">
                          {(u.territory || ['All']).slice(0, 3).map((t, idx) => (
                            <span key={idx} className="badge badge-gray" style={{ fontSize: 10 }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="font-bold">
                        {u.monthlyQuota} <span className="text-xs font-normal text-muted">leads</span>
                      </td>

                      <td className="font-bold">
                        {u.dailyCallLimit} <span className="text-xs font-normal text-muted">calls/day</span>
                      </td>

                      <td>
                        <div className="flex gap-1 flex-wrap">
                          {u.canExport && <span className="badge badge-blue" style={{ fontSize: 10 }}>CSV</span>}
                          {u.canTriggerAutopilot && <span className="badge badge-purple" style={{ fontSize: 10 }}>Autopilot</span>}
                          {u.canApproveProposals && <span className="badge badge-yellow" style={{ fontSize: 10 }}>Approve</span>}
                        </div>
                      </td>

                      <td>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '3px 8px', fontSize: 11 }}
                            onClick={() => handleToggleStatus(u)}
                            title={isActive ? 'Suspend User' : 'Activate User'}
                          >
                            {isActive ? '⏸️' : '▶️'}
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ padding: '3px 8px', fontSize: 11 }}
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            title="Delete User"
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal fade-in" style={{ maxWidth: 540 }}>
            <div className="modal-header">
              <h2 className="section-title">Add User & Configure Settings</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowAddModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateUser}>
              <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Full Name *
                  </label>
                  <input
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                    placeholder="Sanjay Rao"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Email Address *
                  </label>
                  <input
                    className="input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                    placeholder="sanjay@practo.com"
                  />
                </div>
              </div>

              <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Password *
                  </label>
                  <input
                    className="input"
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    placeholder="••••••••"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Role Assignment
                  </label>
                  <select
                    className="input"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="sales_agent">Sales Representative</option>
                    <option value="sales_manager">Sales Manager</option>
                    <option value="superadmin">Super Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Assigned Cities / Territory
                  </label>
                  <input
                    className="input"
                    value={form.territory}
                    onChange={(e) => setForm({ ...form, territory: e.target.value })}
                    placeholder="Bangalore, Delhi, Mumbai"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Phone Number
                  </label>
                  <input
                    className="input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98..."
                  />
                </div>
              </div>

              <div className="grid-2" style={{ gap: 12, marginBottom: 16 }}>
                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Monthly Target Quota
                  </label>
                  <input
                    className="input"
                    type="number"
                    value={form.monthlyQuota}
                    onChange={(e) => setForm({ ...form, monthlyQuota: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                    Daily Outbound Call Limit
                  </label>
                  <input
                    className="input"
                    type="number"
                    value={form.dailyCallLimit}
                    onChange={(e) => setForm({ ...form, dailyCallLimit: Number(e.target.value) })}
                  />
                </div>
              </div>

              {/* Granular Permissions Checkboxes */}
              <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, marginBottom: 16, border: '1px solid #E2E8F0' }}>
                <div className="text-xs font-bold text-secondary uppercase mb-2">Granular Access Controls</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.canExport}
                      onChange={(e) => setForm({ ...form, canExport: e.target.checked })}
                    />
                    <span className="text-xs font-medium text-secondary">Allow downloading & exporting CRM leads CSV</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.canTriggerAutopilot}
                      onChange={(e) => setForm({ ...form, canTriggerAutopilot: e.target.checked })}
                    />
                    <span className="text-xs font-medium text-secondary">Allow launching Autopilot Voice AI & WhatsApp campaigns</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={form.canApproveProposals}
                      onChange={(e) => setForm({ ...form, canApproveProposals: e.target.checked })}
                    />
                    <span className="text-xs font-medium text-secondary">Allow approving commercial email proposals before dispatch</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creating...' : 'Create User Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
