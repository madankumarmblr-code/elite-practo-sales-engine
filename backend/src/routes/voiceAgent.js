import db from '../db/db.js';
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
    let doctorName = body.doctorName || body.doctor_name || body.name;
    let clinicName = body.clinicName || body.clinic_name;
    let locality = body.locality || body.area;
    let city = body.city;
    let speciality = body.speciality || body.specialty;
    let product = body.product || 'prime';
    const agentType = (body.agentType === 'human_agent' || body.agentType === 'human') ? 'human' : 'ai';
    const voiceEngine = body.voiceEngine || 'sarvam';
    const telephonyProviderName = body.telephonyProviderName || body.telephonyProvider || (voiceEngine === 'sarvam' ? 'sarvam' : null);
    const leadId = body.leadId || null;
    const customNotes = body.customNotes || '';
    const reachSlotDetails = body.reachSlotDetails || (body.reach_slot_details ? (typeof body.reach_slot_details === 'string' ? JSON.parse(body.reach_slot_details) : body.reach_slot_details) : null);
    const reachSlotId = body.reachSlotId || body.reach_slot_id || (reachSlotDetails?.slotId || null);

    if (!toPhone) {
      return res.status(400).json({ ok: false, error: 'toPhone or phone is required' });
    }

    // If leadId is passed, enrich missing doctor/clinic attributes from database
    if (leadId) {
      try {
        const leadRow = db.prepare('SELECT name, clinic_name, city, locality, speciality, product_interest FROM leads WHERE id = ?').get(leadId);
        if (leadRow) {
          if (!doctorName || doctorName === 'Doctor') doctorName = leadRow.name || 'Doctor';
          if (!clinicName || clinicName === 'Clinic') clinicName = leadRow.clinic_name || 'Clinic';
          if (!locality || locality === 'Bangalore') locality = leadRow.locality || leadRow.city || 'Bangalore';
          if (!city || city === 'Bangalore') city = leadRow.city || 'Bangalore';
          if (!speciality || speciality === 'General Physician') speciality = leadRow.speciality || 'General Physician';
          if (!product || product === 'prime') product = leadRow.product_interest || product;
        }
      } catch { /* ignore */ }
    }

    doctorName = doctorName || 'Doctor';
    clinicName = clinicName || 'Clinic';
    locality = locality || 'Bangalore';
    city = city || 'Bangalore';
    speciality = speciality || 'General Physician';

    try {
      const result = await voiceAgentService.placeVoiceCall({
        toPhone,
        doctorName,
        clinicName,
        locality,
        city,
        speciality,
        product,
        agentType,
        voiceEngine,
        telephonyProviderName,
        leadId,
        customNotes,
        reachSlotDetails,
      });

      res.json({ ok: true, call: result, ...result });
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
