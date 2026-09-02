import React, { useState } from 'react';
import { useCrm } from '../context/CrmContext';
import ProposalSuite from '../components/ProposalSuite';

/**
 * ProposalPage — Full-page Commercial Proposal Suite
 * Accessible from: CRM lead drawer, Pipeline push-to-pilot, direct nav
 */
export default function ProposalPage() {
  const { leads } = useCrm?.() || {};
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadQuery, setLeadQuery] = useState('');

  // Filter leads for quick lookup
  const filteredLeads = (leads || []).filter((l) =>
    !leadQuery || l.name?.toLowerCase().includes(leadQuery.toLowerCase()) || l.organization?.toLowerCase().includes(leadQuery.toLowerCase())
  ).slice(0, 8);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span className="badge badge-cyan">Commercial Proposal Engine</span>
            <span className="badge badge-indigo">Prime · Reach · Video</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Proposal Suite
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Generate professional Commercial Proposals and Proforma Invoices with AI deal scoring
          </p>
        </div>
      </div>

      {/* Lead Selector */}
      <div className="glass-panel" style={{ padding: '16px' }}>
        <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
          Prepare Proposal For (Optional)
        </label>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            className="input-field"
            placeholder="Search doctor or clinic name..."
            value={leadQuery}
            onChange={(e) => setLeadQuery(e.target.value)}
            style={{ maxWidth: '320px' }}
          />
          {selectedLead && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', borderRadius: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{selectedLead.name}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{selectedLead.city}</span>
              <button onClick={() => setSelectedLead(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '14px', padding: '0 2px' }}>✕</button>
            </div>
          )}
        </div>
        {leadQuery && filteredLeads.length > 0 && !selectedLead && (
          <div style={{ marginTop: '8px', background: 'var(--bg-muted)', borderRadius: '8px', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
            {filteredLeads.map((l) => (
              <button
                key={l.id}
                onClick={() => { setSelectedLead(l); setLeadQuery(''); }}
                style={{ display: 'block', width: '100%', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <div style={{ fontSize: '13px', fontWeight: 700 }}>{l.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{l.organization} · {l.specialty} · {l.city}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Proposal Suite */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <ProposalSuite lead={selectedLead} />
      </div>
    </div>
  );
}
