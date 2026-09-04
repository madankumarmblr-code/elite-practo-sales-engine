import { nanoid } from 'nanoid';
import db from '../db/db.js';
import { authRequired, requirePermission } from '../auth/middleware.js';
import { metaWhatsAppService } from '../services/metaWhatsApp.js';
import { logEvent } from '../services/logger.js';
import { persistDurableDbNow } from '../services/dbSnapshot.js';

const now = () => new Date().toISOString();

export function registerWhatsAppRoutes(app) {
  // ── Config ─────────────────────────────────────────────────────────────────
  app.get('/api/whatsapp/config', authRequired, requirePermission('api_integrations:read'), (_req, res) => {
    const config = metaWhatsAppService.getConfig();
    res.json({ ...config, accessToken: config.accessToken ? '••••••••' : '', appSecret: config.appSecret ? '••••••••' : '' });
  });

  app.post('/api/whatsapp/config', authRequired, requirePermission('api_integrations:write'), (req, res) => {
    const saved = metaWhatsAppService.saveConfig(req.body || {});
    logEvent({ type: 'info', category: 'whatsapp', message: 'WhatsApp config updated', userId: req.user.id });
    res.json({ ok: true, config: { ...saved, accessToken: saved.accessToken ? '••••••••' : '', appSecret: '••••••••' } });
  });

  // ── Test connection ────────────────────────────────────────────────────────
  app.post('/api/whatsapp/test-connection', authRequired, requirePermission('api_integrations:read'), async (_req, res) => {
    try {
      const result = await metaWhatsAppService.testConnection();
      const ts = now();
      try {
        db.prepare('UPDATE api_integrations SET last_tested_at=?, last_test_message=?, last_test_ok=?, status=?, updated_at=? WHERE provider=?')
          .run(ts, result.message || '', result.success ? 1 : 0, result.success ? 'connected' : 'error', ts, 'meta_whatsapp');
      } catch { /* ignore */ }
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ── Send text message ──────────────────────────────────────────────────────
  app.post('/api/whatsapp/send-message', authRequired, requirePermission('leads:write'), async (req, res) => {
    const { to, text, leadId } = req.body || {};
    if (!to || !text) return res.status(400).json({ error: '"to" and "text" are required' });

    try {
      const result = await metaWhatsAppService.sendTextMessage({ to, text });
      const ts = now();
      const msgId = `msg_${nanoid(10)}`;
      const cleanTo = String(to).replace(/[^0-9]/g, '');

      try {
        db.prepare(`
          INSERT INTO outreach_messages (id, lead_id, channel, provider, direction, to_address, body, status, provider_message_id, created_at, updated_at)
          VALUES (?, ?, 'whatsapp', 'meta_whatsapp', 'outbound', ?, ?, 'sent', ?, ?, ?)
        `).run(msgId, leadId || null, cleanTo, text, result.messageId || '', ts, ts);
      } catch { /* ignore */ }

      if (leadId) {
        try {
          db.prepare('UPDATE leads SET last_contacted_at=?, updated_at=? WHERE id=?').run(ts, ts, leadId);
          db.prepare('INSERT INTO activities (id, lead_id, type, channel, title, detail, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
            .run(nanoid(), leadId, 'message', 'whatsapp', `WhatsApp sent to +${cleanTo}`, text.substring(0, 120), 'completed', ts);
        } catch { /* ignore */ }
      }

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Send template message ──────────────────────────────────────────────────
  app.post('/api/whatsapp/send-template', authRequired, requirePermission('leads:write'), async (req, res) => {
    const { to, templateName, languageCode = 'en_US', components = [], leadId } = req.body || {};
    if (!to || !templateName) return res.status(400).json({ error: '"to" and "templateName" are required' });

    try {
      const result = await metaWhatsAppService.sendTemplateMessage({ to, templateName, languageCode, components });
      const ts = now();
      try {
        db.prepare(`INSERT INTO outreach_messages (id, lead_id, channel, provider, direction, to_address, body, status, provider_message_id, created_at, updated_at) VALUES (?, ?, 'whatsapp', 'meta_whatsapp', 'outbound', ?, ?, 'sent', ?, ?, ?)`)
          .run(`msg_${nanoid(10)}`, leadId || null, String(to).replace(/[^0-9]/g, ''), `[Template: ${templateName}]`, result.messageId || '', ts, ts);
      } catch { /* ignore */ }
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Message logs ───────────────────────────────────────────────────────────
  app.get('/api/whatsapp/messages', authRequired, requirePermission('leads:read'), (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;
    const total = db.prepare("SELECT COUNT(*) as c FROM outreach_messages WHERE channel = 'whatsapp'").get().c;
    const messages = db.prepare("SELECT * FROM outreach_messages WHERE channel = 'whatsapp' ORDER BY created_at DESC LIMIT ? OFFSET ?").all(limit, offset);
    res.json({ messages, total, limit, offset });
  });

  // ── Webhook verification (GET) ─────────────────────────────────────────────
  app.get('/api/whatsapp/webhook', (req, res) => {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
    const ch = metaWhatsAppService.verifyWebhook(mode, token, challenge);
    if (ch) return res.status(200).send(ch);
    res.status(403).json({ error: 'Webhook verification failed' });
  });

  // ── Webhook events (POST) ──────────────────────────────────────────────────
  app.post('/api/whatsapp/webhook', async (req, res) => {
    try {
      const result = await metaWhatsAppService.handleWebhookEvent(req.body);
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error('[WhatsApp Webhook]', err.message);
      res.status(200).json({ ok: false, error: err.message });
    }
  });
}
