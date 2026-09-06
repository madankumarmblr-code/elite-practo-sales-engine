import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client.js';
import { EnterpriseIcon } from '../components/EnterpriseIcon.jsx';

const ROLE_CONFIG = [
  { id: 'all', label: 'All Roles', badge: 'badge-gray' },
  { id: 'superadmin', label: 'Super Admin', badge: 'badge-purple', desc: 'Unrestricted platform control, team management, security & keys' },
  { id: 'admin', label: 'Administrator', badge: 'badge-purple', desc: 'Full operational access to CRM, campaigns, scraper & team settings' },
  { id: 'sales_manager', label: 'Sales Manager', badge: 'badge-blue', desc: 'Pipeline oversight, lead assignment, Autopilot campaigns & proposal approval' },
  { id: 'sales_agent', label: 'Sales Rep', badge: 'badge-teal', desc: 'Daily calling, doctor outreach, AI call triggering & proposal drafting' },
  { id: 'ops_specialist', label: 'Operations Specialist', badge: 'badge-yellow', desc: 'Doctor web scraping, clinic data cleaning & bulk CSV import' },
  { id: 'auditor', label: 'Compliance Auditor', badge: 'badge-gray', desc: 'Read-only access to audit trails, call recordings & compliance logs' },
];

const PRESET_TERRITORIES = [
  'Bangalore', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Ahmedabad'
];

const DEPARTMENTS = [
  'Enterprise Sales', 'Inside Sales & BD', 'Field Sales', 'Operations & Scraping', 'Compliance & Legal', 'Executive Leadership'
];

