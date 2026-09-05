import { authRequired, requirePermission } from '../auth/middleware.js';
import { sarvamVoiceService } from '../services/sarvamVoice.js';
import { logEvent } from '../services/logger.js';
import { nanoid } from 'nanoid';
import db from '../db/db.js';

const now = () => new Date().toISOString();

export function registerSarvamVoiceRoutes(app) {
  // ── Config ─────────────────────────────────────────────────────────────────
  app.get('/api/sarvam/config', authRequired, requirePermission('api_integrations:read'), (_req, res) => {
    const config = sarvamVoiceService.getConfig();
    res.json({
      ...config,
      apiKey: config.apiKey ? '••••••••' : '',
    });
  });

  app.post('/api/sarvam/config', authRequired, requirePermission('api_integrations:write'), (req, res) => {
    const saved = sarvamVoiceService.saveConfig(req.body || {});
    logEvent({ type: 'info', category: 'sarvam', message: 'Sarvam Voice config updated', userId: req.user.id });
    res.json({ ok: true, config: { ...saved, apiKey: saved.apiKey ? '••••••••' : '' } });
  });

  // ── Test connection ────────────────────────────────────────────────────────
  app.post('/api/sarvam/test-connection', authRequired, requirePermission('api_integrations:read'), async (_req, res) => {
    try {
      const result = await sarvamVoiceService.testConnection();
      const ts = new Date().toISOString();
      try {
        db.prepare('UPDATE api_integrations SET last_tested_at=?, last_test_message=?, last_test_ok=?, status=?, updated_at=? WHERE provider=?')
          .run(ts, result.message || '', result.success ? 1 : 0, result.success ? 'connected' : 'error', ts, 'sarvam_voice');
      } catch { /* ignore */ }
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ── Outbound calls ─────────────────────────────────────────────────────────
  app.post('/api/sarvam/calls/outbound', authRequired, requirePermission('leads:write'), async (req, res) => {
    let { userPhoneNumber, agentVariables = {}, appOverrides = {}, webhookConfig = null, leadId = null, appId = null, appVersion = null, connectionId = null, agentPhoneNumber = null } = req.body || {};

    if (!userPhoneNumber) return res.status(400).json({ error: 'userPhoneNumber is required' });

    // Auto-resolve leadId by phone number if not explicitly passed
    const cleanPhone = String(userPhoneNumber).replace(/[^0-9+]/g, '');
    const cleanDigits = cleanPhone.replace(/\D/g, '');
    if (!leadId && cleanDigits.length >= 10) {
      try {
        const last10 = cleanDigits.slice(-10);
        const match = db.prepare('SELECT id FROM leads WHERE phone LIKE ? LIMIT 1').get(`%${last10}`);
        if (match) leadId = match.id;
      } catch {}
    }

    try {
      const result = await sarvamVoiceService.triggerInstantOutbound({ userPhoneNumber, agentVariables, appOverrides, webhookConfig, leadId, appId, appVersion, connectionId, agentPhoneNumber });

      // Save call log
      const ts = now();
      const callId = `call_${result.attempt_id || nanoid(10)}`;
      try {
        db.prepare(`
          INSERT INTO call_logs (id, lead_id, job_id, direction, phone, status, provider, voice_engine, telephony_provider, meta, created_at, updated_at)
          VALUES (?, ?, ?, 'outbound', ?, 'queued', 'sarvam_voice', 'sarvam', 'sarvam', ?, ?, ?)
        `).run(callId, leadId || null, result.attempt_id || null, cleanPhone, JSON.stringify({ attempt_id: result.attempt_id, userId: req.user.id }), ts, ts);
      } catch { /* ignore */ }

      if (leadId) {
        try {
          db.prepare(`
            UPDATE leads SET
              stage = CASE WHEN stage IN ('new', 'open') THEN 'contacted' ELSE stage END,
              status = 'contacted',
              last_contacted_at = ?,
              temperature = COALESCE(NULLIF(temperature, ''), 'warm'),
              next_action = 'Sarvam AI call initiated — awaiting completion',
              updated_at = ?
            WHERE id = ?
          `).run(ts, ts, leadId);

          db.prepare('INSERT INTO activities (id, lead_id, type, channel, title, detail, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .run(nanoid(), leadId, 'call', 'calls', `Sarvam AI call initiated to ${cleanPhone}`, `Attempt ID: ${result.attempt_id}`, 'pending', ts);
        } catch { /* ignore */ }
      }

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Sync Call Status On Demand ──────────────────────────────────────────────
  app.post('/api/sarvam/calls/:attemptId/sync', authRequired, requirePermission('leads:read'), async (req, res) => {
    try {
      const synced = await sarvamVoiceService.syncAttemptStatus(req.params.attemptId);
      res.json({ ok: true, ...synced });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── Interactions (analytics) ───────────────────────────────────────────────
  app.get('/api/sarvam/calls/interactions', authRequired, requirePermission('leads:read'), async (req, res) => {
    try {
      const { start, end, limit = 20, offset = 0, appId } = req.query;
      const data = await sarvamVoiceService.getInteractions({ startDatetime: start, endDatetime: end, limit: Number(limit), offset: Number(offset), appId });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Transcript ─────────────────────────────────────────────────────────────
  app.get('/api/sarvam/calls/transcripts/:interactionId', authRequired, requirePermission('leads:read'), async (req, res) => {
    try {
      const data = await sarvamVoiceService.getTranscript(req.params.interactionId, req.query.appId);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Recording ──────────────────────────────────────────────────────────────
  app.get('/api/sarvam/calls/recordings/:interactionId', authRequired, requirePermission('leads:read'), async (req, res) => {
    try {
      const data = await sarvamVoiceService.getRecording(req.params.interactionId, req.query.appId);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Campaigns ─────────────────────────────────────────────────────────────
  app.post('/api/sarvam/campaigns', authRequired, requirePermission('leads:write'), async (req, res) => {
    try {
      const data = await sarvamVoiceService.createCampaign(req.body);
      logEvent({ type: 'info', category: 'sarvam', message: 'Sarvam campaign created', userId: req.user.id, meta: data });
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Webhook ────────────────────────────────────────────────────────────────
  app.post('/api/sarvam/webhook', async (req, res) => {
    try {
      const result = await sarvamVoiceService.handleWebhookPayload(req.body);
      let { attempt_id, status, duration, interaction_id, leadId } = result;
      const ts = now();

      // Resolve leadId if missing from webhook metadata
      if (!leadId && attempt_id) {
        try {
          const logRow = db.prepare('SELECT lead_id FROM call_logs WHERE job_id=? OR id=?').get(attempt_id, `call_${attempt_id}`);
          if (logRow?.lead_id) leadId = logRow.lead_id;
          if (!leadId) {
            const qRow = db.prepare('SELECT lead_id FROM autopilot_queue WHERE call_attempt_id=?').get(attempt_id);
            if (qRow?.lead_id) leadId = qRow.lead_id;
          }
        } catch {}
      }

      if (attempt_id) {
        try {
          db.prepare('UPDATE call_logs SET status=?, duration_sec=?, updated_at=? WHERE job_id=? OR id=?').run(status || 'unknown', Number(duration) || 0, ts, attempt_id, `call_${attempt_id}`);
          db.prepare(`
            UPDATE autopilot_queue SET
              call_status = ?,
              call_duration = ?,
              call_disposition = ?,
              updated_at = ?
            WHERE call_attempt_id = ?
          `).run(
            status === 'completed' ? 'completed' : (status || 'failed'),
            Number(duration) || 0,
            `Sarvam Call: ${status || 'updated'} (${duration || 0}s)`,
            ts,
            attempt_id
          );
        } catch { /* ignore */ }
      }

      if (leadId) {
        try {
          const isSuccessful = status === 'completed' || status === 'answered';
          const isBusyOrRnr = status === 'busy' || status === 'no-answer' || status === 'rejected';
          const stageUpdate = 'contacted';
          const statusUpdate = isSuccessful ? 'contacted' : (isBusyOrRnr ? 'unreachable' : 'call_failed');
          const tempUpdate = isSuccessful ? 'warm' : (isBusyOrRnr ? 'cold' : '');
          const nextAction = isSuccessful
            ? 'Send WhatsApp Commercial Proposal'
            : (isBusyOrRnr ? 'Retry outbound call or send WhatsApp' : 'Verify doctor contact number');

          db.prepare(`
            UPDATE leads SET
              stage = ?,
              status = ?,
              temperature = COALESCE(NULLIF(temperature, ''), ?),
              next_action = ?,
              last_contacted_at = ?,
              updated_at = ?
            WHERE id = ? AND stage NOT IN ('won', 'lost')
          `).run(stageUpdate, statusUpdate, tempUpdate, nextAction, ts, ts, leadId);

          db.prepare(`
            INSERT INTO activities (id, lead_id, type, channel, title, detail, status, created_at)
            VALUES (?, ?, 'call', 'calls', ?, ?, 'completed', ?)
          `).run(
            nanoid(),
            leadId,
            `Sarvam Call Outcome: ${(status || 'COMPLETED').toUpperCase()} (${duration || 0}s)`,
            `Call attempt ${attempt_id} finished. Action: ${nextAction}`,
            ts
          );
        } catch (leadErr) {
          console.warn('[Sarvam Webhook] Lead update error:', leadErr.message);
        }
      }

      res.json({ ok: true, ...result, leadId });
    } catch (err) {
      console.error('[Sarvam Webhook]', err.message);
      res.status(200).json({ ok: false, error: err.message });
    }
  });

  // ── Local call logs ────────────────────────────────────────────────────────
  app.get('/api/sarvam/call-logs', authRequired, requirePermission('leads:read'), (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const total = db.prepare('SELECT COUNT(*) as c FROM call_logs').get().c;
    const logs = db.prepare(`
      SELECT c.*, l.name as lead_name, l.company as lead_clinic, l.stage as lead_stage, l.status as lead_status
      FROM call_logs c
      LEFT JOIN leads l ON c.lead_id = l.id
      ORDER BY c.created_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset);
    res.json({ logs, total, limit, offset });
  });
}
