import React, { useState, useEffect } from 'react';
import { useCrm } from '../context/CrmContext';
import { api } from '../services/api';

export function PitchGeneratorModal({ lead, onClose }) {
  const { addToast, setVoiceDialerLead } = useCrm();
  const [activeTab, setActiveTab] = useState('whatsapp'); // whatsapp, cold_call, email, objections
  const [pitchData, setPitchData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchPitch() {
      try {
        setLoading(true);
        const data = await api.generatePitch(lead?.id);
        setPitchData(data);
      } catch (err) {
        addToast(err.message || 'Error generating pitch', 'error');
      } finally {
        setLoading(false);
      }
    }
    if (lead) fetchPitch();
  }, [lead, addToast]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    addToast('Copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLaunchCampaign = async (channel) => {
    try {
      await api.launchPitchCampaign({ leadIds: [lead.id], channels: [channel] });
      addToast(`Dispatched ${channel.toUpperCase()} pitch directly to ${lead.name}`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to dispatch pitch', 'error');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 90,
        padding: '20px',
      }}
    >
      <div
        className="glass-panel animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '750px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-card-solid)',
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '18px 24px',
            background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="badge badge-cyan" style={{ fontSize: '10px' }}>AI Pitch Studio</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Practo-to-Sales Automation</span>
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
              {lead?.name} — {lead?.organization}
            </h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '16px' }}>
            ✕
          </button>
        </div>

        {/* AI Financial Leakage Summary Card */}
        {pitchData?.analysis && (
          <div
            style={{
              padding: '12px 24px',
              background: 'rgba(99, 102, 241, 0.08)',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
            }}
          >
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Est. Monthly No-Shows
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-amber)' }}>
                ~{pitchData.analysis.monthlyNoShows} appointments
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                Annual Revenue Loss
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-rose)' }}>
                ₹{(pitchData.analysis.annualRevenueLoss / 100000).toFixed(1)} Lakhs / yr
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                AI Fit Score
              </div>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                {pitchData.analysis.fitScore}/100
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                setVoiceDialerLead(lead);
              }}
              className="btn btn-emerald btn-sm"
            >
              🎙️ AI Voice Call
            </button>
          </div>
        )}

        {/* Navigation Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', padding: '0 24px', background: 'var(--bg-input)' }}>
          {[
            { id: 'whatsapp', label: '📱 WhatsApp Pitch' },
            { id: 'cold_call', label: '📞 30s Cold Call Script' },
            { id: 'email', label: '✉️ Executive ROI Email' },
            { id: 'objections', label: '🛡️ Objection Matrix' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: activeTab === tab.id ? 700 : 500,
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
              Generating hyper-personalized Practo sales pitch...
            </div>
          ) : (
            <div>
              {activeTab === 'whatsapp' && (
                <div>
                  <div
                    style={{
                      background: 'rgba(16, 185, 129, 0.08)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '13.5px',
                      whiteSpace: 'pre-wrap',
                      color: 'var(--text-primary)',
                      lineHeight: 1.6,
                    }}
                  >
                    {pitchData?.whatsappPitch}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <button onClick={() => copyToClipboard(pitchData?.whatsappPitch)} className="btn btn-secondary btn-sm">
                      📋 {copied ? 'Copied!' : 'Copy Script'}
                    </button>
                    <button onClick={() => handleLaunchCampaign('whatsapp')} className="btn btn-emerald btn-sm">
                      🚀 Dispatch via WhatsApp API
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'cold_call' && (
                <div>
                  <div
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      fontSize: '13.5px',
                      whiteSpace: 'pre-wrap',
                      color: 'var(--text-primary)',
                      lineHeight: 1.6,
                    }}
                  >
                    {pitchData?.coldCallScript}
                  </div>
                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                    <button onClick={() => copyToClipboard(pitchData?.coldCallScript)} className="btn btn-secondary btn-sm">
                      📋 Copy Telephony Script
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'email' && (
                <div>
                  <div style={{ marginBottom: '12px' }}>
                    <label className="input-label">Subject Line</label>
                    <input
                      readOnly
                      className="input-field"
                      value={pitchData?.emailPitch?.subject || ''}
                      style={{ fontWeight: 600 }}
                    />
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <label className="input-label">Email Body</label>
                    <textarea
                      readOnly
                      rows={9}
                      className="textarea-field"
                      value={pitchData?.emailPitch?.body || ''}
                      style={{ lineHeight: 1.6 }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => copyToClipboard(pitchData?.emailPitch?.body)} className="btn btn-secondary btn-sm">
                      📋 Copy Email
                    </button>
                    <button onClick={() => handleLaunchCampaign('email')} className="btn btn-primary btn-sm">
                      📧 Send via SMTP Sequence
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'objections' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {pitchData?.objections?.map((obj, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '14px',
                        background: 'var(--bg-input)',
                        borderRadius: 'var(--radius-md)',
                        borderLeft: '4px solid var(--accent-amber)',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: 'var(--accent-amber)', fontSize: '13px', marginBottom: '6px' }}>
                        {obj.objection}
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                        <strong>Rebuttal:</strong> {obj.rebuttal}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