export default function UsersManagementPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState({ roles: {}, permissions: [] });
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal States
  const [showModal, setShowModal] = useState(false); // Add or Edit
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [modalTab, setModalTab] = useState('profile'); // 'profile' | 'quotas' | 'permissions'
  const [editingUserId, setEditingUserId] = useState(null);

  // Password Reset Modal
  const [resetModalUser, setResetModalUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Form State
  const initialForm = {
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'sales_agent',
    department: 'Enterprise Sales',
    phone: '',
    territory: ['Bangalore'],
    monthlyQuota: 50,
    dailyCallLimit: 100,
    canExport: true,
    canTriggerAutopilot: true,
    canApproveProposals: false,
    permissions: [],
  };

  const [form, setForm] = useState(initialForm);

  // Load users and permissions catalog
  async function loadData() {
    setLoading(true);
    try {
      const [usersData, catalogData] = await Promise.all([
        api.getUsers(),
        api.getRolesAndPermissions().catch(() => ({ roles: {}, permissions: [] })),
      ]);
      setUsers(usersData || []);
      if (catalogData && catalogData.permissions) {
        setCatalog(catalogData);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchName = (u.name || '').toLowerCase().includes(q);
        const matchEmail = (u.email || '').toLowerCase().includes(q);
        const matchUsername = (u.username || '').toLowerCase().includes(q);
        const matchDept = (u.department || '').toLowerCase().includes(q);
        const matchTerritory = (u.territory || []).some((t) => t.toLowerCase().includes(q));
        if (!matchName && !matchEmail && !matchUsername && !matchDept && !matchTerritory) return false;
      }
      return true;
    });
  }, [users, roleFilter, statusFilter, search]);

  // Grouped permissions from catalog or fallback
  const groupedPermissions = useMemo(() => {
    const perms = catalog.permissions || [];
    const groups = {};
    for (const p of perms) {
      const g = p.group || 'General';
      if (!groups[g]) groups[g] = [];
      groups[g].push(p);
    }
    return groups;
  }, [catalog]);

  function handleOpenCreate() {
    setModalMode('create');
    setModalTab('profile');
    setEditingUserId(null);

    // Default permissions for sales_agent
    const defaultPerms = catalog.roles?.sales_agent?.permissions || [
      'dashboard:read', 'leads:read', 'leads:write', 'export:read', 'voice:call', 'voice:read'
    ];

    setForm({
      ...initialForm,
      permissions: defaultPerms,
    });
    setShowModal(true);
  }

  function handleOpenEdit(user) {
    setModalMode('edit');
    setModalTab('profile');
    setEditingUserId(user.id);

    setForm({
      name: user.name || '',
      email: user.email || '',
      username: user.username || user.email || '',
      password: '', // leave empty to keep unchanged
      role: user.role || 'sales_agent',
      department: user.department || 'Enterprise Sales',
      phone: user.phone || '',
      territory: Array.isArray(user.territory) ? user.territory : [user.territory || 'Bangalore'],
      monthlyQuota: user.monthlyQuota ?? 50,
      dailyCallLimit: user.dailyCallLimit ?? 100,
      canExport: Boolean(user.canExport),
      canTriggerAutopilot: Boolean(user.canTriggerAutopilot),
      canApproveProposals: Boolean(user.canApproveProposals),
      permissions: Array.isArray(user.permissions) ? user.permissions : [],
    });
    setShowModal(true);
  }

  // Handle Role Change: auto-populate default permissions
  function handleRoleChange(newRole) {
    const roleObj = catalog.roles?.[newRole];
    const defaultPerms = roleObj?.permissions || [];
    setForm((prev) => ({
      ...prev,
      role: newRole,
      permissions: newRole === 'superadmin' ? ['*'] : defaultPerms,
      canApproveProposals: newRole === 'superadmin' || newRole === 'sales_manager' || newRole === 'admin',
    }));
  }

  // Toggle single permission
  function togglePermission(permId) {
    setForm((prev) => {
      const current = new Set(prev.permissions || []);
      if (current.has('*')) {
        current.delete('*');
      }
      if (current.has(permId)) {
        current.delete(permId);
      } else {
        current.add(permId);
      }
      return { ...prev, permissions: Array.from(current) };
    });
  }

  // Toggle group of permissions
  function toggleGroup(groupName, selectAll) {
    const groupPerms = groupedPermissions[groupName] || [];
    setForm((prev) => {
      const current = new Set(prev.permissions || []);
      current.delete('*');
      for (const p of groupPerms) {
        if (selectAll) current.add(p.id);
        else current.delete(p.id);
      }
      return { ...prev, permissions: Array.from(current) };
    });
  }

  // Reset to current role defaults
  function handleResetToRoleDefaults() {
    const roleObj = catalog.roles?.[form.role];
    const defaultPerms = roleObj?.permissions || [];
    setForm((prev) => ({
      ...prev,
      permissions: form.role === 'superadmin' ? ['*'] : defaultPerms,
    }));
  }

  // Toggle Territory selection
  function toggleTerritory(city) {
    setForm((prev) => {
      const list = prev.territory || [];
      const exists = list.includes(city);
      const next = exists ? list.filter((c) => c !== city) : [...list, city];
      return { ...prev, territory: next.length > 0 ? next : [city] };
    });
  }

  // Submit Create or Edit User
  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        username: form.username.trim(),
        role: form.role,
        department: form.department,
        phone: form.phone.trim(),
        territory: form.territory,
        monthlyQuota: Number(form.monthlyQuota),
        dailyCallLimit: Number(form.dailyCallLimit),
        canExport: Boolean(form.canExport),
        canTriggerAutopilot: Boolean(form.canTriggerAutopilot),
        canApproveProposals: Boolean(form.canApproveProposals),
        permissions: form.permissions,
      };

      if (form.password) {
        payload.password = form.password;
      }

      if (modalMode === 'create') {
        if (!form.password) {
          throw new Error('Password is required for new users');
        }
        await api.createUser(payload);
        setMessage({ type: 'success', text: `User account created successfully for ${form.name}!` });
      } else {
        await api.updateUser(editingUserId, payload);
        setMessage({ type: 'success', text: `Settings and permissions updated for ${form.name}!` });
      }

      setShowModal(false);
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  // Quick Toggle Status
  async function handleToggleStatus(u) {
    const nextStatus = u.status === 'active' ? 'suspended' : 'active';
    try {
      await api.updateUser(u.id, { status: nextStatus });
      setMessage({ type: 'success', text: `User ${u.name} is now ${nextStatus.toUpperCase()}.` });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    }
  }

  // Execute Password Reset
  async function handleResetPasswordSubmit(e) {
    e.preventDefault();
    if (!resetModalUser || !newPassword) return;
    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
      return;
    }
    setResettingPassword(true);
    try {
      await api.resetUserPassword(resetModalUser.id, newPassword);
      setMessage({ type: 'success', text: `Password successfully updated for ${resetModalUser.name}!` });
      setResetModalUser(null);
      setNewPassword('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setResettingPassword(false);
    }
  }

  // Delete User
  async function handleDeleteUser(u) {
    if (u.id === 'user_superadmin' || u.username === 'superadmin') {
      alert('The primary Super Admin account is protected and cannot be deleted.');
      return;
    }
    if (!confirm(`Are you sure you want to delete user "${u.name}" (${u.email})? This action cannot be undone.`)) return;
    try {
      await api.deleteUser(u.id);
      setMessage({ type: 'success', text: `User ${u.name} removed from platform.` });
      loadData();
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
            <span style={{ fontSize: 28 }}>🛡️</span>
            <div>
              <h1 className="page-title">Enterprise User & Permission Level Settings</h1>
              <p className="text-sm text-secondary mt-1">
                Manage roles, granular access matrices, sales quotas, territory allocations, and governance controls.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="btn btn-ghost btn-sm" onClick={loadData}>
            ⟳ Refresh
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleOpenCreate}>
            + Add New User
          </button>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.type === 'error' ? 'alert-error' : 'alert-success'} mb-4`}>
          {message.type === 'error' ? '❌' : '✅'} {message.text}
        </div>
      )}

      {/* Role Cards Overview */}
      <div className="grid-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {ROLE_CONFIG.slice(1).map((r) => {
          const count = users.filter((u) => u.role === r.id).length;
          const isSelected = roleFilter === r.id;
          return (
            <div
              key={r.id}
              className="card cursor-pointer"
              onClick={() => setRoleFilter(isSelected ? 'all' : r.id)}
              style={{
                padding: '14px 16px',
                border: isSelected ? '2px solid #002A54' : '1px solid var(--border)',
                background: isSelected ? '#F0F7FF' : 'var(--bg-card)',
                transition: 'all 0.15s ease',
              }}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={`badge ${r.badge}`}>{r.label}</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: '#0F172A' }}>{count}</span>
              </div>
              <p className="text-xs text-muted mt-2" style={{ lineHeight: 1.4 }}>{r.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="card mb-6" style={{ padding: '14px 18px', background: '#FAFAFC' }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 flex-1" style={{ minWidth: 260 }}>
            <span style={{ fontSize: 16 }}>🔍</span>
            <input
              className="input"
              style={{ background: '#FFF' }}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, username, territory, department..."
            />
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-secondary uppercase">Role:</span>
              <select
                className="input"
                style={{ width: 'auto', background: '#FFF' }}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                {ROLE_CONFIG.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-secondary uppercase">Status:</span>
              <select
                className="input"
                style={{ width: 'auto', background: '#FFF' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Accounts</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {(roleFilter !== 'all' || statusFilter !== 'all' || search) && (
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => { setRoleFilter('all'); setStatusFilter('all'); setSearch(''); }}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="flex justify-between items-center" style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', background: '#FAFAFC' }}>
          <div>
            <h3 className="section-title">Platform Team Accounts ({filteredUsers.length} of {users.length})</h3>
            <p className="text-xs text-secondary mt-0.5">Configured roles, call quotas, and custom permission matrices</p>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
            <p className="text-sm text-secondary">Loading enterprise accounts and security profiles...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <span style={{ fontSize: 36 }}>🔍</span>
            <p className="text-sm text-secondary mt-2">No team accounts match your filter criteria.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>User / Department</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Territories</th>
                  <th>Lead Quota</th>
                  <th>Call Limit</th>
                  <th>Permission Level</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const roleObj = ROLE_CONFIG.find((r) => r.id === u.role) || { label: u.role, badge: 'badge-gray' };
                  const isActive = u.status === 'active';
                  const isFullAccess = (u.permissions || []).includes('*') || u.role === 'superadmin';
                  const permCount = isFullAccess ? 'Full (*)' : `${(u.permissions || []).length} perms`;

                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              background: '#002A54',
                              color: '#FFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 13,
                              fontWeight: 800,
                            }}
                          >
                            {(u.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 13.5 }}>{u.name}</div>
                            <div className="text-xs text-secondary">
                              ✉️ {u.email} {u.phone && `· 📞 ${u.phone}`}
                            </div>
                            <div className="text-xs text-muted" style={{ fontSize: 11 }}>
                              🏢 {u.department || 'Enterprise Sales'}
                            </div>
                          </div>
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
                        <div className="flex gap-1 flex-wrap" style={{ maxWidth: 180 }}>
                          {(u.territory || ['Bangalore']).map((t, idx) => (
                            <span key={idx} className="badge badge-gray" style={{ fontSize: 10 }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="font-bold">
                        {u.monthlyQuota} <span className="text-xs font-normal text-muted">leads/mo</span>
                      </td>

                      <td className="font-bold">
                        {u.dailyCallLimit} <span className="text-xs font-normal text-muted">calls/day</span>
                      </td>

                      <td>
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={`badge ${isFullAccess ? 'badge-purple' : 'badge-blue'}`} style={{ fontSize: 10.5 }}>
                            {permCount}
                          </span>
                          {u.canExport && <span className="badge badge-teal" style={{ fontSize: 9.5 }}>CSV</span>}
                          {u.canTriggerAutopilot && <span className="badge badge-yellow" style={{ fontSize: 9.5 }}>Autopilot</span>}
                          {u.canApproveProposals && <span className="badge badge-green" style={{ fontSize: 9.5 }}>Approval</span>}
                        </div>
                      </td>

                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            className="btn btn-secondary btn-xs"
                            style={{ padding: '4px 8px' }}
                            onClick={() => handleOpenEdit(u)}
                            title="Edit User & Permissions"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="btn btn-ghost btn-xs"
                            style={{ padding: '4px 8px' }}
                            onClick={() => { setResetModalUser(u); setNewPassword(''); }}
                            title="Reset Password"
                          >
                            🔑
                          </button>
                          <button
                            className="btn btn-ghost btn-xs"
                            style={{ padding: '4px 8px' }}
                            onClick={() => handleToggleStatus(u)}
                            title={isActive ? 'Suspend User' : 'Activate User'}
                          >
                            <EnterpriseIcon name={isActive ? 'pause' : 'play'} size={12} color="#475569" />
                          </button>
                          {u.id !== 'user_superadmin' && u.username !== 'superadmin' && (
                            <button
                              className="btn btn-danger btn-xs"
                              style={{ padding: '4px 6px' }}
                              onClick={() => handleDeleteUser(u)}
                              title="Delete Account"
                            >
                              <EnterpriseIcon name="trash" size={12} color="#DC2626" />
                            </button>
                          )}
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

      {/* Add / Edit User Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal fade-in" style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div>
                <h2 className="section-title">
                  {modalMode === 'create' ? 'Add New Enterprise User' : `Edit Account: ${form.name}`}
                </h2>
                <p className="text-xs text-secondary mt-0.5">
                  Assign credentials, operational quotas, and granular security permissions
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {/* Modal Tabs */}
            <div className="flex gap-2 mb-4" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
              <button
                type="button"
                className={`btn btn-xs ${modalTab === 'profile' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setModalTab('profile')}
              >
                👤 Profile & Credentials
              </button>
              <button
                type="button"
                className={`btn btn-xs ${modalTab === 'quotas' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setModalTab('quotas')}
              >
                📈 Role, Quotas & Territory
              </button>
              <button
                type="button"
                className={`btn btn-xs ${modalTab === 'permissions' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setModalTab('permissions')}
              >
                🛡️ Granular Permission Matrix ({form.role === 'superadmin' ? 'Full (*)' : `${form.permissions.length} selected`})
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {/* TAB 1: PROFILE & CREDENTIALS */}
              {modalTab === 'profile' && (
                <div>
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
                        placeholder="Dr. Sanjay Rao / Karan Patel"
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
                        Username
                      </label>
                      <input
                        className="input"
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        placeholder="sanjay.rao"
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
                        placeholder="+91 9876543210"
                      />
                    </div>
                  </div>

                  <div className="grid-2" style={{ gap: 12, marginBottom: 12 }}>
                    <div>
                      <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                        Department / Business Unit
                      </label>
                      <select
                        className="input"
                        value={form.department}
                        onChange={(e) => setForm({ ...form, department: e.target.value })}
                      >
                        {DEPARTMENTS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                        {modalMode === 'create' ? 'Password *' : 'Update Password (leave blank to keep current)'}
                      </label>
                      <input
                        className="input"
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required={modalMode === 'create'}
                        placeholder={modalMode === 'create' ? 'Min 6 characters' : '••••••••'}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: ROLE, QUOTAS & TERRITORY */}
              {modalTab === 'quotas' && (
                <div>
                  <div className="mb-4">
                    <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                      Primary Role Assignment
                    </label>
                    <div className="grid-2" style={{ gap: 10 }}>
                      {ROLE_CONFIG.slice(1).map((r) => {
                        const isSelected = form.role === r.id;
                        return (
                          <div
                            key={r.id}
                            className="cursor-pointer"
                            onClick={() => handleRoleChange(r.id)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: 8,
                              border: isSelected ? '2px solid #002A54' : '1px solid var(--border)',
                              background: isSelected ? '#F0F7FF' : '#FFF',
                            }}
                          >
                            <div className="flex justify-between items-center">
                              <span style={{ fontWeight: 700, fontSize: 13 }}>{r.label}</span>
                              <span className={`badge ${r.badge}`} style={{ fontSize: 9.5 }}>{r.id}</span>
                            </div>
                            <p className="text-xs text-muted mt-1" style={{ fontSize: 11 }}>{r.desc}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid-2" style={{ gap: 12, marginBottom: 14 }}>
                    <div>
                      <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                        Monthly Closed Lead Quota
                      </label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={form.monthlyQuota}
                        onChange={(e) => setForm({ ...form, monthlyQuota: Number(e.target.value) })}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                        Daily AI Call Limit
                      </label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        value={form.dailyCallLimit}
                        onChange={(e) => setForm({ ...form, dailyCallLimit: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* Assigned Territories */}
                  <div className="mb-4">
                    <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                      Assigned Territories / Doctor Markets
                    </label>
                    <div className="flex gap-2 flex-wrap mb-2">
                      {PRESET_TERRITORIES.map((city) => {
                        const isSelected = form.territory.includes(city);
                        return (
                          <button
                            key={city}
                            type="button"
                            className={`btn btn-xs ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => toggleTerritory(city)}
                          >
                            {isSelected ? '✓ ' : '+ '} {city}
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-xs text-muted">Currently assigned: {form.territory.join(', ')}</span>
                  </div>

                  {/* Operational Guardrails */}
                  <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    <div className="text-xs font-bold text-secondary uppercase mb-2">Operational Safeguards & Toggles</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={form.canExport}
                          onChange={(e) => setForm({ ...form, canExport: e.target.checked })}
                        />
                        <span className="text-xs font-medium text-secondary">Allow exporting & downloading CRM leads CSV</span>
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
                        <span className="text-xs font-medium text-secondary">Allow approving discounted commercial proposals</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: GRANULAR PERMISSIONS MATRIX */}
              {modalTab === 'permissions' && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <span className="text-xs font-bold text-secondary uppercase">
                        Fine-Grained Permissions
                      </span>
                      <p className="text-xs text-muted">Customize individual action rights beyond default role template</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn btn-ghost btn-xs"
                        onClick={handleResetToRoleDefaults}
                      >
                        Reset to Role Defaults
                      </button>
                    </div>
                  </div>

                  {form.role === 'superadmin' ? (
                    <div className="card text-center" style={{ padding: 24, background: '#FAF5FF', border: '1px solid #E9D5FF' }}>
                      <span style={{ fontSize: 24 }}>👑</span>
                      <div className="font-bold text-sm mt-1" style={{ color: '#6B21A8' }}>Super Administrator Full Access</div>
                      <p className="text-xs text-secondary mt-1">
                        This role bypasses granular restrictions and holds unconditional access (<code>*</code>) across all APIs.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {Object.entries(groupedPermissions).map(([groupName, perms]) => {
                        const allSelected = perms.every((p) => form.permissions.includes(p.id));
                        return (
                          <div
                            key={groupName}
                            style={{
                              background: '#FFF',
                              border: '1px solid #E2E8F0',
                              borderRadius: 8,
                              padding: 12,
                            }}
                          >
                            <div className="flex justify-between items-center mb-2 pb-1" style={{ borderBottom: '1px solid #F1F5F9' }}>
                              <span style={{ fontSize: 12, fontWeight: 800, color: '#002A54', textTransform: 'uppercase' }}>
                                {groupName}
                              </span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  className="text-xs text-blue-600 hover:underline"
                                  onClick={() => toggleGroup(groupName, true)}
                                >
                                  Select All
                                </button>
                                <span className="text-muted text-xs">|</span>
                                <button
                                  type="button"
                                  className="text-xs text-gray-500 hover:underline"
                                  onClick={() => toggleGroup(groupName, false)}
                                >
                                  Clear
                                </button>
                              </div>
                            </div>

                            <div className="grid-2" style={{ gap: 8 }}>
                              {perms.map((p) => {
                                const isChecked = form.permissions.includes(p.id) || form.permissions.includes('*');
                                return (
                                  <label
                                    key={p.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: 8,
                                      cursor: 'pointer',
                                      padding: '4px 6px',
                                      borderRadius: 6,
                                      background: isChecked ? '#F8FAFC' : 'transparent',
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => togglePermission(p.id)}
                                      style={{ marginTop: 2 }}
                                    />
                                    <div>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>{p.label}</div>
                                      <div className="text-xs text-muted" style={{ fontSize: 10.5 }}>{p.desc || p.id}</div>
                                    </div>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Modal Footer */}
              <div className="flex justify-between items-center pt-4 mt-4" style={{ borderTop: '1px solid #E2E8F0' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <div className="flex gap-2">
                  {modalTab !== 'profile' && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setModalTab(modalTab === 'permissions' ? 'quotas' : 'profile')}
                    >
                      ← Back
                    </button>
                  )}
                  {modalTab !== 'permissions' ? (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setModalTab(modalTab === 'profile' ? 'quotas' : 'permissions')}
                    >
                      Next Step →
                    </button>
                  ) : null}
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : modalMode === 'create' ? 'Create User Account' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Password Reset Modal */}
      {resetModalUser && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setResetModalUser(null)}>
          <div className="modal fade-in" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <div>
                <h3 className="section-title">Reset User Password</h3>
                <p className="text-xs text-secondary mt-0.5">
                  Update credentials for <strong>{resetModalUser.name}</strong> ({resetModalUser.email})
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setResetModalUser(null)}>✕</button>
            </div>

            <form onSubmit={handleResetPasswordSubmit}>
              <div className="mb-4">
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                  New Password *
                </label>
                <input
                  className="input"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Minimum 6 characters"
                  autoFocus
                />
              </div>

              <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setResetModalUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={resettingPassword}>
                  {resettingPassword ? 'Updating...' : 'Set New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
