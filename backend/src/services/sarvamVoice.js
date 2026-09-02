import db from '../db/db.js';
import { logEvent } from './logger.js';

const SARVAM_API_BASE = 'https://apps.sarvam.ai/api';

/**
 * Sarvam Voice Agents Configuration & Client Service
 * Workspace Context:
 * - Default Org ID: 01a050ff-9cdc-7d60-8c27-eaf6731df818
 * - Default Workspace ID: 01a050ff-9ce4-74ef-980d-b167c2e3489c
 */
export class SarvamVoiceService {
  constructor() {
    this.defaultOrgId = '01a050ff-9cdc-7d60-8c27-eaf6731df818';
    this.defaultWorkspaceId = '01a050ff-9ce4-74ef-980d-b167c2e3489c';
  }

  getConfig() {
    // 1. Check environment variables
    const envApiKey = process.env.SARVAM_VOICE_API_KEY || '';
    const envOrgId = process.env.SARVAM_ORG_ID || this.defaultOrgId;
    const envWorkspaceId = process.env.SARVAM_WORKSPACE_ID || this.defaultWorkspaceId;
    const envAppId = process.env.SARVAM_AGENT_APP_ID || '';
    const envAppVersion = Number(process.env.SARVAM_AGENT_APP_VERSION) || 1;
    const envConnectionId = process.env.SARVAM_CONNECTION_ID || '';
    const envAgentPhone = process.env.SARVAM_AGENT_PHONE_NUMBER || '';
    const envWebhookUrl = process.env.SARVAM_WEBHOOK_URL || '';

    // 2. Check SQLite api_integrations or app_settings if available
    let dbSecrets = {};
    let dbConfig = {};
    try {
      const row = db.prepare('SELECT secrets, config FROM api_integrations WHERE provider = ?').get('sarvam_voice');
      if (row) {
        dbSecrets = JSON.parse(row.secrets || '{}');
        dbConfig = JSON.parse(row.config || '{}');
      }
    } catch {
      // Table or db might not have the provider row yet
    }

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
      const configJson = JSON.stringify({
        orgId: newOrgId,
        workspaceId: newWorkspaceId,
        appId: newAppId,
        appVersion: newAppVersion,
        connectionId: newConnectionId,
        agentPhoneNumber: newAgentPhone,
        webhookUrl: newWebhookUrl,
      });
      const secretsJson = JSON.stringify({ apiKey: newApiKey });

      if (existing) {
        db.prepare(`
          UPDATE api_integrations 
          SET enabled = ?, status = ?, config = ?, secrets = ?, updated_at = ?
          WHERE provider = ?
        `).run(hasKey ? 1 : 0, status, configJson, secretsJson, ts, 'sarvam_voice');
      } else {
        db.prepare(`
          INSERT INTO api_integrations (id, provider, label, category, enabled, status, config, secrets, notes, updated_at, channel, is_default)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          `sarvam-${Date.now()}`,
          'sarvam_voice',
          'Sarvam Voice Agents',
          'Voice AI',
          hasKey ? 1 : 0,
          status,
          configJson,
          secretsJson,
          'Indus Samvaad Voice Agents integration for Indian healthcare outreach',
          ts,
          'voice_ai',
          1
        );
      }
    } catch (err) {
      console.warn('[SarvamVoiceService] DB save fallback:', err.message);
    }

    return this.getConfig();
  }

  getHeaders() {
    const { apiKey } = this.getConfig();
    return {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    };
  }

  /**
   * Ping / Test Sarvam API credentials
   */
  async testConnection() {
    const config = this.getConfig();
    if (!config.apiKey) {
      return { success: false, message: 'Missing Sarvam Voice API Key (X-API-Key)' };
    }
    if (!config.orgId || !config.workspaceId) {
      return { success: false, message: 'Missing Organization ID or Workspace ID' };
    }

    try {
      const startDatetime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDatetime = new Date().toISOString();
      const testAppId = config.appId || 'test-agent';
      
      const url = `${SARVAM_API_BASE}/analytics/v1/${config.orgId}/${config.workspaceId}/${testAppId}/interactions?start_datetime=${encodeURIComponent(startDatetime)}&end_datetime=${encodeURIComponent(endDatetime)}&limit=1`;
      
      const res = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (res.status === 401 || res.status === 403) {
        return { success: false, status: res.status, message: 'Invalid X-API-Key or unauthorized access to workspace' };
      }

      return {
        success: true,
        status: res.status,
        message: 'Sarvam Voice Agents API credentials verified successfully',
        orgId: config.orgId,
        workspaceId: config.workspaceId,
        appId: config.appId,
      };
    } catch (err) {
      return { success: false, message: `Network error connecting to Sarvam API: ${err.message}` };
    }
  }

  /**
   * Place an Instant Outbound Call via Sarvam Voice Agents
   * POST https://apps.sarvam.ai/api/outbounds/v1/orgs/{org_id}/workspaces/{workspace_id}/outbounds
   */
  async triggerInstantOutbound({
    userPhoneNumber,
    agentVariables = {},
    appOverrides = {},
    webhookConfig = null,
    leadId = null,
    appId = null,
    appVersion = null,
    connectionId = null,
    agentPhoneNumber = null,
  }) {
    const config = this.getConfig();
    const finalAppId = appId || config.appId;
    const finalAppVersion = appVersion || config.appVersion;
    const finalConnectionId = connectionId || config.connectionId;
    const finalAgentPhone = agentPhoneNumber || config.agentPhoneNumber;

    if (!config.apiKey) {
      throw new Error('Sarvam Voice API Key is not configured. Please set SARVAM_VOICE_API_KEY or configure in Settings.');
    }
    if (!finalAppId) {
      throw new Error('Sarvam Agent App ID (app_id) is required to place a call.');
    }
    if (!finalConnectionId || !finalAgentPhone) {
      throw new Error('Sarvam Telephony Connection ID and Agent Phone Number are required.');
    }
    if (!userPhoneNumber) {
      throw new Error('Target recipient user_phone_number is required (e.g. +9198XXXXXXXX).');
    }

    // Format phone number to E.164 if missing '+'
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
        connection_config: {
          connection_id: finalConnectionId,
          agent_phone_number: formattedAgentPhone,
        },
        agent_variables: agentVariables && Object.keys(agentVariables).length > 0 ? agentVariables : undefined,
        app_type: 'agent',
        app_overrides: appOverrides && Object.keys(appOverrides).length > 0 ? appOverrides : undefined,
      },
      user_config: {
        user_phone_number: formattedUserPhone,
      },
    };

    if (webhookConfig?.url || config.webhookUrl) {
      payload.webhook_config = {
        url: webhookConfig?.url || config.webhookUrl,
        metadata: {
          leadId: leadId || undefined,
          timestamp: new Date().toISOString(),
          ...(webhookConfig?.metadata || {}),
        },
      };
    }

    const url = `${SARVAM_API_BASE}/outbounds/v1/orgs/${config.orgId}/workspaces/${config.workspaceId}/outbounds`;

    logEvent({
      type: 'info',
      category: 'voice_ai',
      message: `Initiating Sarvam Instant Outbound Call to ${formattedUserPhone}`,
      detail: `App: ${finalAppId} v${finalAppVersion}, Connection: ${finalConnectionId}`,
      meta: { url, payload },
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.detail || data.message || `Sarvam API error (${res.status})`;
      logEvent({
        type: 'error',
        category: 'voice_ai',
        message: `Sarvam Instant Outbound Call failed for ${formattedUserPhone}`,
        detail: errorMsg,
        meta: { status: res.status, data },
      });
      throw new Error(errorMsg);
    }

    logEvent({
      type: 'info',
      category: 'voice_ai',
      message: `Sarvam Outbound Call queued. Attempt ID: ${data.attempt_id}`,
      meta: { attempt_id: data.attempt_id, userPhoneNumber: formattedUserPhone, leadId },
    });

    return {
      attempt_id: data.attempt_id,
      user_phone_number: formattedUserPhone,
      app_id: finalAppId,
      status: 'queued',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Process post-call callback webhook from Sarvam Voice Agents
   */
  async handleWebhookPayload(payload) {
    const {
      attempt_id,
      status,
      channel_info,
      duration,
      interaction_id,
      failure_reason,
      final_agent_variables,
      webhook_config,
      interaction_transcript,
    } = payload || {};

    const leadId = webhook_config?.metadata?.leadId;

    logEvent({
      type: status === 'failed' ? 'warn' : 'info',
      category: 'voice_ai',
      message: `Sarvam Webhook Received: Attempt ${attempt_id} -> ${status}`,
      detail: `Duration: ${duration || 0}s, Interaction: ${interaction_id || 'N/A'}${failure_reason ? ` (${failure_reason})` : ''}`,
      meta: { attempt_id, status, duration, interaction_id, leadId },
    });

    return {
      processed: true,
      attempt_id,
      status,
      duration,
      interaction_id,
      leadId,
      transcriptCount: interaction_transcript?.length || 0,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Fetch paginated interactions from Sarvam Analytics API
   * GET https://apps.sarvam.ai/api/analytics/v1/{org_id}/{workspace_id}/{app_id}/interactions
   */
  async getInteractions({ startDatetime, endDatetime, limit = 20, offset = 0, appId = null }) {
    const config = this.getConfig();
    const finalAppId = appId || config.appId;
    if (!finalAppId) {
      throw new Error('Sarvam Agent App ID (app_id) is required to query interactions.');
    }

    const start = startDatetime || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const end = endDatetime || new Date().toISOString();

    const query = new URLSearchParams({
      start_datetime: start,
      end_datetime: end,
      limit: String(limit),
      offset: String(offset),
    });

    const url = `${SARVAM_API_BASE}/analytics/v1/${config.orgId}/${config.workspaceId}/${finalAppId}/interactions?${query.toString()}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `Failed to fetch interactions (${res.status})`);
    }

    return res.json();
  }

