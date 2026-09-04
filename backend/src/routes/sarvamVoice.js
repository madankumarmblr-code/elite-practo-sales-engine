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
    const { userPhoneNumber, agentVariables = {}, appOverrides = {}, webhookConfig = null, leadId = null, appId = null, appVersion = null, connectionId = null, agentPhoneNumber = null } = req.body || {};

    if (!userPhoneNumber) return res.status(400).json({ error: 'userPhoneNumber is required' });

    try {
      const result = await sarvamVoiceService.triggerInstantOutbound({ userPhoneNumber, agentVariables, appOverrides, webhookConfig, leadId, appId, appVersion, connectionId, agentPhoneNumber });

      // Save call log
      const ts = now();
      const callId = `call_${nanoid(10)}`;
      const cleanPhone = String(userPhoneNumber).replace(/[^0-9+]/g, '');
      try {
        db.prepare(`
          INSERT INTO call_logs (id, lead_id, job_id, direction, phone, status, provider, meta, created_at, updated_at)
          VALUES (?, ?, ?, 'outbound', ?, 'queued', 'sarvam_voice', ?, ?, ?)
        `).run(callId, leadId || null, result.attempt_id || null, cleanPhone, JSON.stringify({ attempt_id: result.attempt_id, userId: req.user.id }), ts, ts);
      } catch { /* ignore */ }

      if (leadId) {
        try {
          db.prepare('UPDATE leads SET last_contacted_at=?, updated_at=? WHERE id=?').run(ts, ts, leadId);
          db.prepare('INSERT INTO activities (id, lead_id, type, channel, title, detail, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .run(nanoid(), leadId, 'call', 'calls', `Sarvam AI call initiated to ${cleanPhone}`, `Attempt ID: ${result.attempt_id}`, 'pending', ts);
        } catch { /* ignore */ }
      }

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
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
      const { attempt_id, status, duration, interaction_id, leadId } = result;
      const ts = now();

      if (attempt_id) {
        try {
          db.prepare('UPDATE call_logs SET status=?, duration_sec=?, updated_at=? WHERE job_id=?').run(status || 'unknown', Number(duration) || 0, ts, attempt_id);
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

      if (leadId && status) {
        const stageMap = { completed: 'contacted', answered: 'contacted' };
        const newStage = stageMap[status];
        if (newStage) {
          try {
            db.prepare('UPDATE leads SET stage=?, last_contacted_at=?, updated_at=? WHERE id=? AND stage NOT IN (?,?)').run(newStage, ts, ts, leadId, 'won', 'lost');
          } catch { /* ignore */ }
        }
      }

      res.json({ ok: true, ...result });
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
    const logs = db.prepare('SELECT * FROM call_logs ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
    res.json({ logs, total, limit, offset });
  });
}
