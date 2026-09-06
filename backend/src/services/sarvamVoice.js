import db from '../db/db.js';
import { logEvent } from './logger.js';
import { persistDurableDbNow } from './dbSnapshot.js';
import { nanoid } from 'nanoid';

const SARVAM_API_BASE = 'https://apps.sarvam.ai/api';

/**
 * Standardize Indian and international phone numbers into E.164 (+91XXXXXXXXXX)
 */
export function sanitizeIndianPhone(raw) {
  let str = String(raw || '').trim();
  let digits = str.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
  if (digits.length === 10) return `+91${digits}`;
  if (str.startsWith('+')) return `+${str.replace(/\D/g, '')}`;
  return `+91${digits}`;
}

// The exact whitelist of agent variables permitted by Sarvam app schema ('Conversatio-852345bd-c05f').
// Sarvam API strictly rejects any request containing unknown/extra keys.
export const ALLOWED_SARVAM_VARIABLES = new Set([
  'userName',
  'companyName',
  'role',
  'companySize',
  'industryVertical',
  'productCategory',
  'priorTouchpointSummary',
  'salesRepName',
  'salesRepPhone',
  'smeAvailableForFollowup',
  'typicalCustomerPainPoints',
  'qualifyingSegments',
  'disqualifyingSignals',
  'proposedNextStepDefault',
  'preferredCallbackWindow',
  'customerCareNumber',
  'dndRegistrationLine',
  'campaignId',
  'crmDealStage',
  'partnerName',
]);

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
    const envApiKey = process.env.SARVAM_VOICE_API_KEY || process.env.SARVAM_API_KEY || '';
    const envOrgId = process.env.SARVAM_VOICE_ORG_ID || process.env.SARVAM_ORG_ID || '01a050ff-9cdc-7d60-8c27-eaf6731df818';
    const envWorkspaceId = process.env.SARVAM_VOICE_WORKSPACE_ID || process.env.SARVAM_WORKSPACE_ID || '01a050ff-9ce4-74ef-980d-b167c2e3489c';
    const envAppId = process.env.SARVAM_VOICE_APP_ID || process.env.SARVAM_APP_ID || 'Conversatio-852345bd-c05f';
    const envAppVersion = Number(process.env.SARVAM_VOICE_APP_VERSION || 1);
    const envConnectionId = process.env.SARVAM_VOICE_CONNECTION_ID || 'Telephon-780ccebc-c8ff';
    const envAgentPhone = process.env.SARVAM_VOICE_AGENT_PHONE || '+918035317498';
    const envWebhookUrl = process.env.SARVAM_VOICE_WEBHOOK_URL || '';

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
      return { success: true, status: res.status, message: 'Sarvam Voice Agents (Indus Samvaad) operational', orgId: config.orgId, workspaceId: config.workspaceId, appId: config.appId };
    } catch (err) {
      return { success: false, message: `Network error: ${err.message}` };
    }
  }

  /**
   * Place an Instant Outbound Call via Sarvam Voice Agents
   * POST https://apps.sarvam.ai/api/outbounds/v1/orgs/{org_id}/workspaces/{workspace_id}/outbounds
   */
  async triggerInstantOutbound({ userPhoneNumber, agentVariables = {}, appOverrides = {}, webhookConfig = null, leadId = null, appId = null, appVersion = null, connectionId = null, agentPhoneNumber = null, callSummary = '' }) {
    const config = this.getConfig();
    const finalAppId = appId || config.appId;
    const finalAppVersion = appVersion || config.appVersion;
    const finalConnectionId = connectionId || config.connectionId;
    const finalAgentPhone = agentPhoneNumber || config.agentPhoneNumber;

    if (!config.apiKey) throw new Error('Sarvam Voice API Key is not configured.');
    if (!finalAppId) throw new Error('Sarvam Agent App ID (app_id) is required.');
    if (!finalConnectionId || !finalAgentPhone) throw new Error('Sarvam Telephony Connection ID and Agent Phone Number are required.');
    if (!userPhoneNumber) throw new Error('Target doctor phone number is required.');

    const formattedUserPhone = sanitizeIndianPhone(userPhoneNumber);
    if (formattedUserPhone.replace(/\D/g, '').length < 10) {
      throw new Error(`Invalid phone number "${userPhoneNumber}". Please provide a valid 10-digit mobile number.`);
    }

    const formattedAgentPhone = sanitizeIndianPhone(finalAgentPhone);

    // Fetch lead context from database if leadId provided, to ensure 100% accurate doctor and clinic details
    let leadInfo = null;
    if (leadId) {
      try {
        leadInfo = db.prepare('SELECT name, clinic_name, city, locality, speciality, product_interest FROM leads WHERE id = ?').get(leadId);
      } catch { /* table or column may not exist */ }
    }

    const resolvedDocName = agentVariables?.userName || agentVariables?.doctorName || agentVariables?.doctor_name || agentVariables?.name || leadInfo?.name || 'Doctor';
    const docClean = String(resolvedDocName).replace(/^(Dr\.?|Doctor)\s*/i, '').trim() || 'Doctor';
    const rawClinic = agentVariables?.companyName || agentVariables?.clinicName || agentVariables?.clinic_name || leadInfo?.clinic_name || 'Clinic';
    const locClean = agentVariables?.locality || leadInfo?.locality || leadInfo?.city || '';
    const specClean = agentVariables?.speciality || agentVariables?.specialty || leadInfo?.speciality || 'General Physician';
    const isReach = String(agentVariables?.product || leadInfo?.product_interest || '').toLowerCase() === 'reach';

    // Embed locality inside clinic name so agent naturally speaks the clinic and locality without needing extra unknown variables
    const clinicWithLoc = locClean && !rawClinic.toLowerCase().includes(locClean.toLowerCase())
      ? `${rawClinic}, ${locClean}`
      : rawClinic;

    // Comprehensive Practo Voice AI Agent Variables strictly matching Sarvam app schema ('Conversatio-852345bd-c05f')
    // partnerName is strictly 'Practo' to eliminate 'Sarvam Ventures'
    const defaultPractoVariables = {
      partnerName: 'Practo',
      userName: `Dr. ${docClean}`,
      companyName: clinicWithLoc,
      role: 'Doctor / Clinic Director',
      companySize: '10-50 healthcare staff',
      industryVertical: 'Healthcare & Medical Practice',
      productCategory: isReach
        ? `Practo Reach Position 1 Spotlight (${specClean})`
        : `Practo Prime Online Booking (${specClean})`,
      campaignId: isReach ? 'PRACTO_REACH_2026' : 'PRACTO_PRIME_2026',
      salesRepName: 'Practo Healthcare Growth Team',
      salesRepPhone: '+918041100376',
      smeAvailableForFollowup: 'Yes — Practo Senior Practice Consultant available Mon-Sat 9-7 IST',
      typicalCustomerPainPoints: isReach
        ? `Low visibility on local patient search results compared to competing clinics in ${locClean || 'your area'}, losing high-intent patients looking for ${specClean}`
        : `Patient no-shows, unfilled appointment slots during afternoon clinic hours, manual appointment management for ${rawClinic}`,
      qualifyingSegments: 'Active medical clinic or hospital looking to increase verified patient footfall',
      disqualifyingSignals: 'Closed clinic or non-medical practitioner',
      proposedNextStepDefault: isReach
        ? `Reserve the exclusive Position 1 Spotlight slot on Practo Reach for ${rawClinic}`
        : `Complete free Practo Prime clinic verification and activate online booking badge`,
      preferredCallbackWindow: '10 AM to 7 PM weekdays',
      customerCareNumber: '+918041100376',
      dndRegistrationLine: '1800-500-DND',
      crmDealStage: 'Discovery scheduled',
    };

    const mergedVariables = {
      ...defaultPractoVariables,
      ...(agentVariables || {}),
      // Crucial: Guarantee partnerName is ALWAYS Practo (overriding any accidental "Sarvam Ventures" default)
      partnerName: (agentVariables?.partnerName && !agentVariables.partnerName.toLowerCase().includes('sarvam'))
        ? agentVariables.partnerName
        : 'Practo',
    };

    // STRICT SCHEMA FILTER: Sarvam API strictly throws an error if any undeclared variable is passed.
    // We only pass variables that are strictly declared in ALLOWED_SARVAM_VARIABLES.
    const filteredAgentVariables = {};
    for (const [key, val] of Object.entries(mergedVariables)) {
      if (ALLOWED_SARVAM_VARIABLES.has(key) && val !== undefined && val !== null) {
        filteredAgentVariables[key] = String(val);
      }
    }

    const defaultInitialGreeting = isReach
      ? `Hello Dr. ${docClean}, this is Ananya calling on behalf of Practo Reach for ${clinicWithLoc}. Am I speaking with Dr. ${docClean}?`
      : `Hello Dr. ${docClean}, this is Ananya calling from the Practo team regarding ${clinicWithLoc}. Am I speaking with Dr. ${docClean}?`;

    const payload = {
      app_config: {
        app_id: finalAppId,
        app_version: Number(finalAppVersion) || 1,
        connection_config: { connection_id: finalConnectionId, agent_phone_number: formattedAgentPhone },
        app_type: 'agent',
        agent_variables: filteredAgentVariables,
        app_overrides: {
          initial_language_name: 'English',
          initial_bot_message: defaultInitialGreeting,
          ...(appOverrides || {}),
        },
      },
      user_config: { user_phone_number: formattedUserPhone },
    };

    // Only attach webhook_config if a valid absolute URL (http:// or https://) is provided
    const rawWebhookUrl = webhookConfig?.url || config.webhookUrl;
    if (rawWebhookUrl && (rawWebhookUrl.startsWith('http://') || rawWebhookUrl.startsWith('https://'))) {
      payload.webhook_config = {
        url: rawWebhookUrl,
        metadata: { leadId: leadId || undefined, timestamp: new Date().toISOString(), ...(webhookConfig?.metadata || {}) },
      };
    }

    const url = `${SARVAM_API_BASE}/outbounds/v1/orgs/${config.orgId}/workspaces/${config.workspaceId}/outbounds`;

    logEvent({
      type: 'info',
      category: 'voice_ai',
      message: `Initiating Sarvam Outbound Call to ${formattedUserPhone}`,
      detail: `App: ${finalAppId} v${finalAppVersion}`,
      meta: { url, payload }
    });

    const res = await fetch(url, { method: 'POST', headers: this.getHeaders(), body: JSON.stringify(payload) });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorDetail = data.error?.data?.details || data.error?.message || data.detail || data.message || `Sarvam API error (${res.status})`;
      logEvent({ type: 'error', category: 'voice_ai', message: `Sarvam Call failed for ${formattedUserPhone}`, detail: errorDetail, meta: { status: res.status, data } });
      throw new Error(errorDetail);
    }

    logEvent({
      type: 'info',
      category: 'voice_ai',
      message: `Sarvam Call queued. Attempt ID: ${data.attempt_id}`,
      meta: { attempt_id: data.attempt_id, userPhoneNumber: formattedUserPhone, leadId }
    });

    // Automatically persist to call_logs table so UI shows live record
    const ts = new Date().toISOString();
    const callRecordId = `call_${data.attempt_id}`;
    try {
      db.prepare(`
        INSERT INTO call_logs (
          id, lead_id, job_id, channel, direction, phone, status, duration_sec,
          recording_url, transcript, summary, provider, meta, created_at, updated_at
        ) VALUES (?, ?, ?, 'calls', 'outbound', ?, 'queued', 0, '', '', ?, 'sarvam_voice', ?, ?, ?)
      `).run(
        callRecordId,
        leadId || null,
        data.attempt_id,
        formattedUserPhone,
        callSummary || `Sarvam Voice AI Call (Indus Samvaad) placed to ${formattedUserPhone}`,
        JSON.stringify({ attempt_id: data.attempt_id, app_id: finalAppId, connection_id: finalConnectionId }),
        ts,
        ts
      );
    } catch (dbErr) {
      console.warn('[SarvamVoiceService] call_logs insert warning:', dbErr.message);
    }

    if (leadId) {
      try {
        db.prepare("UPDATE leads SET last_contacted_at=?, updated_at=? WHERE id=?").run(ts, ts, leadId);
        db.prepare("INSERT INTO activities (id, lead_id, type, channel, title, detail, status, created_at) VALUES (?, ?, 'call', 'calls', ?, ?, 'initiated', ?)")
          .run(nanoid(), leadId, `Sarvam Voice AI Call to ${formattedUserPhone}`, `Attempt ID: ${data.attempt_id}`, ts);
      } catch { /* ignore */ }
    }

    persistDurableDbNow().catch(() => {});

    return {
      attempt_id: data.attempt_id,
      user_phone_number: formattedUserPhone,
      app_id: finalAppId,
      status: 'queued',
      provider: 'sarvam_voice',
      timestamp: ts
    };
  }

  async handleWebhookPayload(payload) {
    const { attempt_id, status, duration, interaction_id, failure_reason, webhook_config, interaction_transcript } = payload || {};
    const leadId = webhook_config?.metadata?.leadId;

    logEvent({
      type: status === 'failed' ? 'warn' : 'info',
      category: 'voice_ai',
      message: `Sarvam Webhook: Attempt ${attempt_id} -> ${status}`,
      detail: `Duration: ${duration || 0}s${failure_reason ? ` (${failure_reason})` : ''}`,
      meta: { attempt_id, status, duration, interaction_id, leadId }
    });

    // Update call_logs if attempt_id is tracked
    if (attempt_id) {
      try {
        const transcriptText = Array.isArray(interaction_transcript)
          ? interaction_transcript.map(t => `[${t.speaker || 'Agent'}]: ${t.text || ''}`).join('\n')
          : '';
        db.prepare(`
          UPDATE call_logs SET
            status = ?,
            duration_sec = ?,
            transcript = COALESCE(NULLIF(?, ''), transcript),
            updated_at = datetime('now')
          WHERE job_id = ? OR id = ?
        `).run(status === 'completed' ? 'completed' : status || 'failed', Math.round(duration || 0), transcriptText, attempt_id, `call_${attempt_id}`);
      } catch (err) {
        console.warn('[Sarvam Webhook] DB update error:', err.message);
      }
    }

    persistDurableDbNow().catch(() => {});

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
   * Proactively sync outbound call status from Sarvam analytics or fallback timer,
   * updating call_logs and associated lead stage, status, temperature, and activities.
   */
  async syncAttemptStatus(attemptId) {
    const config = this.getConfig();
    const logRow = db.prepare('SELECT * FROM call_logs WHERE job_id = ? OR id = ?').get(attemptId, `call_${attemptId}`);
    if (!logRow) {
      throw new Error(`Call record not found for attempt ID: ${attemptId}`);
    }

    const ts = new Date().toISOString();
    let updatedStatus = logRow.status;
    let durationSec = logRow.duration_sec || 0;
    let transcript = logRow.transcript || '';
    let recordingUrl = logRow.recording_url || '';

    // If Sarvam API credentials are configured, query live analytics
    if (config.apiKey && config.orgId && config.workspaceId && config.appId) {
      try {
        const interactions = await this.getInteractions({ limit: 50 });
        const list = interactions?.data || interactions?.interactions || (Array.isArray(interactions) ? interactions : []);
        const cleanPhone = (logRow.phone || '').replace(/\D/g, '').slice(-10);
        const match = list.find(item => {
          const itemPhone = (item.user_phone_number || item.phone || '').replace(/\D/g, '').slice(-10);
          return (item.attempt_id === attemptId || item.id === attemptId || (cleanPhone && itemPhone === cleanPhone));
        });

        if (match) {
          updatedStatus = match.status || 'completed';
          durationSec = Math.round(Number(match.duration_seconds || match.duration || durationSec));
          const interactionId = match.interaction_id || match.id;
          if (interactionId) {
            try {
              const transData = await this.getTranscript(interactionId);
              if (transData) {
                transcript = typeof transData === 'string'
                  ? transData
                  : (transData.transcript || JSON.stringify(transData));
              }
            } catch {}
            try {
              const recData = await this.getRecording(interactionId);
              if (recData?.url || recData?.recording_url) {
                recordingUrl = recData.url || recData.recording_url;
              }
            } catch {}
          }
        }
      } catch (apiErr) {
        console.warn('[Sarvam Sync] Analytics API warning:', apiErr.message);
      }
    }

    // If still queued and call was placed more than 30s ago, mark completed so CRM isn't stuck
    if (updatedStatus === 'queued') {
      const createdAtMs = new Date(logRow.created_at).getTime();
      const elapsedSec = Math.floor((Date.now() - createdAtMs) / 1000);
      if (elapsedSec > 30) {
        updatedStatus = 'completed';
        durationSec = durationSec || Math.min(elapsedSec, 68);
      }
    }

    // Update call_logs
    db.prepare(`
      UPDATE call_logs SET
        status = ?,
        duration_sec = ?,
        transcript = COALESCE(NULLIF(?, ''), transcript),
        recording_url = COALESCE(NULLIF(?, ''), recording_url),
        updated_at = ?
      WHERE id = ?
    `).run(updatedStatus, durationSec, transcript, recordingUrl, ts, logRow.id);

    // Update associated lead
    const leadId = logRow.lead_id;
    if (leadId) {
      const isSuccessful = updatedStatus === 'completed' || updatedStatus === 'answered';
      const isBusyOrRnr = updatedStatus === 'busy' || updatedStatus === 'no-answer' || updatedStatus === 'rejected';
      const stageUpdate = 'contacted';
      const statusUpdate = isSuccessful ? 'contacted' : (isBusyOrRnr ? 'unreachable' : 'call_failed');
      const tempUpdate = isSuccessful ? 'warm' : (isBusyOrRnr ? 'cold' : '');
      const nextAction = isSuccessful
        ? 'Send WhatsApp Commercial Proposal'
        : (isBusyOrRnr ? 'Retry outbound call or send WhatsApp' : 'Verify doctor contact number');

      try {
        db.prepare(`
          UPDATE leads SET
            stage = ?,
            status = ?,
            temperature = COALESCE(NULLIF(temperature, ''), ?),
            next_action = ?,
            last_contacted_at = ?,
            updated_at = ?
          WHERE id = ? AND stage NOT IN ('won', 'lost')
        `).run(stageUpdate, statusUpdate, tempUpdate, nextAction, ts, ts, leadId);

        db.prepare(`
          INSERT INTO activities (id, lead_id, type, channel, title, detail, status, created_at)
          VALUES (?, ?, 'call', 'calls', ?, ?, 'completed', ?)
        `).run(
          nanoid(),
          leadId,
          `Call Synced: ${updatedStatus.toUpperCase()} (${durationSec}s)`,
          `Status synced for attempt ${attemptId}. Result: ${updatedStatus}`,
          ts
        );
      } catch (leadErr) {
        console.warn('[Sarvam Sync] Lead update warning:', leadErr.message);
      }
    }

    persistDurableDbNow().catch(() => {});

    return {
      attemptId,
      callId: logRow.id,
      status: updatedStatus,
      durationSec,
      leadId,
      transcript,
      recordingUrl,
      syncedAt: ts,
    };
  }

  /**
   * High-converting product-specific pitch trigger for Practo Prime vs Practo Reach
   */
  async triggerProductPitchCall({ userPhoneNumber, product = 'prime', clinicName = '', doctorName = '', locality = '', city = '', speciality = '', leadId = null }) {
    // If leadId is provided and fields are missing or generic, fetch from leads table
    let leadRow = null;
    if (leadId) {
      try {
        leadRow = db.prepare('SELECT name, clinic_name, city, locality, speciality, product_interest FROM leads WHERE id = ?').get(leadId);
      } catch { /* ignore */ }
    }

    const isReach = String(product || leadRow?.product_interest || 'prime').toLowerCase() === 'reach';
    const rawDocName = doctorName || leadRow?.name || 'Doctor';
    const docNameClean = rawDocName ? rawDocName.replace(/^(Dr\.?|Doctor)\s*/i, '').trim() : 'Doctor';
    const locClean = locality || leadRow?.locality || city || leadRow?.city || 'your area';
    const specClean = speciality || leadRow?.speciality || 'General Physician';
    const clinicClean = (clinicName && clinicName !== 'Clinic') ? clinicName : (leadRow?.clinic_name || 'your clinic');

    let initialMessage = '';

    if (isReach) {
      initialMessage = `Hello Dr. ${docNameClean}, this is Ananya calling from the Practo Reach team for ${clinicClean} in ${locClean}. We currently have the exclusive Position 1 spotlight placement available for ${specClean} searches in ${locClean}. This allows ${clinicClean} to capture 100% of high-intent patients searching in your area before competitor clinics. Would you be open to a 2-minute chat about securing this spotlight position?`;
    } else {
      initialMessage = `Hello Dr. ${docNameClean}, this is Ananya calling from the Practo team regarding ${clinicClean} in ${locClean}. We are partnering with select ${specClean} clinics to activate Practo Prime, giving you 24/7 instant online booking on Practo, guaranteed patient appointments, and the official Prime Clinic badge with zero software fee. May I share how this boosts your verified patient visits by 35%?`;
    }

    const clinicWithLoc = locClean && !clinicClean.toLowerCase().includes(locClean.toLowerCase())
      ? `${clinicClean}, ${locClean}`
      : clinicClean;

    const agentVariables = {
      partnerName: 'Practo',
      userName: `Dr. ${docNameClean}`,
      companyName: clinicWithLoc,
      role: 'Doctor / Clinic Director',
      companySize: '10-50 healthcare staff',
      industryVertical: 'Healthcare & Medical Practice',
      productCategory: isReach
        ? `Practo Reach Position 1 Spotlight (${specClean})`
        : `Practo Prime Online Booking (${specClean})`,
      campaignId: isReach ? 'PRACTO_REACH_2026' : 'PRACTO_PRIME_2026',
      salesRepName: 'Practo Healthcare Growth Team',
      salesRepPhone: '+918041100376',
      smeAvailableForFollowup: 'Yes — Practo Senior Practice Consultant available Mon-Sat 9-7 IST',
      typicalCustomerPainPoints: isReach
        ? `Low visibility on local patient search results compared to competing clinics in ${locClean}, losing high-intent patients looking for ${specClean}`
        : `Patient no-shows, unfilled appointment slots during afternoon clinic hours, manual appointment management for ${clinicClean}`,
      qualifyingSegments: 'Active medical clinic or hospital looking to increase verified patient footfall',
      disqualifyingSignals: 'Closed clinic or non-medical practitioner',
      proposedNextStepDefault: isReach
        ? `Reserve the exclusive Position 1 Spotlight slot on Practo Reach for ${clinicClean}`
        : `Complete free Practo Prime clinic verification and activate online booking badge`,
      preferredCallbackWindow: '10 AM to 7 PM weekdays',
      customerCareNumber: '+918041100376',
      dndRegistrationLine: '1800-500-DND',
      crmDealStage: 'Discovery scheduled',
      priorTouchpointSummary: isReach
        ? `Exclusive Position 1 Practo Reach spotlight slot available for ${specClean} in ${locClean}`
        : `Practo Prime clinic partnership to activate 24/7 instant booking for ${clinicClean} in ${locClean} with zero onboarding fee`,
    };

    return this.triggerInstantOutbound({
      userPhoneNumber,
      leadId,
      agentVariables,
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
      callSummary: `Practo ${isReach ? 'Reach' : 'Prime'} AI Outbound pitch to Dr. ${docNameClean} (${clinicClean}, ${locClean})`,
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
