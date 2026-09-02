import React, { useState, useEffect } from 'react';
import { useCrm } from '../context/CrmContext';
import { api } from '../services/api';

export default function Pipeline() {
  const { setSelectedLeadId, addToast, hasPermission } = useCrm();
  const [stages, setStages] = useState([]);
  const [totalPipelineValue, setTotalPipelineValue] = useState(0);
  const [totalWeightedValue, setTotalWeightedValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAddDealOpen, setIsAddDealOpen] = useState(false);
  const [newDealForm, setNewDealForm] = useState({
    title: '',
    value: 12000,
    stage: 'New Lead',
    assignedRep: 'Priya Sharma',
    notes: '',
  });

  const loadPipeline = async () => {
    try {
      setLoading(true);
      const data = await api.getPipelineStages();
      setStages(data.stages || []);
      setTotalPipelineValue(data.totalPipelineValue || 0);
      setTotalWeightedValue(data.totalWeightedValue || 0);
    } catch (err) {
      addToast(err.message || 'Failed to load pipeline', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPipeline();
  }, []);

  const handleMoveStage = async (dealId, nextStage) => {
    try {
      await api.updateDealStage(dealId, nextStage);
      addToast(`Deal shifted to stage "${nextStage}"`, 'success');
      loadPipeline();
    } catch (err) {
      addToast(err.message || 'Failed to update stage', 'error');
    }
  };

  const handleCreateDeal = async (e) => {
    e.preventDefault();
    if (!newDealForm.title) return;
    try {
      await api.createDeal(newDealForm);
      addToast('New deal created in pipeline', 'success');
      setIsAddDealOpen(false);
      setNewDealForm({ title: '', value: 12000, stage: 'New Lead', assignedRep: 'Priya Sharma', notes: '' });
      loadPipeline();
    } catch (err) {
      addToast(err.message || 'Failed to create deal', 'error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="badge badge-cyan">Visual Kanban</span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Interactive Deal Funnel</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>
            Sales Opportunities & Deal Velocity
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Pipeline Value / Weighted
            </div>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--accent-cyan)' }}>
              ₹{totalPipelineValue.toLocaleString()} <span style={{ color: 'var(--accent-emerald)', fontSize: '13px' }}>(₹{totalWeightedValue.toLocaleString()})</span>
            </div>
          </div>

          <button onClick={() => setIsAddDealOpen(true)} className="btn btn-primary btn-sm">
            + New Deal
          </button>
        </div>
      </div>

      {/* Kanban Stages Grid */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading Kanban stage board...
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            gap: '14px',
            overflowX: 'auto',
            paddingBottom: '20px',
            minHeight: '620px',
          }}
        >
          {stages.map((stage) => (
            <div
              key={stage.id}
              style={{
                width: '300px',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(15, 23, 42, 0.4)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                padding: '12px',
              }}
            >
              {/* Column Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', padding: '0 4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: stage.color || '#6366F1' }} />
                  <span style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {stage.name}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: '10px',
                      background: 'var(--bg-input)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {stage.dealCount}
                  </span>
                </div>
                <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                  ₹{(stage.totalValue || 0).toLocaleString()}
                </span>
              </div>

              {/* Deal Cards */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
                {stage.deals && stage.deals.length > 0 ? (
                  stage.deals.map((deal) => (
                    <div
                      key={deal.id}
                      className="glass-panel glass-panel-hover"
                      style={{
                        padding: '14px',
                        background: 'var(--bg-card-solid)',
                        cursor: 'grab',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                      onClick={() => deal.leadId && setSelectedLeadId(deal.leadId)}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <h4 style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                          {deal.title}
                        </h4>
                        <span className="badge badge-emerald" style={{ fontSize: '10.5px' }}>
                          ₹{(deal.value || 0).toLocaleString()}
                        </span>
                      </div>

                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                        {deal.organization} {deal.city ? `(${deal.city})` : ''} • <span style={{ color: 'var(--accent-cyan)' }}>{deal.leadName}</span>
                      </div>

                      {/* Products / Tags */}
                      {deal.products && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {deal.products.map((p, idx) => (
                            <span key={idx} className="badge badge-indigo" style={{ fontSize: '9.5px', padding: '1px 6px' }}>
                              {p}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Card Footer: Rep & Stage Actions */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginTop: '4px',
                          paddingTop: '8px',
                          borderTop: '1px solid var(--border-subtle)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          👤 {deal.assignedRep}
                        </span>

                        {/* Quick Move Select */}
                        <select
                          className="select-field"
                          value={deal.stage}
                          onChange={(e) => handleMoveStage(deal.id, e.target.value)}
                          style={{
                            width: 'auto',
                            padding: '2px 6px',
                            fontSize: '10.5px',
                            height: '24px',
                            background: 'var(--bg-input)',
                          }}
                        >
                          {stages.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      height: '100px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px dashed var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-muted)',
                      fontSize: '12px',
                    }}
                  >
                    No deals in this stage
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Deal Modal */}
      {isAddDealOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 95,
            padding: '20px',
          }}
          onClick={() => setIsAddDealOpen(false)}
        >
          <div
            className="glass-panel animate-fade-in"
            style={{
              width: '100%',
              maxWidth: '460px',
              background: 'var(--bg-card-solid)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800 }}>Create New Deal</h3>
              <button onClick={() => setIsAddDealOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateDeal} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label className="input-label">Deal Title *</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="e.g. Apollo Dental Automation Expansion"
                  value={newDealForm.title}
                  onChange={(e) => setNewDealForm({ ...newDealForm, title: e.target.value })}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label className="input-label">Deal Value ($) *</label>
                  <input
                    type="number"
                    required
                    className="input-field"
                    value={newDealForm.value}
                    onChange={(e) => setNewDealForm({ ...newDealForm, value: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div>
                  <label className="input-label">Pipeline Stage</label>
                  <select
                    className="select-field"
                    value={newDealForm.stage}
                    onChange={(e) => setNewDealForm({ ...newDealForm, stage: e.target.value })}
                  >
                    {stages.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">Assigned Representative</label>
                <select
                  className="select-field"
                  value={newDealForm.assignedRep}
                  onChange={(e) => setNewDealForm({ ...newDealForm, assignedRep: e.target.value })}
                >
                  <option value="Priya Sharma">Priya Sharma</option>
                  <option value="Rahul Kapoor">Rahul Kapoor</option>
                  <option value="Ananya Roy">Ananya Roy</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsAddDealOpen(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Create Deal</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
