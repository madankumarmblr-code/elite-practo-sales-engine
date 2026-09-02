import express from 'express';
import { store } from '../db/store.js';

export const dashboardRouter = express.Router();

dashboardRouter.get('/summary', (req, res) => {
  const leads = store.getLeads();
  const deals = store.getDeals();
  const workflows = store.data.workflows || [];

  // Key Metrics
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter((l) => ['Qualified', 'Proposal Sent', 'Negotiation', 'Closed Won'].includes(l.stage)).length;
  const totalPipelineValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const weightedPipelineValue = deals.reduce((sum, d) => sum + Math.round(((d.value || 0) * (d.probability || 0)) / 100), 0);
  const closedWonDeals = deals.filter((d) => d.stage === 'Closed Won');
  const totalClosedWonValue = closedWonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const winRate = deals.length > 0 ? Math.round((closedWonDeals.length / deals.length) * 100) : 0;
  const activeSequencesCount = workflows.filter((w) => w.status === 'Active').length;

  // Pipeline by Stage
  const stages = ['New Lead', 'Contacted', 'Qualified', 'Demo Scheduled', 'Proposal Sent', 'Negotiation', 'Closed Won'];
  const stageBreakdown = stages.map((stage) => {
    const stageDeals = deals.filter((d) => d.stage === stage);
    const count = stageDeals.length;
    const value = stageDeals.reduce((acc, d) => acc + (d.value || 0), 0);
    return { stage, count, value };
  });

  // Leads by Specialty
  const specialtyMap = {};
  leads.forEach((l) => {
    const spec = l.specialty || 'Other';
    specialtyMap[spec] = (specialtyMap[spec] || 0) + 1;
  });
  const leadsBySpecialty = Object.entries(specialtyMap).map(([specialty, count]) => ({ specialty, count }));

  // Leads by City
  const cityMap = {};
  leads.forEach((l) => {
    const c = l.city || 'Other';
    cityMap[c] = (cityMap[c] || 0) + 1;
  });
  const leadsByCity = Object.entries(cityMap).map(([city, count]) => ({ city, count }));

  // Monthly Revenue Forecast Projection
  const revenueForecast = [
    { month: 'Apr', projected: 45000, actual: 48500 },
    { month: 'May', projected: 52000, actual: 54200 },
    { month: 'Jun', projected: 61000, actual: 63800 },
    { month: 'Jul', projected: 74000, actual: 72100 },
    { month: 'Aug', projected: 89000, actual: 96500 },
    { month: 'Sep (Est)', projected: 115000, actual: null },
    { month: 'Oct (Est)', projected: 142000, actual: null },
  ];

  // Multi-Channel Outreach Metrics
  const outreachChannels = [
    { channel: 'WhatsApp Cloud API', sent: 1420, delivered: '98.8%', responseRate: '38.4%', dealsGenerated: 14 },
    { channel: 'AI Voice Dialer (SDR)', sent: 890, delivered: '92.1%', responseRate: '42.5%', dealsGenerated: 19 },
    { channel: 'Cold Email Sequences', sent: 3450, delivered: '99.1%', responseRate: '24.1%', dealsGenerated: 11 },
    { channel: 'Practo Pro Inbound', sent: 620, delivered: '100%', responseRate: '68.0%', dealsGenerated: 22 },
  ];

  res.json({
    metrics: {
      totalLeads,
      qualifiedLeads,
      totalPipelineValue,
      weightedPipelineValue,
      totalClosedWonValue,
      winRate: `${winRate}%`,
      avgDealSize: deals.length > 0 ? Math.round(totalPipelineValue / deals.length) : 0,
      activeSequencesCount,
      aiPilotAccuracy: '94.6%',
    },
    stageBreakdown,
    leadsBySpecialty,
    leadsByCity,
    revenueForecast,
    outreachChannels,
    recentActivities: store.getAuditLogs(10),
  });
});