  /**
   * Fetch full transcript for an interaction
   * GET https://apps.sarvam.ai/api/analytics/v1/{org_id}/{workspace_id}/{app_id}/transcripts/{interaction_id}
   */
  async getTranscript(interactionId, appId = null) {
    const config = this.getConfig();
    const finalAppId = appId || config.appId;
    if (!finalAppId || !interactionId) {
      throw new Error('Both app_id and interaction_id are required to fetch transcripts.');
    }

    const url = `${SARVAM_API_BASE}/analytics/v1/${config.orgId}/${config.workspaceId}/${finalAppId}/transcripts/${interactionId}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `Failed to fetch transcript (${res.status})`);
    }

    return res.json();
  }

  /**
   * Fetch recording URL for an interaction
   * GET https://apps.sarvam.ai/api/analytics/v1/{org_id}/{workspace_id}/{app_id}/recordings/{interaction_id}
   */
  async getRecording(interactionId, appId = null) {
    const config = this.getConfig();
    const finalAppId = appId || config.appId;
    if (!finalAppId || !interactionId) {
      throw new Error('Both app_id and interaction_id are required to fetch recordings.');
    }

    const url = `${SARVAM_API_BASE}/analytics/v1/${config.orgId}/${config.workspaceId}/${finalAppId}/recordings/${interactionId}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `Failed to fetch recording (${res.status})`);
    }

    return res.json();
  }

  /**
   * Schedule a Batch Campaign with retry rules and schedule constraints
   * POST https://apps.sarvam.ai/api/scheduling/v1/orgs/{org_id}/workspaces/{workspace_id}/campaigns
   */
  async createCampaign(campaignData) {
    const config = this.getConfig();
    const url = `${SARVAM_API_BASE}/scheduling/v1/orgs/${config.orgId}/workspaces/${config.workspaceId}/campaigns`;

    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(campaignData),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || `Failed to create campaign (${res.status})`);
    }

    return res.json();
  }
}

export const sarvamVoiceService = new SarvamVoiceService();
