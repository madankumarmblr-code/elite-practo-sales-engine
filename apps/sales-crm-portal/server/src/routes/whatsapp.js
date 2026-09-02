import express from 'express';
import { metaWhatsAppService } from '../services/metaWhatsApp.js';
import { rbacMiddleware, PERMISSIONS } from '../services/rbac.js';

export const whatsappRouter = express.Router();

// ── 1. Webhook GET verification handshake ───────────────────────────────────
whatsappRouter.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifiedChallenge = metaWhatsAppService.verifyWebhook(mode, token, challenge);
  if (verifiedChallenge) {
    return res.status(200).send(verifiedChallenge);
  }
  return res.status(403).send('Verification token mismatch');
});

// ── 2. Webhook POST notifications from Meta ─────────────────────────────────
whatsappRouter.post('/webhook', async (req, res) => {
  try {
    const result = await metaWhatsAppService.handleWebhookEvent(req.body);
    res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error('[WhatsApp Webhook Error]:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── 3. Get WhatsApp Configuration (Masked) ──────────────────────────────────
whatsappRouter.get('/config', (req, res) => {
  const config = metaWhatsAppService.getConfig();
  res.json({
    ok: true,
    config: {
      ...config,
      accessToken: config.accessToken ? '••••••••' + config.accessToken.slice(-4) : '',
      appSecret: config.appSecret ? '••••••••' + config.appSecret.slice(-4) : '',
      isConfigured: Boolean(config.accessToken && config.phoneNumberId),
    },
  });
});

// ── 4. Save WhatsApp Configuration ──────────────────────────────────────────
whatsappRouter.post('/config', rbacMiddleware(PERMISSIONS.MANAGE_INTEGRATIONS), (req, res) => {
  try {
    const updated = metaWhatsAppService.saveConfig(req.body || {});
    res.json({
      ok: true,
      message: 'Meta WhatsApp Cloud API configuration saved successfully',
      config: {
        ...updated,
        accessToken: updated.accessToken ? '••••••••' + updated.accessToken.slice(-4) : '',
        appSecret: updated.appSecret ? '••••••••' + updated.appSecret.slice(-4) : '',
        isConfigured: Boolean(updated.accessToken && updated.phoneNumberId),
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── 5. Test / Ping Meta Graph API Connection ────────────────────────────────
whatsappRouter.post('/test-connection', async (req, res) => {
  const result = await metaWhatsAppService.testConnection();
  res.json(result);
});

// ── 6. Send WhatsApp Message ────────────────────────────────────────────────
whatsappRouter.post('/send-message', rbacMiddleware(PERMISSIONS.UPDATE_LEADS), async (req, res) => {
  try {
    const { to, text, leadId, previewUrl } = req.body || {};
    const result = await metaWhatsAppService.sendTextMessage({ to, text, leadId, previewUrl });
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message || 'Failed to send WhatsApp message' });
  }
});

// ── 7. Send WhatsApp Template Message ───────────────────────────────────────
whatsappRouter.post('/send-template', rbacMiddleware(PERMISSIONS.UPDATE_LEADS), async (req, res) => {
  try {
    const { to, templateName, languageCode, components, leadId } = req.body || {};
    const result = await metaWhatsAppService.sendTemplateMessage({
      to,
      templateName,
      languageCode,
      components,
      leadId,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
