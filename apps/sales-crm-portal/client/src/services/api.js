/**
 * API Client with Role-Based Access Control headers & SSE Real-time listener
 *
 * API Configuration:
 *   Base URL:   /api   (proxied to http://localhost:5050 by Vite dev server)
 *   Auth:       Bearer token via x-user-role / x-user-name headers
 *   SSE:        /api/activities/stream
 */

const API_BASE = '/api';

function getHeaders(customHeaders = {}) {
  const currentRole = localStorage.getItem('crm_active_role') || 'superadmin';
  const currentName = localStorage.getItem('crm_active_name') || 'SuperAdmin User';

  return {
    'Content-Type': 'application/json',
    'x-user-role': currentRole,
    'x-user-name': currentName,
    ...customHeaders,
  };
}

async function request(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: getHeaders(options.headers),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Request failed (${res.status})`);
  }

  return res.json();
}

export const api = {
  // ─── Auth ──────────────────────────────────────────
  getMe: () => request('/auth/me'),
  login: (userId, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ userId, password }) }),
  switchRole: (role) => request('/auth/switch-role', { method: 'POST', body: JSON.stringify({ role }) }),

  // ─── Dashboard ─────────────────────────────────────
  getDashboardSummary: () => request('/dashboard/summary'),

  // ─── Leads ─────────────────────────────────────────
  getLeads: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/leads?${query}`);
  },
  getLeadById: (id) => request(`/leads/${id}`),
  createLead: (data) => request('/leads', { method: 'POST', body: JSON.stringify(data) }),
  updateLead: (id, data) => request(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLead: (id) => request(`/leads/${id}`, { method: 'DELETE' }),
  anonymizeLead: (id) => request(`/leads/${id}/anonymize`, { method: 'POST' }),

  // ─── Clinic Discovery (Search by City/Zone/Specialty) ─────
  searchClinics: (params) => request('/clinics/search', { method: 'POST', body: JSON.stringify(params) }),

  // ─── Pipeline (Kanban) ────────────────────────────────
  getPipelineStages: () => request('/pipeline/stages'),
  getDeals: () => request('/pipeline/deals'),
  createDeal: (data) => request('/pipeline/deals', { method: 'POST', body: JSON.stringify(data) }),
  updateDealStage: (id, stage) => request(`/pipeline/deals/${id}/stage`, { method: 'PATCH', body: JSON.stringify({ stage }) }),

  // ─── AI Pilot & Pitch Engine ──────────────────────────
  generatePitch: (leadId, repName) => request('/aipilot/generate-pitch', { method: 'POST', body: JSON.stringify({ leadId, repName }) }),
  simulateVoiceCall: (leadId) => request('/aipilot/simulate-voice-call', { method: 'POST', body: JSON.stringify({ leadId }) }),
  huntPractoLeads: (params) => request('/aipilot/hunt-practo-leads', { method: 'POST', body: JSON.stringify(params) }),
  launchPitchCampaign: (data) => request('/aipilot/launch-pitch-campaign', { method: 'POST', body: JSON.stringify(data) }),
  assignAutoPilot: (leadIds, product, repName) => request('/aipilot/auto-pilot', { method: 'POST', body: JSON.stringify({ leadIds, product, repName }) }),
  executeChannelStep: (data) => request('/aipilot/execute-channel-step', { method: 'POST', body: JSON.stringify(data) }),
  escalateLeadToHuman: (data) => request('/aipilot/escalate-to-human', { method: 'POST', body: JSON.stringify(data) }),
  resolveEscalation: (data) => request('/aipilot/resolve-escalation', { method: 'POST', body: JSON.stringify(data) }),
  getEscalatedLeads: () => request('/aipilot/escalations'),

  // ─── Practo Reach & Prime Slot Inventory (Google Sheet) ────
  searchInventory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/inventory/search?${query}`);
  },
  getInventoryStats: () => request('/inventory/stats'),
  getInventoryCities: () => request('/inventory/cities'),
  getInventorySpecialties: () => request('/inventory/specialties'),
  syncGoogleSheet: (sheetUrl) => request('/inventory/sync-live', { method: 'POST', body: JSON.stringify({ sheetUrl }) }),

  // ─── Custom Reports ──────────────────────────────────
  getReportsList: () => request('/reports'),
  createReport: (data) => request('/reports', { method: 'POST', body: JSON.stringify(data) }),
  exportReport: (id, format) => `${API_BASE}/reports/${id}/export/${format}`,

  // ─── Audit Ledger ────────────────────────────────────
  getAuditLogs: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/audit?${query}`);
  },

  // ─── Privacy & GDPR ──────────────────────────────────
  getPrivacyStatus: () => request('/privacy'),
  getPrivacySettings: () => request('/privacy'),
  purgeStaleData: (retentionDays) => request('/privacy/purge-stale-data', { method: 'POST', body: JSON.stringify({ retentionDays }) }),
  updatePrivacySettings: (data) => request('/privacy', { method: 'PUT', body: JSON.stringify(data) }),
  purgeLeadData: (leadId) => request(`/privacy/purge/${leadId}`, { method: 'POST' }),

  // ─── Sarvam Voice Agents ─────────────────────────────
  getSarvamConfig: () => request('/sarvam/config'),
  saveSarvamConfig: (data) => request('/sarvam/config', { method: 'POST', body: JSON.stringify(data) }),
  testSarvamConnection: () => request('/sarvam/test-connection', { method: 'POST' }),
  triggerSarvamCall: (data) => request('/sarvam/calls/outbound', { method: 'POST', body: JSON.stringify(data) }),
  getSarvamInteractions: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/sarvam/calls/interactions?${query}`);
  },
  getSarvamTranscript: (interactionId, appId) => {
    const query = appId ? `?appId=${encodeURIComponent(appId)}` : '';
    return request(`/sarvam/calls/transcripts/${interactionId}${query}`);
  },
  getSarvamRecording: (interactionId, appId) => {
    const query = appId ? `?appId=${encodeURIComponent(appId)}` : '';
    return request(`/sarvam/calls/recordings/${interactionId}${query}`);
  },
  createSarvamCampaign: (data) => request('/sarvam/campaigns', { method: 'POST', body: JSON.stringify(data) }),

  // ─── Meta WhatsApp Cloud API ────────────────────────
  getWhatsAppConfig: () => request('/whatsapp/config'),
  saveWhatsAppConfig: (data) => request('/whatsapp/config', { method: 'POST', body: JSON.stringify(data) }),
  testWhatsAppConnection: () => request('/whatsapp/test-connection', { method: 'POST' }),
  sendWhatsAppMessage: (data) => request('/whatsapp/send-message', { method: 'POST', body: JSON.stringify(data) }),
  sendWhatsAppTemplate: (data) => request('/whatsapp/send-template', { method: 'POST', body: JSON.stringify(data) }),

  // ─── Settings, Team & User Management ────────────────
  getUsers: () => request('/users'),
  createUser: (data) => request('/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id, data) => request(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  getTeam: () => request('/users'),
  getIntegrations: () => request('/settings/integrations'),
  syncIntegration: (id) => request(`/settings/integrations/${id}/sync`, { method: 'POST' }),
  resetDemoData: () => request('/settings/reset-demo', { method: 'POST' }),

  // ─── SSE Activity Stream ─────────────────────────────
  connectActivityStream: (onMessage, onError) => {
    try {
      const eventSource = new EventSource(`${API_BASE}/activities/stream`);
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (onMessage) onMessage(parsed);
        } catch (err) {
          console.error('Error parsing SSE event:', err);
        }
      };
      eventSource.onerror = (err) => {
        if (onError) onError(err);
      };
      return () => eventSource.close();
    } catch (e) {
      console.warn('SSE EventSource not available:', e);
      return () => {};
    }
  },
  subscribeToEvents: (onEvent, onError) => {
    try {
      const eventSource = new EventSource(`${API_BASE}/activities/stream`);
      eventSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (onEvent) onEvent(parsed);
        } catch (err) {
          console.error('Error parsing SSE event:', err);
        }
      };
      eventSource.onerror = (err) => {
        if (onError) onError(err);
      };
      return () => eventSource.close();
    } catch (e) {
      console.warn('SSE EventSource not available:', e);
      return () => {};
    }
  },
};
