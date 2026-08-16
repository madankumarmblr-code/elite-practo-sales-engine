import { discoverClinics, getDiscoveryMeta } from '../services/clinicDiscovery.js';
import {
  listPulseLeads,
  sourceAndEnrich,
  generatePitch,
  enrichDiscoveryResults,
  getServerStatus,
  pingAllServicesAndApis,
  getPulseSettings,

  savePulseSettings,
  getWebhookConfig,
  updateWebhookConfig,
  getAutopilotQueue,
  pushToAutopilot,
  testWebhooks,
  validateLeads,
  listNotifications,
  markNotificationsRead,
  listCrmLeads,
  updateLeadStage,
  addLeadNote,
  exportMasterLeads,
  INDIAN_CITIES,
  MEDICAL_SPECIALTIES,
  DEFAULT_PULSE_SETTINGS,
} from '../services/pulse/engine.js';
import {
  testChannel,
  dialAiCall,
  sendWhatsAppMessage,
  sendEmailMessage,
  testSuperAdminSelf,
  listOutreachMessages,
  listCallLogs,
  probeDatabase,
  VOICE_PRESETS,
  SCRIPT_PRESETS,
  WHATSAPP_TEMPLATES,
  EMAIL_DRIP_STEPS,
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
        { id: 'sequence', label: 'Sequence — WhatsApp + Cold Email Sequences' },
        { id: 'full', label: 'Full — AI calls + recordings + WhatsApp followups + demo holds' },
      ],

    });
  });

  app.get('/api/pulse/presets', (_req, res) => {
    res.json({
      voices: VOICE_PRESETS,
      scripts: SCRIPT_PRESETS,
      whatsappTemplates: WHATSAPP_TEMPLATES,
      emailDripSteps: EMAIL_DRIP_STEPS,
    });
  });

  app.get('/api/pulse/status', (_req, res) => {
    res.json(getServerStatus());
  });

  app.all('/api/pulse/status/ping-all', async (_req, res) => {
    try {
      const results = await pingAllServicesAndApis();
      res.json(results);
    } catch (err) {
      res.status(500).json({ error: err.message || 'Ping failed' });
    }
  });


  app.get('/api/pulse/settings', (_req, res) => {
    const settings = getPulseSettings();
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

  /** Lead Validation Studio endpoint */
  app.post('/api/pulse/validate', (req, res) => {
    try {
      const leads = req.body?.leads || [];
      const result = validateLeads(leads);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message || 'Validation failed' });
    }
  });

  /** CRM Hub endpoints */
  app.get('/api/pulse/crm/leads', (req, res) => {
    try {
      const leads = listCrmLeads({
        stage: req.query.stage,
        search: req.query.search,
        limit: req.query.limit,
      });
      res.json({ leads, count: leads.length });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Failed to list CRM leads' });
    }
  });

  app.patch('/api/pulse/crm/leads/:id/stage', (req, res) => {
    try {
      const { stage, note } = req.body || {};
      if (!stage) return res.status(400).json({ error: 'stage is required' });
      const lead = updateLeadStage(req.params.id, stage, note);
      res.json({ ok: true, lead, message: `Stage updated to ${stage}` });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Failed to update stage' });
    }
  });

  app.post('/api/pulse/crm/leads/:id/notes', (req, res) => {
    try {
      const { note, nextAction } = req.body || {};
      if (!note) return res.status(400).json({ error: 'note is required' });
      const lead = addLeadNote(req.params.id, note, nextAction);
      res.json({ ok: true, lead, message: 'Note added to lead timeline' });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Failed to add note' });
    }
  });

  /** Autopilot Calls Studio endpoint */
  app.post('/api/pulse/calls/dial', async (req, res) => {
    try {
      const result = await dialAiCall(req.body || {});
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message || 'Dial failed' });
    }
  });

  /** Autopilot WhatsApp Studio endpoint */
  app.post('/api/pulse/whatsapp/send', async (req, res) => {
    try {
      const result = await sendWhatsAppMessage(req.body || {});
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message || 'WhatsApp send failed' });
    }
  });

  /** Autopilot Email Studio endpoint */
  app.post('/api/pulse/email/send', async (req, res) => {
    try {
      const result = await sendEmailMessage(req.body || {});
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message || 'Email send failed' });
    }
  });

  /** Superadmin Exclusive Self-Number Test Suite */
  app.post('/api/pulse/superadmin/self-test', async (req, res) => {
    try {
      const result = await testSuperAdminSelf(req.body || {});
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message || 'Superadmin self-test failed' });
    }
  });

  /** Notification Hub */
  app.get('/api/pulse/notifications', (req, res) => {
    const limit = Number(req.query.limit) || 30;
    res.json(listNotifications({ limit }));
  });

  app.post('/api/pulse/notifications/mark-read', (req, res) => {
    const ids = req.body?.ids || [];
    res.json(markNotificationsRead(ids));
  });

  /** Master Comprehensive Lead Export */
  app.get('/api/pulse/export/master', (req, res) => {
    try {
      const rows = exportMasterLeads();
      const format = req.query.format === 'json' ? 'json' : 'csv';
      if (format === 'json') {
        return res.json({ leads: rows, count: rows.length });
      }

      if (!rows.length) {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        return res.send('');
      }

      const keys = Object.keys(rows[0]);
      const escape = (v) => {
        const s = v == null ? '' : String(v);
        if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
      };

      const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => escape(r[k])).join(','))].join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="practopulse_master_leads_${Date.now()}.csv"`);
      res.send(csv);
    } catch (err) {
      res.status(500).json({ error: err.message || 'Export failed' });
    }
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
      (Array.isArray(keywords) ? keywords[0] : null) ||
      'All';

    if (!city) {
      return res.status(400).json({
        error: 'Select city (zone and specialty can be All; multi-select supported)',
      });
    }

    const effectiveKw = !kw || kw === 'All' ? 'clinic' : kw;
    const effectiveKwList = kwList.length && !kwList.includes('All') ? kwList : undefined;
    const effectiveZone = !zone || zone === 'All' ? undefined : zone;
    const effectiveZoneList = zoneList.length && !zoneList.includes('All') ? zoneList : undefined;

    try {
      const discovery = await discoverClinics({
        city,
        zone: effectiveZoneList ? effectiveZoneList[0] : effectiveZone,
        zones: effectiveZoneList,
        localities,
        specialty: effectiveKw,
        keyword: effectiveKw,
        keywords: effectiveKwList,
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

