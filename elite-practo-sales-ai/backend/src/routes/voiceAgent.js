import { authRequired, requirePermission } from '../auth/middleware.js';
import { voiceAgentService } from '../services/voiceAgentService.js';
import { telephonyProvider } from '../services/telephonyProvider.js';
import { logEvent } from '../services/logger.js';

export function registerVoiceAgentRoutes(app) {
  // ── 1. Telephony & Engine Configuration ─────────────────────────────────────
  app.get('/api/voice-agent/config', authRequired, requirePermission('api_integrations:read'), (_req, res) => {
    try {
      const config = telephonyProvider.getConfig();
      res.json({
        ok: true,
        engine: 'Elite Native Voice AI Engine v2.4',
        config,
      });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/api/voice-agent/config', authRequired, requirePermission('api_integrations:write'), (req, res) => {
    try {
      const updated = telephonyProvider.saveConfig(req.body || {});
      logEvent({
        type: 'info',
        category: 'telephony',
        message: 'Telephony & Voice Agent config updated',
        userId: req.user.id,
      });
      res.json({ ok: true, config: updated });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── 2. Outbound Dialing (Native Voice AI / Human Agent) ─────────────────────
  app.post('/api/voice-agent/dial', authRequired, requirePermission('leads:write'), async (req, res) => {
    const body = req.body || {};
    const toPhone = body.toPhone || body.phone;
    const doctorName = body.doctorName || 'Doctor';
    const clinicName = body.clinicName || 'Clinic';
    const locality = body.locality || 'Bangalore';
    const city = body.city || 'Bangalore';
    const speciality = body.speciality || 'General Physician';
    const product = body.product || 'prime';
    const agentType = (body.agentType === 'human_agent' || body.agentType === 'human') ? 'human' : 'ai';
    const telephonyProviderName = body.telephonyProviderName || body.telephonyProvider || null;
    const leadId = body.leadId || null;
    const customNotes = body.customNotes || '';

    if (!toPhone) {
      return res.status(400).json({ ok: false, error: 'toPhone or phone is required' });
    }

    try {
      const result = await voiceAgentService.placeVoiceCall({
        toPhone,
        doctorName: doctorName || 'Doctor',
        clinicName: clinicName || 'Clinic',
        locality: locality || 'Bangalore',
        city: city || 'Bangalore',
        speciality: speciality || 'General Physician',
        product,
        agentType,
        telephonyProviderName,
        leadId,
        customNotes,
      });

      res.json({ ok: true, call: result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── 3. List Calls with Rich Transcription & Sentiment ───────────────────────
  app.get('/api/voice-agent/calls', authRequired, requirePermission('leads:read'), (req, res) => {
    try {
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const offset = Number(req.query.offset) || 0;
      const agentType = req.query.agentType || null;
      const provider = req.query.provider || null;

      const calls = voiceAgentService.listCalls({ limit, offset, agentType, provider });
      res.json({ ok: true, calls, total: calls.length, limit, offset });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── 4. Get Single Call with Speaker Turns & Sentiment Breakdown ─────────────
  app.get('/api/voice-agent/calls/:id', authRequired, requirePermission('leads:read'), (req, res) => {
    try {
      const call = voiceAgentService.getCallById(req.params.id);
      if (!call) return res.status(404).json({ ok: false, error: 'Call record not found' });
      res.json({ ok: true, call });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── 5. Run / Re-Run Dual Sentiment Analysis ────────────────────────────────
  app.post('/api/voice-agent/analyze-sentiment', authRequired, requirePermission('leads:read'), async (req, res) => {
    try {
      const { callId, turns, agentType, doctorName, product } = req.body || {};
      const analysis = await voiceAgentService.reanalyzeSentiment({ callId, turns, agentType, doctorName, product });
      res.json({ ok: true, analysis });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── 6. Universal Telephony Webhook ──────────────────────────────────────────
  app.post('/api/voice-agent/telephony/webhook', async (req, res) => {
    try {
      const payload = req.body || {};
      logEvent({
        type: 'info',
        category: 'telephony',
        message: 'Received inbound telephony webhook event',
        meta: payload,
      });

      // Acknowledge webhook
      res.json({ ok: true, received: true, timestamp: new Date().toISOString() });
    } catch (err) {
      console.error('[Telephony Webhook Error]', err.message);
      res.status(200).json({ ok: false, error: err.message });
    }
  });
}
