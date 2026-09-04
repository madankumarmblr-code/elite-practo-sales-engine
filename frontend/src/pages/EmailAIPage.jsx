import React, { useState, useEffect } from 'react';
import { api } from '../api/client.js';

export default function EmailAIPage() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'proposals' | 'settings'
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null); // For review modal
  const [reviewMessage, setReviewMessage] = useState(null);

  useEffect(() => {
    setLoading(true);
    api.listCommercialProposals()
      .then((res) => {
        const raw = Array.isArray(res) ? res : (res?.proposals || []);
        const formatted = raw.map((p) => ({
          id: p.id,
          doctorName: p.client_name || p.doctorName || 'Doctor',
          clinicName: p.clinic_name || p.clinicName || 'Clinic',
          email: p.email || 'contact@clinic.in',
          locality: `${p.city || 'Bangalore'}`,
          product: p.reach_campaigns && p.reach_campaigns !== '[]' ? 'reach' : 'prime',
          productLabel: p.reach_campaigns && p.reach_campaigns !== '[]' ? 'Practo Reach Spotlight' : 'Practo Prime Activation',
          tenure: `${p.term_months || 3} Months`,
          netAmount: `₹ ${(Number(p.net_amount) || 0).toLocaleString('en-IN')}`,
          status: p.status || 'pending_approval',
          statusLabel: p.status === 'dispatched' ? 'Dispatched to Doctor' : (p.status === 'accepted' ? 'Accepted' : 'Pending Human Approval'),
          createdAt: p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Recent',
          subject: `Commercial Proposal: Practo Onboarding for ${p.clinic_name || 'Clinic'}`,
          body: `Dear Dr. ${p.client_name || 'Doctor'},\n\nWe are pleased to present the commercial onboarding proposal for ${p.clinic_name || 'your clinic'}.\n\nTotal Payable: ₹ ${(Number(p.net_amount) || 0).toLocaleString('en-IN')}\n\nWarm regards,\nPracto Enterprise Team`,
        }));
        setProposals(formatted);
      })
      .catch(() => setProposals([]))
      .finally(() => setLoading(false));
  }, []);

  // Email AI Settings (Enterprise settings — no raw API keys shown)
  const [settings, setSettings] = useState({
    senderDisplayName: 'Practo Healthcare Partnerships <proposals@practo.com>',
    replyToEmail: 'sales.support@practo.com',
    requireHumanApproval: true,
    defaultTenure: '6 Months',
    autoAttachProformaPdf: true,
    emailSignature: 'Enterprise Sales Team\nPracto Technologies India Pvt Ltd\nBangalore, India\nsupport@practo.com | +91 8071579481',
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  function handleApprove(p) {
    setProposals(
      proposals.map((item) =>
        item.id === p.id ? { ...item, status: 'dispatched', statusLabel: 'Approved & Dispatched' } : item
      )
    );
    setReviewMessage(`Proposal for ${p.doctorName} approved and dispatched!`);
    setSelectedProposal(null);
    setTimeout(() => setReviewMessage(null), 4000);
  }

  function handleSaveSettings(e) {
    e.preventDefault();
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  }

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 26 }}>✉️</span>
            <div>
              <h1 className="page-title">Email AI Studio & Proposal Dispatch</h1>
              <p className="text-sm text-secondary mt-1">
                Autonomous proposal generation, human approval workflows, and commercial proforma delivery.
              </p>
            </div>
          </div>
        </div>

        {/* Clean Gateway Indicator — No raw API keys shown */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            padding: '8px 16px',
            borderRadius: 10,
          }}
        >
          <span style={{ fontSize: 10, color: '#10B981', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }} />
            Enterprise Proposal SMTP: Active
          </span>
          <span style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>
            proposals@practo.com
          </span>
        </div>
      </div>

      {reviewMessage && (
        <div className="alert alert-success mb-4">
          ✅ {reviewMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          ['dashboard', '📊 Email AI Dashboard'],
          ['proposals', `📑 Proposal Queue & Review (${proposals.length})`],
          ['settings', '⚙️ Email AI Settings & Signature'],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`btn ${activeTab === key ? 'btn-primary' : 'btn-ghost'} btn-sm`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 1: EMAIL AI DASHBOARD */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div>
          <div className="grid-4 mb-6">
            <div className="card" style={{ padding: 18 }}>
              <div className="text-xs text-muted font-bold uppercase">Proposals Drafted</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', marginTop: 4 }}>348</div>
              <div className="text-xs text-green mt-1">Autonomous AI generation</div>
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div className="text-xs text-muted font-bold uppercase">Human Approved</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#10B981', marginTop: 4 }}>312</div>
              <div className="text-xs text-secondary mt-1">89.6% approval rate</div>
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div className="text-xs text-muted font-bold uppercase">Doctor Open Rate</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#1456FD', marginTop: 4 }}>71.2%</div>
              <div className="text-xs text-secondary mt-1">Avg 2.4 views per doctor</div>
            </div>

            <div className="card" style={{ padding: 18 }}>
              <div className="text-xs text-muted font-bold uppercase">Accepted Deals</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#7C3AED', marginTop: 4 }}>84</div>
              <div className="text-xs text-purple mt-1">₹ 68.4L booked revenue</div>
            </div>
          </div>

          <div className="grid-2 mb-6">
            <div className="card">
              <h3 className="section-title mb-3">Proposal Distribution by Product</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Practo Prime Onboarding Packages</span>
                    <span className="text-blue">215 Proposals (61.8%)</span>
                  </div>
                  <div style={{ height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '61.8%', height: '100%', background: '#1456FD', borderRadius: 4 }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Practo Reach Spotlight Slot Campaigns</span>
                    <span className="text-teal">133 Proposals (38.2%)</span>
                  </div>
                  <div style={{ height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: '38.2%', height: '100%', background: '#0D9488', borderRadius: 4 }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="section-title mb-3">Average Commercial Deal Value</h3>
              <div className="flex justify-between items-center" style={{ gap: 12 }}>
                <div style={{ flex: 1, background: '#EFF6FF', padding: 16, borderRadius: 8, textAlign: 'center' }}>
                  <div className="text-xs text-secondary font-bold uppercase">Avg Prime Deal</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#1456FD', marginTop: 4 }}>₹ 48,200</div>
                  <div className="text-xs text-muted mt-1">6 Months Avg Tenure</div>
                </div>

                <div style={{ flex: 1, background: '#F0FDF4', padding: 16, borderRadius: 8, textAlign: 'center' }}>
                  <div className="text-xs text-secondary font-bold uppercase">Avg Reach Deal</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#0D9488', marginTop: 4 }}>₹ 1,18,500</div>
                  <div className="text-xs text-muted mt-1">Spotlight Position 1 & 6</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 2: PROPOSAL QUEUE & REVIEW */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'proposals' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="flex justify-between items-center" style={{ padding: '16px 20px', borderBottom: '1px solid #E2E8F0', background: '#FAFAFC' }}>
            <h3 className="section-title">Commercial Proposals & Dispatch Status</h3>
            <span className="text-xs text-secondary">{proposals.length} active proposals in workflow</span>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Doctor & Clinic</th>
                  <th>Product & Tenure</th>
                  <th>Net Payable</th>
                  <th>Status</th>
                  <th>Generated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 13.5 }}>{p.doctorName}</div>
                      <div className="text-xs text-secondary mt-0.5">{p.clinicName}</div>
                      <div className="text-xs text-muted mt-0.5">✉️ {p.email} · {p.locality}</div>
                    </td>

                    <td>
                      <div className="font-bold text-xs" style={{ color: '#0F172A' }}>{p.productLabel}</div>
                      <div className="text-xs text-muted">Tenure: {p.tenure}</div>
                    </td>

                    <td>
                      <div className="font-bold text-sm" style={{ color: '#0F172A' }}>{p.netAmount}</div>
                      <div className="text-xs text-muted">Incl. 18% GST</div>
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          p.status === 'accepted'
                            ? 'badge-green'
                            : p.status === 'dispatched'
                              ? 'badge-blue'
                              : 'badge-yellow'
                        }`}
                      >
                        {p.statusLabel}
                      </span>
                    </td>

                    <td>
                      <div className="text-xs text-secondary">{p.createdAt}</div>
                    </td>

                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: 11, padding: '4px 8px' }}
                          onClick={() => setSelectedProposal(p)}
                        >
                          👁️ Review & Email
                        </button>
                        {p.status === 'pending_approval' && (
                          <button
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: 11, padding: '4px 8px' }}
                            onClick={() => handleApprove(p)}
                          >
                            ✓ Approve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────── */}
      {/* TAB 3: EMAIL AI SETTINGS (NO API DETAILS EXPOSED) */}
      {/* ────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="card" style={{ maxWidth: 780 }}>
          <h2 className="section-title mb-1">Email AI Engine & Proposal Settings</h2>
          <p className="text-xs text-secondary mb-4">
            Configure automated proposal dispatch rules, mandatory approval policies, and email branding.
          </p>

          {settingsSaved && (
            <div className="alert alert-success mb-4">
              ✅ Email AI settings updated successfully!
            </div>
          )}

          <form onSubmit={handleSaveSettings}>
            <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>
              <div>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                  Sender Display Name & Email
                </label>
                <input
                  className="input"
                  value={settings.senderDisplayName}
                  onChange={(e) => setSettings({ ...settings, senderDisplayName: e.target.value })}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                  Reply-To Email Address
                </label>
                <input
                  className="input"
                  value={settings.replyToEmail}
                  onChange={(e) => setSettings({ ...settings, replyToEmail: e.target.value })}
                />
              </div>
            </div>

            <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 10, marginBottom: 16, border: '1px solid #E2E8F0' }}>
              <div className="text-xs font-bold text-secondary uppercase mb-2">Quality & Compliance Controls</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.requireHumanApproval}
                    onChange={(e) => setSettings({ ...settings, requireHumanApproval: e.target.checked })}
                  />
                  <span className="text-xs font-medium text-secondary">
                    Require sales manager or representative approval before dispatching commercial proposals
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.autoAttachProformaPdf}
                    onChange={(e) => setSettings({ ...settings, autoAttachProformaPdf: e.target.checked })}
                  />
                  <span className="text-xs font-medium text-secondary">
                    Automatically generate and attach GST-compliant proforma invoice PDF to email
                  </span>
                </label>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                Default Proposal Campaign Tenure
              </label>
              <select
                className="input"
                value={settings.defaultTenure}
                onChange={(e) => setSettings({ ...settings, defaultTenure: e.target.value })}
              >
                <option value="3 Months">3 Months Starter Plan</option>
                <option value="6 Months">6 Months Recommended Growth Pack</option>
                <option value="12 Months">12 Months Annual Leadership Package</option>
              </select>
            </div>

            <div style={{ marginBottom: 18 }}>
              <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                Official Sales Email Signature
              </label>
              <textarea
                className="input"
                rows={4}
                value={settings.emailSignature}
                onChange={(e) => setSettings({ ...settings, emailSignature: e.target.value })}
              />
            </div>

            <button type="submit" className="btn btn-primary">
              💾 Save Email AI Settings
            </button>
          </form>
        </div>
      )}

      {/* Review & Approve Modal */}
      {selectedProposal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedProposal(null)}>
          <div className="modal fade-in" style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <div>
                <h3 className="section-title">Commercial Proposal Review</h3>
                <p className="text-xs text-secondary mt-0.5">
                  {selectedProposal.doctorName} · {selectedProposal.clinicName} · {selectedProposal.netAmount}
                </p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedProposal(null)}>✕</button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                Email Subject
              </label>
              <input className="input" defaultValue={selectedProposal.subject} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label className="text-xs font-bold text-secondary mb-1" style={{ display: 'block', textTransform: 'uppercase' }}>
                Email Body
              </label>
              <textarea
                className="input"
                rows={12}
                defaultValue={selectedProposal.body}
                style={{ fontSize: 13, lineHeight: 1.5, fontFamily: 'monospace' }}
              />
            </div>

            <div className="flex justify-between items-center pt-3" style={{ borderTop: '1px solid #E2E8F0' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedProposal(null)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => handleApprove(selectedProposal)}>
                ✓ Approve & Dispatch to {selectedProposal.email}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
