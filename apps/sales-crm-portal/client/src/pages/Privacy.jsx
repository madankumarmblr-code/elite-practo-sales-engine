import React, { useState, useEffect } from 'react';
import { useCrm } from '../context/CrmContext';
import { api } from '../services/api';

export default function Privacy() {
  const { addToast, hasPermission } = useCrm();
  const [privacyData, setPrivacyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retentionDays, setRetentionDays] = useState(365);

  const fetchPrivacyStatus = async () => {
    try {
      setLoading(true);
      const data = await api.getPrivacyStatus();
      setPrivacyData(data);
    } catch (err) {
      addToast(err.message || 'Error fetching privacy status', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrivacyStatus();
  }, []);

  const handlePurge = async () => {
    if (!window.confirm(`Enforce retention policy and purge records older than ${retentionDays} days?`)) return;
    try {
      const res = await api.purgeStaleData(retentionDays);
      addToast(res.message || 'Data retention policy enforced', 'success');
      fetchPrivacyStatus();
    } catch (err) {
      addToast(err.message || 'Failed to enforce policy', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-emerald">DPDP & GDPR Compliant</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Enterprise Privacy Governance</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            Data Privacy & Healthcare Compliance
          </h1>
        </div>
      </div>

      {/* Compliance Framework Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {privacyData?.frameworks?.map((fw, idx) => (
          <div key={idx} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700 }}>{fw.name}</h3>
              <span className="badge badge-emerald">{fw.status}</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {fw.details}
            </p>
            <div style={{ fontSize: '12px', color: 'var(--accent-cyan)', fontWeight: 600, marginTop: 'auto' }}>
              Compliance Health: {fw.level}
            </div>
          </div>
        ))}
      </div>

      {/* Privacy Stats & Masking Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '16px' }}>
            PII Masking & Encryption Posture
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Automated PII Masking:</span>
              <strong style={{ color: '#10B981' }}>Active (Segmented by Role)</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Anonymized Practitioner Records:</span>
              <strong style={{ color: 'var(--text-primary)' }}>{privacyData?.stats?.anonymizedRecords || 0}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Consent Capture Rate:</span>
              <strong style={{ color: 'var(--accent-cyan)' }}>{privacyData?.stats?.activeConsentRate || '99.4%'}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Database Encryption:</span>
              <strong style={{ color: 'var(--accent-purple)' }}>{privacyData?.stats?.encryptionLevel}</strong>
            </div>
          </div>
        </div>

        {/* Data Retention & Purge Automation */}
        <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '10px' }}>
              Data Retention & Right to Erasure
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              Automatically purges or anonymizes stale communication logs and inactive outreach records to maintain strict compliance with global data localization laws.
            </p>

            <div>
              <label className="input-label">Retention Policy Threshold</label>
              <select className="select-field" value={retentionDays} onChange={(e) => setRetentionDays(parseInt(e.target.value, 10))}>
                <option value={90}>90 Days (Strict Short Retention)</option>
                <option value={180}>180 Days (Semi-Annual)</option>
                <option value={365}>365 Days (1 Year Standard)</option>
                <option value={730}>730 Days (2 Years Maximum)</option>
              </select>
            </div>
          </div>

          {hasPermission('manage_privacy') && (
            <button onClick={handlePurge} className="btn btn-secondary btn-sm" style={{ marginTop: '16px' }}>
              🧹 Enforce Retention Purge Policy
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
