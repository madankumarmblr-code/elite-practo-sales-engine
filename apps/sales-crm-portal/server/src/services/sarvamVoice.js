import { store } from '../db/store.js';

const SARVAM_API_BASE = 'https://apps.sarvam.ai/api';

/**
 * Sarvam Voice Agents Client Service for Apex Sales CRM Portal
 * Scoped to Organization: 01a050ff-9cdc-7d60-8c27-eaf6731df818
 * Scoped to Workspace: 01a050ff-9ce4-74ef-980d-b167c2e3489c
 */
export class SarvamVoiceService {
  constructor() {
    this.defaultOrgId = '01a050ff-9cdc-7d60-8c27-eaf6731df818';
    this.defaultWorkspaceId = '01a050ff-9ce4-74ef-980d-b167c2e3489c';
  }

  getConfig() {
    const envApiKey = process.env.SARVAM_VOICE_API_KEY || 'sk_samvaad_0bipkd90_6bna8CJte1KQ3OsdkssedGXc';
    const envOrgId = process.env.SARVAM_ORG_ID || '01a050ff-9cdc-7d60-8c27-eaf6731df818';
    const envWorkspaceId = process.env.SARVAM_WORKSPACE_ID || '01a050ff-9ce4-74ef-980d-b167c2e3489c';
    const envAppId = process.env.SARVAM_AGENT_APP_ID || 'Conversatio-852345bd-c05f';
    const envAppVersion = Number(process.env.SARVAM_AGENT_APP_VERSION) || 1;
    const envConnectionId = process.env.SARVAM_CONNECTION_ID || '9371c846-11-436db30b-3927';
    const envAgentPhone = process.env.SARVAM_AGENT_PHONE_NUMBER || '+918071579481';
    const envWebhookUrl = process.env.SARVAM_WEBHOOK_URL || '/api/sarvam/webhook';

    const stored = store.data.integrations?.sarvam_voice || {};

    return {
      apiKey: stored.apiKey || envApiKey,
      orgId: stored.orgId || envOrgId,
      workspaceId: stored.workspaceId || envWorkspaceId,
      appId: stored.appId || envAppId,
      appVersion: Number(stored.appVersion) || envAppVersion,
      connectionId: stored.connectionId || envConnectionId,
      agentPhoneNumber: stored.agentPhoneNumber || envAgentPhone,
      webhookUrl: stored.webhookUrl || envWebhookUrl,
    };
  }

  saveConfig(updates = {}) {
    const current = this.getConfig();
    const rawApiKey = (updates.apiKey || '').trim();
    // Only update apiKey if a real new key is provided (not masked)
    const newApiKey = rawApiKey && !rawApiKey.startsWith('••••') ? rawApiKey : current.apiKey;

    const newConfig = {
      apiKey: newApiKey,
      orgId: (updates.orgId || current.orgId || '').trim(),
      workspaceId: (updates.workspaceId || current.workspaceId || '').trim(),
      appId: (updates.appId !== undefined ? updates.appId : current.appId || '').trim(),
      appVersion: updates.appVersion ? Number(updates.appVersion) : (current.appVersion || 1),
      connectionId: (updates.connectionId !== undefined ? updates.connectionId : current.connectionId || '').trim(),
      agentPhoneNumber: (updates.agentPhoneNumber !== undefined ? updates.agentPhoneNumber : current.agentPhoneNumber || '').trim(),
      webhookUrl: (updates.webhookUrl !== undefined ? updates.webhookUrl : current.webhookUrl || '').trim(),
      updatedAt: new Date().toISOString(),
    };

    if (!store.data.integrations) store.data.integrations = {};
    store.data.integrations.sarvam_voice = newConfig;
    store.persist();

    return this.getConfig();
  }

  getHeaders() {
    const { apiKey } = this.getConfig();
    return {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    };
  }

