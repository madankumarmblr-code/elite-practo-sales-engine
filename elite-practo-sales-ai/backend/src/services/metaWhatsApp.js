import db from '../db/db.js';
import { logEvent } from './logger.js';

const META_GRAPH_BASE = 'https://graph.facebook.com/v21.0';

/**
 * Meta WhatsApp Cloud API Service
 */
export class MetaWhatsAppService {
  getConfig() {
    const envPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    const envWabaId = process.env.WHATSAPP_WABA_ID || '';
    const envToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_SYSTEM_USER_TOKEN || '';
    const envVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'elite_wa_verify_token_2026';
    const envAppSecret = process.env.WHATSAPP_APP_SECRET || '';

    let dbSecrets = {};
    let dbConfig = {};
    try {
      const row = db.prepare('SELECT secrets, config FROM api_integrations WHERE provider = ?').get('meta_whatsapp');
      if (row) {
        dbSecrets = JSON.parse(row.secrets || '{}');
        dbConfig = JSON.parse(row.config || '{}');
      }
    } catch { /* ignore */ }

    return {
      phoneNumberId: dbConfig.phoneNumberId || envPhoneId,
      wabaId: dbConfig.wabaId || envWabaId,
      accessToken: dbSecrets.accessToken || envToken,
      verifyToken: dbConfig.verifyToken || envVerifyToken,
      appSecret: dbSecrets.appSecret || envAppSecret,
    };
  }

  saveConfig({ phoneNumberId, wabaId, accessToken, verifyToken, appSecret }) {
    const current = this.getConfig();
    const newAccessToken = accessToken && accessToken !== '••••••••' ? accessToken : current.accessToken;
    const newAppSecret = appSecret && appSecret !== '••••••••' ? appSecret : current.appSecret;
    const newConfig = { phoneNumberId: phoneNumberId || current.phoneNumberId, wabaId: wabaId || current.wabaId, verifyToken: verifyToken || current.verifyToken };
    const newSecrets = { accessToken: newAccessToken, appSecret: newAppSecret };
    const ts = new Date().toISOString();

    try {
      const existing = db.prepare('SELECT id FROM api_integrations WHERE provider = ?').get('meta_whatsapp');
      const hasToken = Boolean(newAccessToken && newConfig.phoneNumberId);
      const status = hasToken ? 'connected' : 'ready';

      if (existing) {
        db.prepare(`UPDATE api_integrations SET enabled=?, status=?, config=?, secrets=?, updated_at=? WHERE provider=?`)
          .run(hasToken ? 1 : 0, status, JSON.stringify(newConfig), JSON.stringify(newSecrets), ts, 'meta_whatsapp');
      } else {
        db.prepare(`INSERT INTO api_integrations (id, provider, label, category, enabled, status, config, secrets, notes, updated_at, channel, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(`meta-wa-${Date.now()}`, 'meta_whatsapp', 'Meta WhatsApp Cloud API', 'Messaging', hasToken ? 1 : 0, status, JSON.stringify(newConfig), JSON.stringify(newSecrets), 'Official Meta WhatsApp Business Cloud API', ts, 'whatsapp', 1);
      }
    } catch (err) {
      console.warn('[MetaWhatsAppService] DB save error:', err.message);
    }
    return this.getConfig();
  }

  async testConnection() {
    const config = this.getConfig();
    if (!config.accessToken) return { success: false, message: 'Missing Meta WhatsApp Access Token' };
    if (!config.phoneNumberId) return { success: false, message: 'Missing Meta WhatsApp Phone Number ID' };

    try {
      const res = await fetch(`${META_GRAPH_BASE}/${config.phoneNumberId}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${config.accessToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { success: false, status: res.status, message: data.error?.message || `Meta Graph API error (${res.status})` };
      return { success: true, status: res.status, message: `Connected: ${data.display_phone_number || data.id} (${data.verified_name || 'Verified'})`, details: data };
    } catch (err) {
      return { success: false, message: `Network error: ${err.message}` };
    }
  }

  async sendTextMessage({ to, text, previewUrl = true }) {
    const config = this.getConfig();
    if (!config.accessToken || !config.phoneNumberId) throw new Error('Meta WhatsApp API is not configured.');
    if (!to || !text) throw new Error('Recipient number ("to") and message "text" are required.');

    let recipient = String(to).replace(/[^0-9]/g, '');
    if (recipient.startsWith('0')) recipient = recipient.substring(1);
    if (!recipient.startsWith('91') && recipient.length === 10) recipient = `91${recipient}`;

    const url = `${META_GRAPH_BASE}/${config.phoneNumberId}/messages`;
    const payload = { messaging_product: 'whatsapp', recipient_type: 'individual', to: recipient, type: 'text', text: { preview_url: Boolean(previewUrl), body: text } };

    logEvent({ type: 'info', category: 'whatsapp', message: `Sending WhatsApp text to +${recipient}`, meta: { to: recipient } });

    const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.error?.message || `WhatsApp API error (${res.status})`;
      logEvent({ type: 'error', category: 'whatsapp', message: `Failed to send WhatsApp to +${recipient}`, detail: errorMsg });
      throw new Error(errorMsg);
    }
    return { ok: true, messageId: data.messages?.[0]?.id, to: recipient, status: 'sent', timestamp: new Date().toISOString() };
  }

  async sendTemplateMessage({ to, templateName, languageCode = 'en_US', components = [] }) {
    const config = this.getConfig();
    if (!config.accessToken || !config.phoneNumberId) throw new Error('Meta WhatsApp API is not configured.');

    let recipient = String(to).replace(/[^0-9]/g, '');
    if (!recipient.startsWith('91') && recipient.length === 10) recipient = `91${recipient}`;

    const url = `${META_GRAPH_BASE}/${config.phoneNumberId}/messages`;
    const payload = { messaging_product: 'whatsapp', recipient_type: 'individual', to: recipient, type: 'template', template: { name: templateName, language: { code: languageCode }, components: components.length > 0 ? components : undefined } };

    const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${config.accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error?.message || `Failed to send template (${res.status})`);
    return { ok: true, messageId: data.messages?.[0]?.id, to: recipient, status: 'sent' };
  }

  verifyWebhook(mode, token, challenge) {
    const config = this.getConfig();
    if (mode === 'subscribe' && token === config.verifyToken) return challenge;
    return null;
  }

  async handleWebhookEvent(body) {
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.statuses) {
      for (const status of value.statuses) {
        logEvent({ type: 'info', category: 'whatsapp', message: `WhatsApp Status: Message ${status.id} -> ${status.status}`, meta: { status } });
      }
    }
    if (value?.messages) {
      for (const msg of value.messages) {
        logEvent({ type: 'info', category: 'whatsapp', message: `WhatsApp Inbound from +${msg.from}: ${msg.text?.body || msg.type}`, meta: { from: msg.from, type: msg.type, text: msg.text?.body } });
      }
    }
    return { processed: true, count: (value?.messages?.length || 0) + (value?.statuses?.length || 0) };
  }
}

export const metaWhatsAppService = new MetaWhatsAppService();
