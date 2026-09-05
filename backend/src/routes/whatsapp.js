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
    const { to, text, leadId, doctorName, clinicName, product = 'prime' } = req.body || {};
    if (!to || !text) return res.status(400).json({ error: '"to" and "text" are required' });

    try {
      const result = await metaWhatsAppService.sendTextMessage({
        to,
        text,
        doctorName: doctorName || 'Doctor',
        clinicName: clinicName || 'Clinic',
        product,
        leadId,
      });

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Send template message ──────────────────────────────────────────────────
  app.post('/api/whatsapp/send-template', authRequired, requirePermission('leads:write'), async (req, res) => {
    const { to, templateName, languageCode = 'en_US', components = [], leadId, doctorName, clinicName, product = 'prime' } = req.body || {};
    if (!to || !templateName) return res.status(400).json({ error: '"to" and "templateName" are required' });

    try {
      const result = await metaWhatsAppService.sendTemplateMessage({
        to,
        templateName,
        languageCode,
        components,
        doctorName: doctorName || 'Doctor',
        clinicName: clinicName || 'Clinic',
        product,
        leadId,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Simulate Doctor Inbound Reply & AI Auto-Responder ──────────────────────
  app.post('/api/whatsapp/simulate-reply', authRequired, requirePermission('leads:write'), async (req, res) => {
    const { phone, doctorName, clinicName, product = 'prime', message, leadId } = req.body || {};
    if (!phone || !message) return res.status(400).json({ error: '"phone" and "message" are required' });

    try {
      const result = await metaWhatsAppService.processInboundDoctorMessage({
        fromPhone: phone,
        doctorName: doctorName || 'Doctor',
        clinicName: clinicName || 'Clinic',
        messageText: message,
        product,
        leadId,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Message logs ───────────────────────────────────────────────────────────
  app.get('/api/whatsapp/messages', authRequired, requirePermission('leads:read'), (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 300);
    const offset = Number(req.query.offset) || 0;
    const total = db.prepare("SELECT COUNT(*) as c FROM outreach_messages WHERE channel = 'whatsapp'").get().c;
    const rawRows = db.prepare("SELECT * FROM outreach_messages WHERE channel = 'whatsapp' ORDER BY created_at DESC LIMIT ? OFFSET ?").all(limit, offset);

    const messages = rawRows.map((r) => {
      let meta = {};
      try { meta = JSON.parse(r.meta || '{}'); } catch {}
      return {
        id: r.id,
        leadId: r.lead_id,
        direction: r.direction || 'outbound',
        provider: r.provider,
        phone: r.to_address,
        doctorName: meta.doctorName || 'Doctor',
        clinicName: meta.clinicName || 'Clinic',
        product: meta.product || 'prime',
        body: r.body,
        status: r.status || 'delivered',
        statusLabel: meta.statusLabel || (r.direction === 'inbound' ? 'Inbound Doctor Reply' : (r.status === 'delivered' ? 'Delivered via Web Dispatch' : r.status)),
        sentAt: r.created_at ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently',
        created_at: r.created_at,
        waLink: meta.waLink || `https://wa.me/${r.to_address}?text=${encodeURIComponent(r.body)}`,
        intent: meta.intent || null,
        sentiment: meta.sentiment || null,
        reply: null,
      };
    });

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