  async testConnection() {
    const config = this.getConfig();
    if (!config.apiKey) {
      return { success: false, status: 400, message: 'Missing Sarvam Voice API Key (X-API-Key). Please enter your key in Integrations.' };
    }
    if (!config.orgId || !config.workspaceId) {
      return { success: false, status: 400, message: 'Missing Organization ID or Workspace ID' };
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
        return { success: false, status: res.status, message: 'Authentication failed: Invalid X-API-Key or unauthorized access to workspace' };
      }

      return {
        success: true,
        status: res.status,
        message: 'Sarvam Voice Agents API Key verified & connected successfully',
        orgId: config.orgId,
        workspaceId: config.workspaceId,
        appId: config.appId || 'Configured',
        connectionId: config.connectionId || 'Pending (Optional for Outbound Dialing)',
      };
    } catch (err) {
      return { success: false, message: `Network error connecting to Sarvam API: ${err.message}` };
    }
  }

  /**
   * Trigger Instant Outbound Call via Sarvam Voice Agents
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
      throw new Error('Sarvam Voice API Key is not configured. Set SARVAM_VOICE_API_KEY or configure in Integrations.');
    }
    if (!finalAppId) {
      throw new Error('Sarvam Agent App ID (app_id) is required to place a call.');
    }
    if (!finalConnectionId || !finalAgentPhone) {
      throw new Error('Sarvam Telephony Connection ID and Agent Phone Number are required.');
    }
    if (!userPhoneNumber) {
      throw new Error('Target recipient user_phone_number is required.');
    }

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

    store.logAudit({
      action: 'SARVAM_OUTBOUND_CALL_INITIATED',
      entity: `Dialing ${formattedUserPhone} with Agent ${finalAppId}`,
      user: 'Sarvam Voice AI',
      ip: 'CRM-Server',
      category: 'OUTREACH',
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.detail || data.message || `Sarvam API error (${res.status})`;
      throw new Error(errorMsg);
    }

    // Attach timeline event to lead if lead exists
    if (leadId) {
      const lead = store.getLeadById(leadId);
      if (lead) {
        if (!lead.timeline) lead.timeline = [];
        lead.timeline.unshift({
          id: `act-${Date.now()}`,
          type: 'voice_call',
          title: 'Sarvam AI Voice Call Initiated',
          description: `Dialing ${formattedUserPhone} via Sarvam Voice Agent (${finalAppId}). Attempt ID: ${data.attempt_id}`,
          timestamp: new Date().toISOString(),
          user: 'Sarvam Voice AI',
          metadata: { attempt_id: data.attempt_id, app_id: finalAppId },
        });
        store.updateLead(leadId, { timeline: lead.timeline });
      }
    }

    return {
      attempt_id: data.attempt_id,
      user_phone_number: formattedUserPhone,
      app_id: finalAppId,
      status: 'queued',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Handle Webhook callback
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

    if (leadId) {
      const lead = store.getLeadById(leadId);
      if (lead) {
        if (!lead.timeline) lead.timeline = [];
        lead.timeline.unshift({
          id: `act-${Date.now()}`,
          type: 'voice_call_completed',
          title: `Sarvam Call Outcome: ${status.toUpperCase()}`,
          description: `Call ${status}. Duration: ${duration ? `${duration}s` : 'N/A'}.${failure_reason ? ` Reason: ${failure_reason}` : ''}`,
          timestamp: new Date().toISOString(),
          user: 'Sarvam Webhook',
          metadata: {
            attempt_id,
            interaction_id,
            duration,
            status,
            transcriptCount: interaction_transcript?.length || 0,
            variables: final_agent_variables,
          },
        });

        // If call was connected and positive outcome, progress stage
        const updates = { timeline: lead.timeline };
        if (status === 'connected') {
          if (lead.stage === 'New Lead') {
            updates.stage = 'Contacted';
            updates.status = 'In Progress';
          }
        }
        store.updateLead(leadId, updates);
      }
    }

    store.logAudit({
      action: 'SARVAM_WEBHOOK_PROCESSED',
      entity: `Attempt ${attempt_id} outcome: ${status} (Duration: ${duration || 0}s)`,
      user: 'Sarvam Webhook',
      ip: 'Sarvam-Cloud',
      category: 'OUTREACH',
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

  async getInteractions({ startDatetime, endDatetime, limit = 20, offset = 0, appId = null }) {
    const config = this.getConfig();
    const finalAppId = appId || config.appId;
    if (!finalAppId) {
      throw new Error('Sarvam Agent App ID (app_id) is required to fetch interactions.');
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

  async getTranscript(interactionId, appId = null) {
    const config = this.getConfig();
    const finalAppId = appId || config.appId;
    if (!finalAppId || !interactionId) {
      throw new Error('Both app_id and interaction_id are required.');
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

  async getRecording(interactionId, appId = null) {
    const config = this.getConfig();
    const finalAppId = appId || config.appId;
    if (!finalAppId || !interactionId) {
      throw new Error('Both app_id and interaction_id are required.');
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
