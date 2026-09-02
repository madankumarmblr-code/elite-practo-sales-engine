import express from 'express';
import { store } from '../db/store.js';
import { checkPermission, PERMISSIONS, rbacMiddleware } from '../services/rbac.js';

export const pipelineRouter = express.Router();

const STAGES = [
  { id: 'New Lead', name: 'New Lead', probability: 20, color: '#94A3B8' },
  { id: 'Contacted', name: 'Contacted', probability: 35, color: '#38BDF8' },
  { id: 'Qualified', name: 'Qualified', probability: 50, color: '#818CF8' },
  { id: 'Demo Scheduled', name: 'Demo Scheduled', probability: 65, color: '#FBBF24' },
  { id: 'Proposal Sent', name: 'Proposal Sent', probability: 75, color: '#FB923C' },
  { id: 'Negotiation', name: 'Negotiation', probability: 85, color: '#A855F7' },
  { id: 'Closed Won', name: 'Closed Won', probability: 100, color: '#34D399' },
  { id: 'Closed Lost', name: 'Closed Lost', probability: 0, color: '#F87171' },
];

pipelineRouter.get('/stages', (req, res) => {
  const deals = store.getDeals();
  const stagesWithDeals = STAGES.map((stg) => {
    const stageDeals = deals.filter((d) => d.stage === stg.id);
    const totalValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const weightedValue = Math.round((totalValue * stg.probability) / 100);
    return {
      ...stg,
      deals: stageDeals,
      dealCount: stageDeals.length,
      totalValue,
      weightedValue,
    };
  });

  const totalPipeline = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const totalWeighted = STAGES.reduce((sum, stg) => {
    const stageDeals = deals.filter((d) => d.stage === stg.id);
    const val = stageDeals.reduce((s, d) => s + (d.value || 0), 0);
    return sum + Math.round((val * stg.probability) / 100);
  }, 0);

  res.json({
    stages: stagesWithDeals,
    totalDeals: deals.length,
    totalPipelineValue: totalPipeline,
    totalWeightedValue: totalWeighted,
  });
});

pipelineRouter.get(['/', '/deals'], (req, res) => {
  const deals = store.getDeals();
  res.json({ total: deals.length, deals });
});

pipelineRouter.post('/deals', rbacMiddleware(PERMISSIONS.EDIT_PIPELINE), (req, res) => {
  const { title, leadId, value, stage, assignedRep, products, notes } = req.body;
  if (!title || !value) {
    return res.status(400).json({ error: 'Title and Value are required' });
  }

  const lead = store.getLeadById(leadId);
  const targetStage = stage || 'New Lead';
  const stageMeta = STAGES.find((s) => s.id === targetStage) || STAGES[0];

  const newDeal = {
    id: `deal-${Date.now()}`,
    title,
    leadId: leadId || null,
    leadName: lead ? lead.name : req.body.leadName || 'Direct Inquiry',
    organization: lead ? lead.organization : req.body.organization || 'Independent Clinic',
    value: parseFloat(value),
    mrr: Math.round(parseFloat(value) / 12),
    stage: targetStage,
    probability: stageMeta.probability,
    assignedRep: assignedRep || 'Priya Sharma',
    expectedCloseDate: req.body.expectedCloseDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    products: products || ['Healthcare Automation Core'],
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  store.createDeal(newDeal);
  store.logAudit({
    action: 'DEAL_CREATED',
    entity: `Created Deal: ${newDeal.title} ($${newDeal.value}) in stage ${newDeal.stage}`,
    user: req.headers['x-user-name'] || 'User',
    ip: req.ip || '127.0.0.1',
    category: 'PIPELINE',
  });

  res.status(201).json(newDeal);
});

pipelineRouter.patch('/deals/:id/stage', rbacMiddleware(PERMISSIONS.EDIT_PIPELINE), (req, res) => {
  const { stage } = req.body;
  const deal = store.getDealById(req.params.id);
  if (!deal) return res.status(404).json({ error: 'Deal not found' });

  const stageMeta = STAGES.find((s) => s.id === stage);
  const oldStage = deal.stage;
  const updated = store.updateDeal(req.params.id, {
    stage,
    probability: stageMeta ? stageMeta.probability : deal.probability,
  });

  // Also update corresponding lead stage if linked
  if (deal.leadId) {
    store.updateLead(deal.leadId, { stage, status: stage });
  }

  store.logAudit({
    action: stage === 'Closed Won' ? 'DEAL_WON' : 'STAGE_MOVED',
    entity: `Deal "${deal.title}" moved: ${oldStage} -> ${stage} ($${deal.value})`,
    user: req.headers['x-user-name'] || 'User',
    ip: req.ip || '127.0.0.1',
    category: 'PIPELINE',
  });

  res.json({ message: 'Deal stage updated', deal: updated });
});
