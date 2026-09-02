import { store } from '../db/store.js';

const META_GRAPH_BASE = 'https://graph.facebook.com/v21.0';

/**
 * Meta WhatsApp Cloud API Service for Apex Sales CRM
 */
export class MetaWhatsAppService {
  getConfig() {
    const envPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '1247152318490241';
    const envWabaId = process.env.WHATSAPP_WABA_ID || '903448745820434';
    const envToken = process.env.WHATSAPP_ACCESS_TOKEN || process.env.META_SYSTEM_USER_TOKEN || '';
    const envVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'practo_wa_verify_token_2026';
    const envAppSecret = process.env.WHATSAPP_APP_SECRET || '';

    const stored = store.data.integrations?.meta_whatsapp || {};

    return {
      phoneNumberId: stored.phoneNumberId || envPhoneId,
      wabaId: stored.wabaId || envWabaId,
      accessToken: stored.accessToken || envToken,
      verifyToken: stored.verifyToken || envVerifyToken,
      appSecret: stored.appSecret || envAppSecret,
    };
  }

  saveConfig(updates = {}) {
    const current = this.getConfig();
    const rawToken = (updates.accessToken || '').trim();
    const newAccessToken = rawToken && !rawToken.startsWith('••••') ? rawToken : current.accessToken;
    const rawSecret = (updates.appSecret || '').trim();
    const newAppSecret = rawSecret && !rawSecret.startsWith('••••') ? rawSecret : current.appSecret;

    const newConfig = {
      phoneNumberId: (updates.phoneNumberId || current.phoneNumberId || '').trim(),
      wabaId: (updates.wabaId || current.wabaId || '').trim(),
      accessToken: newAccessToken,
      verifyToken: (updates.verifyToken || current.verifyToken || '').trim(),
      appSecret: newAppSecret,
      updatedAt: new Date().toISOString(),
    };

    if (!store.data.integrations) store.data.integrations = {};
    store.data.integrations.meta_whatsapp = newConfig;
    store.persist();

    return this.getConfig();
  }

  async testConnection() {
    const config = this.getConfig();
    if (!config.accessToken) {
      return { success: false, message: 'Missing Meta WhatsApp Access Token' };
    }
    if (!config.phoneNumberId) {
      return { success: false, message: 'Missing Meta WhatsApp Phone Number ID' };
    }

    try {
      const url = `${META_GRAPH_BASE}/${config.phoneNumberId}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          success: false,
          status: res.status,
          message: data.error?.message || `Meta Graph API error (${res.status})`,
        };
      }

      return {
        success: true,
        status: res.status,
        message: `Connected: ${data.display_phone_number || data.id} (${data.verified_name || 'Verified'})`,
        details: data,
      };
    } catch (err) {
      return { success: false, message: `Network error connecting to Meta Graph: ${err.message}` };
    }
  }

  async sendTextMessage({ to, text, leadId = null, previewUrl = true }) {
    const config = this.getConfig();
    if (!config.accessToken || !config.phoneNumberId) {
      throw new Error('Meta WhatsApp API is not configured. Set Phone Number ID and Access Token.');
    }
    if (!to || !text) {
      throw new Error('Recipient number ("to") and message "text" are required.');
    }

    let recipient = String(to).replace(/[^0-9]/g, '');
    if (recipient.startsWith('0')) recipient = recipient.substring(1);
    if (!recipient.startsWith('91') && recipient.length === 10) recipient = `91${recipient}`;

    const url = `${META_GRAPH_BASE}/${config.phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'text',
      text: {
        preview_url: Boolean(previewUrl),
        body: text,
      },
    };

    store.logAudit({
      action: 'WHATSAPP_MESSAGE_SENT',
      entity: `Sending WhatsApp message to +${recipient}`,
      user: 'Meta WhatsApp Engine',
      ip: 'CRM-Server',
      category: 'OUTREACH',
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.error?.message || `WhatsApp API error (${res.status})`;
      throw new Error(errorMsg);
    }

    const messageId = data.messages?.[0]?.id;

    if (leadId) {
      const lead = store.getLeadById(leadId);
      if (lead) {
        if (!lead.timeline) lead.timeline = [];
        lead.timeline.unshift({
          id: `act-${Date.now()}`,
          type: 'whatsapp_message',
          title: 'WhatsApp Message Sent',
          description: `Dispatched to +${recipient} via Meta Cloud API. Message ID: ${messageId}`,
          timestamp: new Date().toISOString(),
          user: 'Meta WhatsApp AI',
          metadata: { messageId, text },
        });
        store.updateLead(leadId, { timeline: lead.timeline });
      }
    }

    return {
      ok: true,
      messageId,
      to: recipient,
      status: 'sent',
      timestamp: new Date().toISOString(),
    };
  }

  async sendTemplateMessage({ to, templateName, languageCode = 'en_US', components = [], leadId = null }) {
    const config = this.getConfig();
    if (!config.accessToken || !config.phoneNumberId) {
      throw new Error('Meta WhatsApp API is not configured.');
    }

    let recipient = String(to).replace(/[^0-9]/g, '');
    if (!recipient.startsWith('91') && recipient.length === 10) recipient = `91${recipient}`;

    const url = `${META_GRAPH_BASE}/${config.phoneNumberId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient,
      type: 'template',
      template: {
        name: templateName,
        language: { code: languageCode },
        components: components.length > 0 ? components : undefined,
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error?.message || `Failed to send WhatsApp template (${res.status})`);
    }

    return {
      ok: true,
      messageId: data.messages?.[0]?.id,
      to: recipient,
      status: 'sent',
    };
  }

  verifyWebhook(mode, token, challenge) {
    const config = this.getConfig();
    if (mode === 'subscribe' && token === config.verifyToken) {
      return challenge;
    }
    return null;
  }

  async handleWebhookEvent(body) {
    const entry = body?.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (value?.statuses) {
      for (const status of value.statuses) {
        store.logAudit({
          action: 'WHATSAPP_STATUS_UPDATE',
          entity: `Message ${status.id} -> ${status.status}`,
          user: 'Meta Webhook',
          ip: 'Meta-Cloud',
          category: 'OUTREACH',
        });
      }
    }

    return { processed: true, count: (value?.messages?.length || 0) + (value?.statuses?.length || 0) };
  }
}

export const metaWhatsAppService = new MetaWhatsAppService();
