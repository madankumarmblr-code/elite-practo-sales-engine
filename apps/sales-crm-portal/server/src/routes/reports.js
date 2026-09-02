import express from 'express';
import { store } from '../db/store.js';
import { rbacMiddleware, PERMISSIONS } from '../services/rbac.js';

export const reportsRouter = express.Router();

const DEFAULT_REPORTS = [
  { id: 'rep-1', name: 'Pipeline Value by Medical Specialty', metric: 'revenue', groupBy: 'specialty', chartType: 'bar', updatedAt: '2026-08-25T20:00:00Z' },
  { id: 'rep-2', name: 'Sales Rep Quota & Deal Attainment', metric: 'revenue', groupBy: 'rep', chartType: 'donut', updatedAt: '2026-08-25T18:30:00Z' },
  { id: 'rep-3', name: 'Lead Distribution & AI Score by Metro City', metric: 'lead_count', groupBy: 'city', chartType: 'bar', updatedAt: '2026-08-24T12:00:00Z' },
  { id: 'rep-4', name: 'Funnel Stage Velocity & Drop-off Analysis', metric: 'deal_count', groupBy: 'stage', chartType: 'funnel', updatedAt: '2026-08-25T15:15:00Z' },
];

reportsRouter.get(['/', '/saved'], (req, res) => {
  const custom = store.getReports() || [];
  res.json([...DEFAULT_REPORTS, ...custom]);
});

// Generate / Run dynamic report query
reportsRouter.post('/query', (req, res) => {
  const { metric = 'revenue', groupBy = 'specialty', dateRange = '30d' } = req.body;
  const leads = store.getLeads();
  const deals = store.getDeals();

  const groups = {};

  if (metric === 'revenue' || metric === 'deal_count' || metric === 'avg_deal_size') {
    deals.forEach((deal) => {
      let key = 'Unassigned';
      if (groupBy === 'rep') key = deal.assignedRep || 'Unassigned';
      else if (groupBy === 'stage') key = deal.stage || 'Unknown';
      else if (groupBy === 'specialty') {
        const lead = store.getLeadById(deal.leadId);
        key = lead ? lead.specialty : 'General';
      } else if (groupBy === 'city') {
        const lead = store.getLeadById(deal.leadId);
        key = lead ? lead.city : 'Other';
      }

      if (!groups[key]) groups[key] = { count: 0, totalValue: 0, weightedValue: 0, items: [] };
      groups[key].count += 1;
      groups[key].totalValue += deal.value || 0;
      groups[key].weightedValue += Math.round(((deal.value || 0) * (deal.probability || 0)) / 100);
      groups[key].items.push(deal);
    });
  } else {
    // Lead metric (count, avg_score, patient_volume)
    leads.forEach((lead) => {
      let key = 'Other';
      if (groupBy === 'specialty') key = lead.specialty || 'General';
      else if (groupBy === 'city') key = lead.city || 'Metro';
      else if (groupBy === 'rep') key = lead.assignedRep || 'Unassigned';
      else if (groupBy === 'stage' || groupBy === 'status') key = lead.status || lead.stage || 'New Lead';

      if (!groups[key]) groups[key] = { count: 0, totalScore: 0, totalVolume: 0, items: [] };
      groups[key].count += 1;
      groups[key].totalScore += lead.score || 0;
      groups[key].totalVolume += lead.patientVolumeMonthly || 0;
      groups[key].items.push(lead);
    });
  }

  const results = Object.entries(groups).map(([label, data]) => ({
    label,
    count: data.count,
    totalValue: data.totalValue || 0,
    weightedValue: data.weightedValue || 0,
    avgValue: data.count > 0 ? Math.round((data.totalValue || 0) / data.count) : 0,
    avgScore: data.count > 0 ? Math.round((data.totalScore || 0) / data.count) : 0,
    totalVolume: data.totalVolume || 0,
  }));

  res.json({
    parameters: { metric, groupBy, dateRange },
    generatedAt: new Date().toISOString(),
    totalGroups: results.length,
    results,
  });
});

// Save custom report configuration
reportsRouter.post('/saved', rbacMiddleware(PERMISSIONS.CUSTOM_REPORTS), (req, res) => {
  const { name, metric, groupBy, chartType } = req.body;
  if (!name) return res.status(400).json({ error: 'Report name is required' });

  const newReport = {
    id: `rep-${Date.now()}`,
    name,
    metric: metric || 'revenue',
    groupBy: groupBy || 'specialty',
    chartType: chartType || 'bar',
    createdBy: req.headers['x-user-name'] || 'User',
    updatedAt: new Date().toISOString(),
  };

  store.createReport(newReport);
  store.logAudit({
    action: 'CUSTOM_REPORT_CREATED',
    entity: `Created custom report: "${newReport.name}"`,
    user: req.headers['x-user-name'] || 'User',
    ip: req.ip || '127.0.0.1',
    category: 'REPORTS',
  });

  res.status(201).json(newReport);
});
