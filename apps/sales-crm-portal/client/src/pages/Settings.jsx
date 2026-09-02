import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCrm } from '../context/CrmContext';
import { api } from '../services/api';
import ProfilePictureModal from '../components/ProfilePictureModal';
import ApiDiagnosticsModal from '../components/ApiDiagnosticsModal';
import ManualPushModal from '../components/ManualPushModal';

export default function Settings() {
  const navigate = useNavigate();
  const { addToast, hasPermission, currentUser, isProfilePicModalOpen, setIsProfilePicModalOpen, isManualPushOpen, setIsManualPushOpen } = useCrm();
  const [team, setTeam] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const [teamData, intData] = await Promise.all([api.getTeam(), api.getIntegrations()]);
      setTeam(teamData.team || []);
      setIntegrations(intData.integrations || []);
    } catch (err) {
      addToast(err.message || 'Error loading settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSync = async (id, name) => {
    try {
      await api.syncIntegration(id);
      addToast(`Sync triggered for ${name}`, 'success');
      fetchSettings();
    } catch (err) {
      addToast(err.message || 'Sync failed', 'error');
    }
  };

  const handleResetData = async () => {
    if (!window.confirm('Reset all CRM data to default initial seed?')) return;
    try {
      await api.resetDemoData();
      addToast('CRM database reset to default state', 'info');
      fetchSettings();
    } catch (err) {
      addToast(err.message || 'Reset failed', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-navy">System, Team & Profile Settings</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Role Matrix, User Profile & Connected APIs</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            Settings & System Health
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => setShowDiagnostics(true)} className="btn btn-secondary btn-sm" style={{ border: '1.5px solid #0284C7', color: '#0284C7' }}>
            🔌 Inspect Connected APIs
          </button>
          <button onClick={() => setIsManualPushOpen(true)} className="btn btn-primary btn-sm">
            ⚡ + Manual Number Push
          </button>
          {hasPermission('manage_team') && (
            <button onClick={handleResetData} className="btn btn-danger btn-sm">
              ⚠️ Reset Demo DB
            </button>
          )}
        </div>
      </div>

      {/* User Profile Card */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 24px',
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              overflow: 'hidden',
              background: '#233876',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: '24px',
              fontWeight: 800,
              boxShadow: '0 4px 10px rgba(35, 56, 118, 0.25)',
              border: '3px solid #E2E8F0',
              flexShrink: 0,
            }}
          >
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              currentUser?.name?.charAt(0) || 'U'
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                {currentUser?.name || 'Superadmin User'}
              </h3>
              <span className="badge badge-emerald">{currentUser?.role || 'Superadmin'}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px' }}>
              {currentUser?.email || 'admin@practo.sales'} • Active Session
            </div>
            <div style={{ fontSize: '11px', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
              ● Full Access & Permissions Enabled
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsProfilePicModalOpen(true)}
          className="btn btn-secondary btn-sm"
          style={{ padding: '8px 16px', fontWeight: 700, border: '1.5px solid #233876', color: '#233876', background: '#F8FAFC' }}
        >
          📸 Set / Change Profile Picture
        </button>
      </div>

      {/* API Configuration Quick Access Banner */}
      <div
        className="glass-panel"
        style={{
          padding: '20px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366F1, #06B6D4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
              color: '#FFF',
              boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)',
            }}
          >
            ⚡
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Autonomous API & Webhook Configuration Engine
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: '3px 0 0' }}>
              Configure n8n workflows, Groq LLaMA 3.3 LLM, Retell AI Voice Calling, WhatsApp Cloud API & SendGrid
            </p>
          </div>
        </div>

        <button onClick={() => navigate('/integrations')} className="btn btn-emerald btn-sm" style={{ padding: '10px 18px', fontWeight: 800 }}>
          Manage API Keys & Webhooks →
        </button>
      </div>

      {/* Team Members Roster */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>
          Active Sales & Compliance Team Members
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
          {team.map((user) => (
            <div
              key={user.id}
              style={{
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366F1, #06B6D4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '14px',
                }}
              >
                {user.name.charAt(0)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>{user.name}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--accent-cyan)' }}>{user.role}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Pipeline: ₹{(user.pipelineValue || 0).toLocaleString()} • Quota: {user.quotaAttainment || 100}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cloud & Healthcare Integrations */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
            Connected Practo & Sales Cloud Integrations
          </h3>
          <button onClick={() => navigate('/integrations')} className="btn btn-secondary btn-sm" style={{ fontSize: '11.5px' }}>
            Configure All Keys →
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
          {integrations.map((item) => (
            <div
              key={item.id}
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>{item.name}</h4>
                  <span className="badge badge-emerald">{item.status}</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  {item.description}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Synced: {item.recordsSynced?.toLocaleString()} records
                </span>
                <button onClick={() => handleSync(item.id, item.name)} className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: '11px' }}>
                  🔄 Sync Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RBAC Security Matrix View */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px' }}>
          Role-Based Access Control (RBAC) Permissions Matrix
        </h3>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Permission Area</th>
                <th>SuperAdmin</th>
                <th>Sales Manager</th>
                <th>Account Executive</th>
                <th>SDR</th>
                <th>Auditor</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Executive Dashboard & Analytics</td>
                <td><span style={{ color: '#10B981' }}>✓ Full</span></td>
                <td><span style={{ color: '#10B981' }}>✓ Full</span></td>
                <td><span style={{ color: '#10B981' }}>✓ Full</span></td>
                <td><span style={{ color: '#10B981' }}>✓ Full</span></td>
                <td><span style={{ color: '#10B981' }}>✓ Read Only</span></td>
              </tr>
              <tr>
                <td>Practo Lead Management</td>
                <td><span style={{ color: '#10B981' }}>✓ CRUD</span></td>
                <td><span style={{ color: '#10B981' }}>✓ CRUD</span></td>
                <td><span style={{ color: '#10B981' }}>✓ Edit/View</span></td>
                <td><span style={{ color: '#10B981' }}>✓ Edit/View</span></td>
                <td><span style={{ color: '#10B981' }}>✓ View (Masked)</span></td>
              </tr>
              <tr>
                <td>AI Pilot & Pitch Studio Generator</td>
                <td><span style={{ color: '#10B981' }}>✓ Full</span></td>
                <td><span style={{ color: '#10B981' }}>✓ Full</span></td>
                <td><span style={{ color: '#10B981' }}>✓ Full</span></td>
                <td><span style={{ color: '#10B981' }}>✓ Full</span></td>
                <td><span style={{ color: '#F43F5E' }}>✗ No</span></td>
              </tr>
              <tr>
                <td>Custom Reporting Studio</td>
                <td><span style={{ color: '#10B981' }}>✓ Full</span></td>
                <td><span style={{ color: '#10B981' }}>✓ Full</span></td>
                <td><span style={{ color: '#10B981' }}>✓ Full</span></td>
                <td><span style={{ color: '#F43F5E' }}>✗ No</span></td>
                <td><span style={{ color: '#10B981' }}>✓ Full</span></td>
              </tr>
              <tr>
                <td>Audit Ledger & Privacy Purge</td>
                <td><span style={{ color: '#10B981' }}>✓ Full</span></td>
                <td><span style={{ color: '#10B981' }}>✓ View Logs</span></td>
                <td><span style={{ color: '#F43F5E' }}>✗ No</span></td>
                <td><span style={{ color: '#F43F5E' }}>✗ No</span></td>
                <td><span style={{ color: '#10B981' }}>✓ Full Governance</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {showDiagnostics && <ApiDiagnosticsModal onClose={() => setShowDiagnostics(false)} />}
    </div>
  );
}
