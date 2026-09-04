import db from '../db/db.js';
import { logEvent } from './logger.js';

const SARVAM_API_BASE = 'https://apps.sarvam.ai/api';

/**
 * Sarvam Voice Agents (Indus Samvaad) — Configuration & Client Service
 * Default Org: 01a050ff-9cdc-7d60-8c27-eaf6731df818
 * Default Workspace: 01a050ff-9ce4-74ef-980d-b167c2e3489c
 */
export class SarvamVoiceService {
  constructor() {
    this.defaultOrgId = '01a050ff-9cdc-7d60-8c27-eaf6731df818';
    this.defaultWorkspaceId = '01a050ff-9ce4-74ef-980d-b167c2e3489c';
  }

  getConfig() {
    const envApiKey = process.env.SARVAM_VOICE_API_KEY || '';
    const envOrgId = process.env.SARVAM_ORG_ID || this.defaultOrgId;
    const envWorkspaceId = process.env.SARVAM_WORKSPACE_ID || this.defaultWorkspaceId;
    const envAppId = process.env.SARVAM_AGENT_APP_ID || '';
    const envAppVersion = Number(process.env.SARVAM_AGENT_APP_VERSION) || 1;
    const envConnectionId = process.env.SARVAM_CONNECTION_ID || '';
    const envAgentPhone = process.env.SARVAM_AGENT_PHONE_NUMBER || '';
    const envWebhookUrl = process.env.SARVAM_WEBHOOK_URL || '';

    let dbSecrets = {};
    let dbConfig = {};
    try {
      const row = db.prepare('SELECT secrets, config FROM api_integrations WHERE provider = ?').get('sarvam_voice');
      if (row) {
        dbSecrets = JSON.parse(row.secrets || '{}');
        dbConfig = JSON.parse(row.config || '{}');
      }
    } catch { /* table may not be ready yet */ }

    return {
      apiKey: dbSecrets.apiKey || envApiKey,
      orgId: dbConfig.orgId || envOrgId,
      workspaceId: dbConfig.workspaceId || envWorkspaceId,
      appId: dbConfig.appId || envAppId,
      appVersion: Number(dbConfig.appVersion) || envAppVersion,
      connectionId: dbConfig.connectionId || envConnectionId,
      agentPhoneNumber: dbConfig.agentPhoneNumber || envAgentPhone,
      webhookUrl: dbConfig.webhookUrl || envWebhookUrl,
    };
  }

