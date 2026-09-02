import { metaWhatsAppService } from '../services/metaWhatsApp.js';
import { authRequired, requirePermission } from '../auth/middleware.js';

export function registerWhatsAppRoutes(app) {
  // ── 1. Webhook GET verification handshake with Meta ─────────────────────────
  app.get('/api/whatsapp/webhook', (req, res) => {
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
  app.post('/api/whatsapp/webhook', async (req, res) => {
    try {
      const result = await metaWhatsAppService.handleWebhookEvent(req.body);
      res.status(200).json({ ok: true, result });
    } catch (err) {
      console.error('[WhatsApp Webhook Error]:', err);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── 3. Get WhatsApp Configuration (Masked) ──────────────────────────────────
  app.get(
    '/api/whatsapp/config',
    authRequired,
    requirePermission('settings:read', 'api_integrations:read', 'dashboard:read'),
    (_req, res) => {
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
    }
  );

  // ── 4. Save WhatsApp Configuration ──────────────────────────────────────────
  app.post(
    '/api/whatsapp/config',
    authRequired,
    requirePermission('settings:write', 'api_integrations:write'),
    (req, res) => {
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
    }
  );

  // ── 5. Test / Ping Meta Graph API Connection ────────────────────────────────
  app.post(
    '/api/whatsapp/test-connection',
    authRequired,
    requirePermission('api_integrations:read', 'settings:read'),
    async (_req, res) => {
      const result = await metaWhatsAppService.testConnection();
      res.json(result);
    }
  );

  // ── 6. Send WhatsApp Text Message ───────────────────────────────────────────
  app.post(
    '/api/whatsapp/send-message',
    authRequired,
    requirePermission('leads:write', 'pitch:write'),
    async (req, res) => {
      try {
        const { to, text, previewUrl } = req.body || {};
        const result = await metaWhatsAppService.sendTextMessage({ to, text, previewUrl });
        res.json(result);
      } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
      }
    }
  );

  // ── 7. Send WhatsApp Template Message ───────────────────────────────────────
  app.post(
    '/api/whatsapp/send-template',
    authRequired,
    requirePermission('leads:write', 'pitch:write'),
    async (req, res) => {
      try {
        const { to, templateName, languageCode, components } = req.body || {};
        const result = await metaWhatsAppService.sendTemplateMessage({
          to,
          templateName,
          languageCode,
          components,
        });
        res.json(result);
      } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
      }
    }
  );
}
