import React, { useState, useEffect } from 'react';
import { useCrm } from '../context/CrmContext';
import { api } from '../services/api';

export default function TeamManagement() {
  const { addToast, currentUser } = useCrm();
  const [users, setUsers] = useState([]);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State for New / Edit User
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    userId: '',
    email: '',
    password: '',
    role: 'account_executive',
    title: 'Senior Account Executive',
    city: 'Bangalore',
    phone: '',
    status: 'Active',
    permissions: [],
  });

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.getUsers();
      setUsers(res.users || []);
      setAvailableRoles(res.availableRoles || []);
      setAllPermissions(res.allPermissions || []);
    } catch (err) {
      addToast(err.message || 'Failed to load team members', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      name: '',
      userId: '',
      email: '',
      password: '',
      role: 'account_executive',
      title: 'Senior Account Executive',
      city: 'Bangalore',
      phone: '',
      status: 'Active',
      permissions: ['lead_scraping', 'crm_pipeline_edit', 'proposal_create', 'slot_booking'],
    });
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      userId: user.userId,
      email: user.email,
      password: '',
      role: user.role,
      title: user.title,
      city: user.city || 'Bangalore',
      phone: user.phone || '',
      status: user.status || 'Active',
      permissions: user.permissions || [],
    });
    setShowModal(true);
  };

  const togglePermission = (permId) => {
    setFormData((prev) => {
      const perms = prev.permissions.includes(permId)
        ? prev.permissions.filter((p) => p !== permId)
        : [...prev.permissions, permId];
      return { ...prev, permissions: perms };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.userId.trim()) {
      addToast('Name and User ID are required', 'error');
      return;
    }

    if (!editingUser && !formData.password.trim()) {
      addToast('Password is required for new user', 'error');
      return;
    }

    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, formData);
        addToast(`User ${formData.name} updated successfully`, 'success');
      } else {
        await api.createUser(formData);
        addToast(`User ${formData.name} (${formData.userId}) created successfully`, 'success');
      }
      setShowModal(false);
      loadUsers();
    } catch (err) {
      addToast(err.message || 'Error saving user', 'error');
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(`Are you sure you want to remove user ${user.name}?`)) return;
    try {
      await api.deleteUser(user.id);
      addToast(`User ${user.name} removed successfully`, 'success');
      loadUsers();
    } catch (err) {
      addToast(err.message || 'Error deleting user', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-navy">RBAC Security Engine</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Practo Sales Team Governance</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            Sales Team & User Permission Management
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Create and configure Superadmins, Sales VPs, Managers, AEs, and SDRs with custom permission levels.
          </p>
        </div>

        <button onClick={openCreateModal} className="btn btn-primary">
          + Create New Team User
        </button>
      </div>

      {/* User Directory Table */}
      <div className="glass-panel table-container">
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Authorized Workspace Users
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {users.length} active team members with configured access roles
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading team directory...
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>User Details</th>
                <th>Role & Title</th>
                <th>Territory / City</th>
                <th>Contact</th>
                <th>Permission Matrix</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>{u.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--practo-cyan)', fontWeight: 600 }}>@{u.userId}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{u.email}</div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: u.role === 'superadmin' ? '#EEF2FF' : u.role === 'sales_manager' ? '#E0F7FE' : '#F1F5F9',
                        color: u.role === 'superadmin' ? '#233876' : u.role === 'sales_manager' ? '#0369A1' : '#475569',
                        display: 'inline-block',
                        marginBottom: '4px',
                        textTransform: 'uppercase',
                      }}
                    >
                      {u.role.replace('_', ' ')}
                    </span>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{u.title}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{u.city || 'Bangalore'}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{u.phone || '—'}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '280px' }}>
                      {(u.permissions || []).slice(0, 4).map((p) => (
                        <span key={p} style={{ fontSize: '10px', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '1px 5px', borderRadius: '4px', color: '#475569' }}>
                          {p.replace(/_/g, ' ')}
                        </span>
                      ))}
                      {(u.permissions || []).length > 4 && (
                        <span style={{ fontSize: '10px', color: 'var(--practo-cyan)', fontWeight: 700 }}>
                          +{u.permissions.length - 4} more
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '100px',
                        background: u.status === 'Active' ? '#D1FAE5' : '#FEE2E2',
                        color: u.status === 'Active' ? '#059669' : '#DC2626',
                      }}
                    >
                      {u.status || 'Active'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button onClick={() => openEditModal(u)} className="btn btn-secondary btn-sm" style={{ padding: '4px 8px' }}>
                        ✏️ Edit
                      </button>
                      {u.userId !== 'admin' && (
                        <button onClick={() => handleDelete(u)} className="btn btn-danger btn-sm" style={{ padding: '4px 8px' }}>
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Create / Edit User Modal ─────────────────────────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '16px' }}>
          <div style={{ width: '100%', maxWidth: '580px', background: '#FFFFFF', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFC' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#233876' }}>
                  {editingUser ? `Edit User: ${editingUser.name}` : 'Create New Sales Team Member'}
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                  Configure role, credentials, and granular security permissions
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#64748B' }}>✕</button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Full Name *</label>
                  <input className="input-field" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. Ananya Sharma" />
                </div>
                <div>
                  <label className="input-label">User ID / Username *</label>
                  <input className="input-field" required value={formData.userId} onChange={(e) => setFormData({ ...formData, userId: e.target.value })} placeholder="e.g. ananya" disabled={!!editingUser} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Email Address</label>
                  <input className="input-field" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="ananya@practo.com" />
                </div>
                <div>
                  <label className="input-label">{editingUser ? 'Reset Password (optional)' : 'Password *'}</label>
                  <input className="input-field" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" required={!editingUser} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Role Level</label>
                  <select className="select-field" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                    {availableRoles.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-label">Designation / Title</label>
                  <input className="input-field" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Senior Account Executive" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="input-label">Assigned City / Territory</label>
                  <input className="input-field" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="e.g. Bangalore South" />
                </div>
                <div>
                  <label className="input-label">Phone Number</label>
                  <input className="input-field" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+91 98765 43210" />
                </div>
              </div>

              {/* Granular Permission Checkboxes */}
              <div>
                <label className="input-label" style={{ marginBottom: '8px' }}>
                  Granular Permission Level Overrides
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#F8FAFC', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  {allPermissions.map((perm) => (
                    <label key={perm.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.permissions.includes(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                        style={{ accentColor: '#233876', width: '15px', height: '15px' }}
                      />
                      <span>{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