  saveConfig({ apiKey, orgId, workspaceId, appId, appVersion, connectionId, agentPhoneNumber, webhookUrl }) {
    const current = this.getConfig();
    const newApiKey = apiKey && apiKey !== '••••••••' ? apiKey : current.apiKey;
    const newOrgId = orgId || current.orgId;
    const newWorkspaceId = workspaceId || current.workspaceId;
    const newAppId = appId || current.appId;
    const newAppVersion = appVersion ? Number(appVersion) : current.appVersion;
    const newConnectionId = connectionId || current.connectionId;
    const newAgentPhone = agentPhoneNumber || current.agentPhoneNumber;
    const newWebhookUrl = webhookUrl !== undefined ? webhookUrl : current.webhookUrl;

    const ts = new Date().toISOString();
    try {
      const existing = db.prepare('SELECT id FROM api_integrations WHERE provider = ?').get('sarvam_voice');
      const hasKey = Boolean(newApiKey);
      const status = hasKey ? 'connected' : 'ready';
      const configJson = JSON.stringify({ orgId: newOrgId, workspaceId: newWorkspaceId, appId: newAppId, appVersion: newAppVersion, connectionId: newConnectionId, agentPhoneNumber: newAgentPhone, webhookUrl: newWebhookUrl });
      const secretsJson = JSON.stringify({ apiKey: newApiKey });

      if (existing) {
        db.prepare(`UPDATE api_integrations SET enabled=?, status=?, config=?, secrets=?, updated_at=? WHERE provider=?`)
          .run(hasKey ? 1 : 0, status, configJson, secretsJson, ts, 'sarvam_voice');
      } else {
        db.prepare(`INSERT INTO api_integrations (id, provider, label, category, enabled, status, config, secrets, notes, updated_at, channel, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
          .run(`sarvam-${Date.now()}`, 'sarvam_voice', 'Sarvam Voice Agents', 'Voice AI', hasKey ? 1 : 0, status, configJson, secretsJson, 'Indus Samvaad Voice Agents', ts, 'voice_ai', 1);
      }
    } catch (err) {
      console.warn('[SarvamVoiceService] DB save error:', err.message);
    }
    return this.getConfig();
  }

  getHeaders() {
    const { apiKey } = this.getConfig();
    return { 'Content-Type': 'application/json', 'X-API-Key': apiKey };
  }

  async testConnection() {
    const config = this.getConfig();
    if (!config.apiKey) return { success: false, message: 'Missing Sarvam Voice API Key (X-API-Key)' };
    if (!config.orgId || !config.workspaceId) return { success: false, message: 'Missing Organization ID or Workspace ID' };

    try {
      const startDatetime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDatetime = new Date().toISOString();
      const testAppId = config.appId || 'test-agent';
      const url = `${SARVAM_API_BASE}/analytics/v1/${config.orgId}/${config.workspaceId}/${testAppId}/interactions?start_datetime=${encodeURIComponent(startDatetime)}&end_datetime=${encodeURIComponent(endDatetime)}&limit=1`;

      const res = await fetch(url, { method: 'GET', headers: this.getHeaders() });
      if (res.status === 401 || res.status === 403) return { success: false, status: res.status, message: 'Invalid X-API-Key or unauthorized access to workspace' };
      return { success: true, status: res.status, message: 'Sarvam Voice Agents API credentials verified', orgId: config.orgId, workspaceId: config.workspaceId, appId: config.appId };
    } catch (err) {
      return { success: false, message: `Network error: ${err.message}` };
    }
  }

  /**
   * Place an Instant Outbound Call via Sarvam Voice Agents
   * POST https://apps.sarvam.ai/api/outbounds/v1/orgs/{org_id}/workspaces/{workspace_id}/outbounds
   */
  async triggerInstantOutbound({ userPhoneNumber, agentVariables = {}, appOverrides = {}, webhookConfig = null, leadId = null, appId = null, appVersion = null, connectionId = null, agentPhoneNumber = null }) {
    const config = this.getConfig();
    const finalAppId = appId || config.appId;
    const finalAppVersion = appVersion || config.appVersion;
    const finalConnectionId = connectionId || config.connectionId;
    const finalAgentPhone = agentPhoneNumber || config.agentPhoneNumber;

    if (!config.apiKey) throw new Error('Sarvam Voice API Key is not configured.');
    if (!finalAppId) throw new Error('Sarvam Agent App ID (app_id) is required.');
    if (!finalConnectionId || !finalAgentPhone) throw new Error('Sarvam Telephony Connection ID and Agent Phone Number are required.');
    if (!userPhoneNumber) throw new Error('Target user_phone_number is required (e.g. +9198XXXXXXXX).');

    let formattedUserPhone = String(userPhoneNumber).trim().replace(/\s+/g, '');
    if (!formattedUserPhone.startsWith('+')) {
      formattedUserPhone = formattedUserPhone.startsWith('91') ? `+${formattedUserPhone}` : `+91${formattedUserPhone}`;
    }

    let formattedAgentPhone = String(finalAgentPhone).trim().replace(/\s+/g, '');
    if (!formattedAgentPhone.startsWith('+')) {
      formattedAgentPhone = formattedAgentPhone.startsWith('91') ? `+${formattedAgentPhone}` : `+91${formattedAgentPhone}`;
    }

    const payload = {
      app_config: {
        app_id: finalAppId,
        app_version: Number(finalAppVersion) || 1,
        connection_config: { connection_id: finalConnectionId, agent_phone_number: formattedAgentPhone },
        app_type: 'agent',
        app_overrides: appOverrides && Object.keys(appOverrides).length > 0 ? appOverrides : undefined,
      },
      user_config: { user_phone_number: formattedUserPhone },
    };

    // Only include agent_variables if explicitly supplied AND not empty
    if (agentVariables && Object.keys(agentVariables).length > 0) {
      payload.app_config.agent_variables = agentVariables;
    }

    // Only attach webhook_config if a valid absolute URL (http:// or https://) is provided
    const rawWebhookUrl = webhookConfig?.url || config.webhookUrl;
    if (rawWebhookUrl && (rawWebhookUrl.startsWith('http://') || rawWebhookUrl.startsWith('https://'))) {
      payload.webhook_config = {
        url: rawWebhookUrl,
        metadata: { leadId: leadId || undefined, timestamp: new Date().toISOString(), ...(webhookConfig?.metadata || {}) },
      };
    }

    const url = `${SARVAM_API_BASE}/outbounds/v1/orgs/${config.orgId}/workspaces/${config.workspaceId}/outbounds`;

    logEvent({ type: 'info', category: 'voice_ai', message: `Initiating Sarvam Outbound Call to ${formattedUserPhone}`, detail: `App: ${finalAppId} v${finalAppVersion}`, meta: { url, payload } });

    const res = await fetch(url, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorDetail = data.error?.data?.details || data.error?.message || data.detail || data.message || `Sarvam API error (${res.status})`;
      logEvent({ type: 'error', category: 'voice_ai', message: `Sarvam Call failed for ${formattedUserPhone}`, detail: errorDetail, meta: { status: res.status, data } });
      throw new Error(errorDetail);
    }

    logEvent({ type: 'info', category: 'voice_ai', message: `Sarvam Call queued. Attempt ID: ${data.attempt_id}`, meta: { attempt_id: data.attempt_id, userPhoneNumber: formattedUserPhone, leadId } });

    return { attempt_id: data.attempt_id, user_phone_number: formattedUserPhone, app_id: finalAppId, status: 'queued', timestamp: new Date().toISOString() };
  }

  async handleWebhookPayload(payload) {
    const { attempt_id, status, duration, interaction_id, failure_reason, webhook_config, interaction_transcript } = payload || {};
    const leadId = webhook_config?.metadata?.leadId;

    logEvent({ type: status === 'failed' ? 'warn' : 'info', category: 'voice_ai', message: `Sarvam Webhook: Attempt ${attempt_id} -> ${status}`, detail: `Duration: ${duration || 0}s${failure_reason ? ` (${failure_reason})` : ''}`, meta: { attempt_id, status, duration, interaction_id, leadId } });

    return { processed: true, attempt_id, status, duration, interaction_id, leadId, transcriptCount: interaction_transcript?.length || 0, timestamp: new Date().toISOString() };
  }

  async getInteractions({ startDatetime, endDatetime, limit = 20, offset = 0, appId = null }) {
    const config = this.getConfig();
    const finalAppId = appId || config.appId;
    if (!finalAppId) throw new Error('Sarvam Agent App ID (app_id) is required to query interactions.');

    const start = startDatetime || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDatetime || new Date().toISOString();

    const query = new URLSearchParams({ start_datetime: start, end_datetime: end, limit: String(limit), offset: String(offset) });
    const url = `${SARVAM_API_BASE}/analytics/v1/${config.orgId}/${config.workspaceId}/${finalAppId}/interactions?${query.toString()}`;

    const res = await fetch(url, { method: 'GET', headers: this.getHeaders() });
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || d.message || `Failed (${res.status})`); }
    return res.json();
  }

  async getTranscript(interactionId, appId = null) {
    const config = this.getConfig();
    const finalAppId = appId || config.appId;
    if (!finalAppId || !interactionId) throw new Error('Both app_id and interaction_id are required.');
    const url = `${SARVAM_API_BASE}/analytics/v1/${config.orgId}/${config.workspaceId}/${finalAppId}/transcripts/${interactionId}`;
    const res = await fetch(url, { method: 'GET', headers: this.getHeaders() });
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || d.message || `Failed (${res.status})`); }
    return res.json();
  }

  async getRecording(interactionId, appId = null) {
    const config = this.getConfig();
    const finalAppId = appId || config.appId;
    if (!finalAppId || !interactionId) throw new Error('Both app_id and interaction_id are required.');
    const url = `${SARVAM_API_BASE}/analytics/v1/${config.orgId}/${config.workspaceId}/${finalAppId}/recordings/${interactionId}`;
    const res = await fetch(url, { method: 'GET', headers: this.getHeaders() });
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || d.message || `Failed (${res.status})`); }
    return res.json();
  }

  /**
   * High-converting product-specific pitch trigger for Practo Prime vs Practo Reach
   */
  async triggerProductPitchCall({ userPhoneNumber, product = 'prime', clinicName = '', doctorName = '', locality = '', city = '', speciality = '', leadId = null }) {
    const isReach = String(product).toLowerCase() === 'reach';
    const docNameClean = doctorName ? doctorName.replace(/^Dr\.?\s*/i, '') : 'Doctor';
    const locClean = locality || city || 'your area';
    const specClean = speciality || 'medical';
    const clinicClean = clinicName || 'your clinic';

    let initialMessage = '';

    if (isReach) {
      initialMessage = `Hello Dr. ${docNameClean}, calling on behalf of Practo Reach for ${clinicClean} in ${locClean}. We currently have the exclusive Position 1 spotlight placement available for ${specClean} searches in ${locClean}. This allows ${clinicClean} to capture 100% of high-intent patients searching in your area before competitor clinics. Would you be open to a 2-minute chat about securing this spotlight position?`;
    } else {
      initialMessage = `Hello Dr. ${docNameClean}, calling from Practo regarding ${clinicClean} in ${locClean}. We are partnering with select ${specClean} clinics to activate Practo Prime, giving you 24/7 instant online booking on Practo, guaranteed patient appointments, and the official Prime Clinic badge with zero software fee. May I share how this boosts your verified patient visits by 35%?`;
    }

    return this.triggerInstantOutbound({
      userPhoneNumber,
      leadId,
      // agent_variables omitted to avoid Sarvam 422 error
      appOverrides: {
        initial_bot_message: initialMessage,
        initial_language_name: 'English',
      },
      webhookConfig: {
        metadata: {
          leadId,
          product: isReach ? 'reach' : 'prime',
          clinicName: clinicClean,
          doctorName: docNameClean,
        },
      },
    });
  }

  async createCampaign(campaignData) {
    const config = this.getConfig();
    const url = `${SARVAM_API_BASE}/scheduling/v1/orgs/${config.orgId}/workspaces/${config.workspaceId}/campaigns`;
    const res = await fetch(url, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(campaignData) });
    if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.detail || d.message || `Failed (${res.status})`); }
    return res.json();
  }
}

export const sarvamVoiceService = new SarvamVoiceService();
