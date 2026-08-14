import {
  listPulseLeads,
  sourceAndEnrich,
  generatePitch,
  INDIAN_CITIES,
  MEDICAL_SPECIALTIES,
} from '../services/pulse/engine.js';

export function registerPulseRoutes(app) {
  app.get('/api/pulse/meta', (_req, res) => {
    res.json({
      cities: INDIAN_CITIES,
      specialties: MEDICAL_SPECIALTIES,
      products: ['REACH', 'PRIME', 'BOTH'],
    });
  });

  app.get('/api/pulse/leads', (_req, res) => {
    const leads = listPulseLeads();
    res.json({ leads, count: leads.length });
  });

  app.post('/api/pulse/source', (req, res) => {
    const body = req.body || {};
    if (!body.city) return res.status(400).json({ error: 'city is required' });
    const result = sourceAndEnrich({
      city: body.city,
      locality: body.locality || '',
      specialties: body.specialties || [],
    });
    res.json(result);
  });

  app.post('/api/pulse/pitch', (req, res) => {
    const lead = req.body?.lead;
    if (!lead?.id) return res.status(400).json({ error: 'lead is required' });
    res.json(generatePitch(lead, req.body?.channel || 'whatsapp'));
  });

  app.post('/api/pulse/smartlead', (req, res) => {
    const leads = req.body?.leads || [];
    const product = req.body?.product === 'REACH' ? 'REACH' : 'PRIME';
    res.json({
      campaignId: `sl_${product.toLowerCase()}_${Date.now()}`,
      queued: leads.length,
      message: `Simulated Smartlead ${product} sequence for ${leads.length} lead(s)`,
    });
  });

  app.post('/api/pulse/heyreach', (req, res) => {
    const leads = req.body?.leads || [];
    res.json({
      campaignId: `hr_${Date.now()}`,
      queued: leads.length,
      message: `Simulated HeyReach LinkedIn campaign for ${leads.length} decision-maker(s)`,
    });
  });

  app.post('/api/pulse/demo', (req, res) => {
    const title = req.body?.title || 'Practo demo';
    const startIso = req.body?.startIso || new Date(Date.now() + 86400000).toISOString();
    res.json({
      eventId: `gcal_${Date.now()}`,
      htmlLink: 'https://calendar.google.com/',
      message: `Simulated GCal hold: ${title} @ ${startIso}`,
      status: 'DEMO_SCHEDULED',
    });
  });

  app.post('/api/pulse/fireflies', (req, res) => {
    const leadId = req.body?.leadId || 'unknown';
    res.json({
      summary: `Simulated Fireflies summary for ${leadId}: prospect interested in ROI on missed calls; asked for locality inventory.`,
      actionItems: [
        'Send Commercial Proposal Suite 1-pager',
        'Confirm decision-maker availability',
        'Schedule follow-up demo',
      ],
      message: 'Fireflies summary attached',
    });
  });
}
