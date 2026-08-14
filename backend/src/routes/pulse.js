import { discoverClinics, getDiscoveryMeta } from '../services/clinicDiscovery.js';
import {
  listPulseLeads,
  sourceAndEnrich,
  generatePitch,
  enrichDiscoveryResults,
  getServerStatus,
  getPulseSettings,
  savePulseSettings,
  getWebhookConfig,
  updateWebhookConfig,
  getAutopilotQueue,
  pushToAutopilot,
  testWebhooks,
  INDIAN_CITIES,
  MEDICAL_SPECIALTIES,
  DEFAULT_PULSE_SETTINGS,
} from '../services/pulse/engine.js';
import {
  testChannel,
  listOutreachMessages,
  listCallLogs,
  probeDatabase,
} from '../services/pulse/channelTests.js';

export function registerPulseRoutes(app) {
  app.get('/api/pulse/meta', (_req, res) => {
    const discovery = getDiscoveryMeta();
    res.json({
      cities: discovery.cities?.length ? discovery.cities : INDIAN_CITIES,
      specialties: discovery.keywords?.length
        ? discovery.keywords
        : discovery.specialties?.length
          ? discovery.specialties
          : MEDICAL_SPECIALTIES,
      products: ['REACH', 'PRIME', 'BOTH'],
      zonesByCity: discovery.zonesByCity || {},
      zoneMetaByCity: discovery.zoneMetaByCity || {},
      keywordsByCity: discovery.keywordsByCity || {},
      keywordsByCityZone: discovery.keywordsByCityZone || {},
      localitiesByCityZone: discovery.localitiesByCityZone || {},
      keywords: discovery.keywords || [],
      platforms: discovery.platforms || [],
      localityCount: discovery.localityCount || 0,
      sheetSync: discovery.sheetSync || null,
      autopilotLevels: [
        { id: 'assist', label: 'Assist — enrich + pitch, human sends' },
        { id: 'sequence', label: 'Sequence — Smartlead / HeyReach queues' },
        { id: 'full', label: 'Full — webhooks + sequences + demo holds' },
      ],
    });
  });

  app.get('/api/pulse/status', (_req, res) => {
    res.json(getServerStatus());
  });

  app.get('/api/pulse/settings', (_req, res) => {
    const settings = getPulseSettings();
    // Never echo raw secrets in list views beyond values (UI needs them to edit)
    res.json({ settings, defaults: DEFAULT_PULSE_SETTINGS });
  });

  app.put('/api/pulse/settings', (req, res) => {
    const body = req.body || {};
    const patch = body.settings || body;
    const allowed = Object.keys(DEFAULT_PULSE_SETTINGS);
    const next = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(patch, key)) {
        const val = patch[key];
        next[key] = typeof val === 'boolean' ? val : val;
      }
    }
    const settings = savePulseSettings(next);
    res.json({ settings, message: 'Pulse settings saved' });
  });

  app.get('/api/pulse/webhooks', (_req, res) => {
    res.json({ webhooks: getWebhookConfig() });
  });

  app.put('/api/pulse/webhooks', (req, res) => {
    const webhooks = updateWebhookConfig(req.body?.webhooks || req.body || {});
    res.json({ webhooks, message: 'Webhook endpoints saved' });
  });

  app.post('/api/pulse/webhooks/test', async (_req, res) => {
    try {
      const results = await testWebhooks();
      res.json({ results, message: 'Webhook test complete' });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Webhook test failed' });
    }
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

  /** Unified Lead Engine: live Practo/maps discovery + product-fit classify. */
  app.post('/api/pulse/discover', async (req, res) => {
    const body = req.body || {};
    const city = body.city || body.location;
    const {
      zone = 'All',
      zones,
      localities,
      specialty,
      keyword,
      keywords,
      limit = null,
      live = true,
      maxLocalities = 40,
      fullScan = false,
      product = 'BOTH',
    } = body;
    const kwList = Array.isArray(keywords) ? keywords.filter(Boolean) : [];
    const zoneList = Array.isArray(zones) ? zones.filter(Boolean) : [];
    const kw =
      keyword ||
      specialty ||
      kwList[0] ||
      (Array.isArray(keywords) ? keywords[0] : null);

    if (!city || (!kw && !kwList.length)) {
      return res.status(400).json({
        error: 'Select city and specialty/keyword (zone can be All; multi-select supported)',
      });
    }

    try {
      const discovery = await discoverClinics({
        city,
        zone: zoneList.length ? zoneList[0] : zone,
        zones: zoneList.length ? zoneList : undefined,
        localities,
        specialty: kw,
        keyword: kw,
        keywords: kwList.length ? kwList : undefined,
        limit,
        live,
        maxLocalities,
        fullScan: fullScan === true || fullScan === '1',
      });
      if (discovery.error && !discovery.results?.length) {
        return res.status(400).json({ error: discovery.error });
      }
      const leads = enrichDiscoveryResults(discovery.results || [], product);
      res.json({
        ...discovery,
        results: discovery.results,
        leads,
        count: leads.length,
        product,
        message: `Discovered ${leads.length} authentic clinic(s) · classified for Reach / Prime`,
      });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Discovery failed' });
    }
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

  app.get('/api/pulse/autopilot', (_req, res) => {
    const queue = getAutopilotQueue();
    const settings = getPulseSettings();
    res.json({
      level: settings.AUTOPILOT_LEVEL || 'assist',
      auto: {
        pitch: Boolean(settings.AUTOPILOT_AUTO_PITCH),
        smartlead: Boolean(settings.AUTOPILOT_AUTO_SMARTLEAD),
        heyreach: Boolean(settings.AUTOPILOT_AUTO_HEYREACH),
        demo: Boolean(settings.AUTOPILOT_AUTO_DEMO),
      },
      queue,
      jobs: queue.jobs || [],
      count: (queue.jobs || []).length,
    });
  });

  app.post('/api/pulse/autopilot/push', async (req, res) => {
    try {
      const body = req.body || {};
      const leads = body.leads || [];
      if (!Array.isArray(leads) || !leads.length) {
        return res.status(400).json({ error: 'leads array required' });
      }
      const result = await pushToAutopilot({
        leads,
        level: body.level,
        channels: body.channels || {},
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message || 'Autopilot push failed' });
    }
  });

  app.get('/api/pulse/logs/messages', (req, res) => {
    const channel = req.query.channel ? String(req.query.channel) : undefined;
    const limit = Number(req.query.limit) || 50;
    const messages = listOutreachMessages({ channel, limit });
    res.json({ messages, count: messages.length });
  });

  app.get('/api/pulse/logs/calls', (req, res) => {
    const limit = Number(req.query.limit) || 50;
    const calls = listCallLogs({ limit });
    res.json({ calls, count: calls.length });
  });

  app.post('/api/pulse/channels/test', async (req, res) => {
    try {
      const channel = req.body?.channel || req.query.channel;
      if (!channel) {
        return res.status(400).json({ error: 'channel required (whatsapp | gmail | calls)' });
      }
      const result = await testChannel(channel, req.body || {});
      if (!result.ok) return res.status(400).json(result);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message || 'Channel test failed' });
    }
  });

  app.post('/api/pulse/channels/test-all', async (_req, res) => {
    try {
      const results = {
        whatsapp: await testChannel('whatsapp'),
        gmail: await testChannel('gmail'),
        calls: await testChannel('calls'),
      };
      res.json({ results, message: 'All channel tests complete' });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Channel tests failed' });
    }
  });

  app.get('/api/pulse/db-probe', (_req, res) => {
    res.json({ database: probeDatabase(), time: new Date().toISOString() });
  });
}
