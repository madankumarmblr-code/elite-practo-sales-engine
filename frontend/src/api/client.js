/**
 * Frontend API Client
 * All methods map 1-to-1 to backend route handlers.
 * Auth token is read from localStorage and sent as Bearer header on every request.
 */

const API_BASE = '/api';
const TOKEN_KEY = 'practo-auth-token';

// ── Auth token helpers (used by CommercialSuite iframe postMessage too) ────────
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function authHeaders(extra = {}) {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function handleResponse(response) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.message || `HTTP error ${response.status}`);
  }
  return response.json();
}

async function get(path, query = {}) {
  const qs = Object.keys(query).length
    ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(query).filter(([, v]) => v != null && v !== ''))).toString()
    : '';
  const res = await fetch(`${API_BASE}${path}${qs}`, { headers: authHeaders() });
  return handleResponse(res);
}

async function post(path, body = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

async function put(path, body = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

async function patch(path, body = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

async function del(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(res);
}

export const api = {
  // ── Health ─────────────────────────────────────────────────────────────────
  async getHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      return await handleResponse(res);
    } catch (err) {
      console.error('API getHealth error:', err);
      return { status: 'offline', error: err.message };
    }
  },

  // ── Projects (basic CRUD) ──────────────────────────────────────────────────
  async getStats() {
    const json = await get('/stats');
    return json.data;
  },

  async getProjects(params = {}) {
    const query = {};
    if (params.status && params.status !== 'all') query.status = params.status;
    if (params.category && params.category !== 'all') query.category = params.category;
    if (params.search) query.search = params.search;
    const json = await get('/projects', query);
    return json.data;
  },

  async createProject(projectData) {
    const json = await post('/projects', projectData);
    return json.data;
  },

  async updateProject(id, updates) {
    const json = await put(`/projects/${id}`, updates);
    return json.data;
  },

  async deleteProject(id) {
    return del(`/projects/${id}`);
  },

  async getActivities() {
    const json = await get('/activities');
    return json.data;
  },

  // ── Auth ───────────────────────────────────────────────────────────────────
  async login(credentials) {
    return post('/auth/login', credentials);
  },

  async logout() {
    return post('/auth/logout');
  },

  async getMe() {
    return get('/auth/me');
  },

  // ── Pulse Meta (city/zone/keyword discovery config) ────────────────────────
  async getLeadGeneratorMeta() {
    return get('/pulse/meta');
  },

  async pulsePresets() {
    return get('/pulse/presets');
  },

  async pulseStatus() {
    return get('/pulse/status');
  },

  async pulsePingAll() {
    const res = await fetch(`${API_BASE}/pulse/status/ping-all`, {
      method: 'POST',
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  // ── Pulse Settings ─────────────────────────────────────────────────────────
  async pulseSettings() {
    return get('/pulse/settings');
  },

  async pulseSaveSettings(settings) {
    return put('/pulse/settings', settings);
  },

  // ── Lead Discovery (LeadGenerator page) ────────────────────────────────────
  async searchLeads(params = {}) {
    return post('/pulse/discover', params);
  },

  async importLeads(leads = []) {
    // Saves selected discovered leads into the CRM via lead-generator import
    return post('/lead-generator/import', { leads });
  },

  async getPulseLeads() {
    const json = await get('/pulse/leads');
    return json.leads || [];
  },

  async validateLeads(leads = []) {
    return post('/pulse/validate', { leads });
  },

  // ── CRM Hub ────────────────────────────────────────────────────────────────
  async crmLeads(params = {}) {
    return get('/pulse/crm/leads', params);
  },

  async updateLeadStage(id, stage, note) {
    return patch(`/pulse/crm/leads/${id}/stage`, { stage, note });
  },

  async addLeadNote(id, note, nextAction) {
    return post(`/pulse/crm/leads/${id}/notes`, { note, nextAction });
  },

  // ── Autopilot ──────────────────────────────────────────────────────────────
  async getAutopilot() {
    return get('/pulse/autopilot');
  },

  async pushToAutopilot(leads, level, channels) {
    return post('/pulse/autopilot/push', { leads, level, channels });
  },

  // ── Calls Studio (Sarvam-backed) ───────────────────────────────────────────
  async pulseCallLogs(params = {}) {
    return get('/pulse/logs/calls', params);
  },

  async dialAiCall(params) {
    return post('/pulse/calls/dial', params);
  },

  // ── WhatsApp ───────────────────────────────────────────────────────────────
  async sendWhatsApp(params) {
    return post('/pulse/whatsapp/send', params);
  },

  async whatsappMessages(params = {}) {
    return get('/pulse/logs/messages', { ...params, channel: 'whatsapp' });
  },

  // ── Email ──────────────────────────────────────────────────────────────────
  async sendEmail(params) {
    return post('/pulse/email/send', params);
  },

  // ── Channel Tests ──────────────────────────────────────────────────────────
  async testChannel(channel, body = {}) {
    return post('/pulse/channels/test', { channel, ...body });
  },

  async testAllChannels() {
    return post('/pulse/channels/test-all', {});
  },

  // ── Webhooks ───────────────────────────────────────────────────────────────
  async getWebhooks() {
    return get('/pulse/webhooks');
  },

  async saveWebhooks(webhooks) {
    return put('/pulse/webhooks', { webhooks });
  },

  async testWebhooks() {
    return post('/pulse/webhooks/test', {});
  },

  // ── Notifications ──────────────────────────────────────────────────────────
  async getNotifications(limit = 30) {
    return get('/pulse/notifications', { limit });
  },

  async markNotificationsRead(ids = []) {
    return post('/pulse/notifications/mark-read', { ids });
  },

  // ── Export ─────────────────────────────────────────────────────────────────
  async exportMasterLeads(format = 'csv') {
    return get('/pulse/export/master', { format });
  },

  // ── Sarvam Voice AI ────────────────────────────────────────────────────────
  async sarvamGetConfig() {
    return get('/sarvam/config');
  },

  async sarvamSaveConfig(data) {
    return post('/sarvam/config', data);
  },

  async sarvamTestConnection() {
    return post('/sarvam/test-connection', {});
  },

  async sarvamTriggerCall(params) {
    return post('/sarvam/calls/outbound', params);
  },

  async sarvamGetInteractions(params = {}) {
    return get('/sarvam/calls/interactions', params);
  },

  async sarvamGetTranscript(interactionId, appId) {
    return get(`/sarvam/calls/transcripts/${interactionId}`, appId ? { appId } : {});
  },

  async sarvamGetRecording(interactionId, appId) {
    return get(`/sarvam/calls/recordings/${interactionId}`, appId ? { appId } : {});
  },

  async sarvamCreateCampaign(campaignData) {
    return post('/sarvam/campaigns', campaignData);
  },

  // ── Commercial Suite (Google Sheet inventory) ──────────────────────────────
  async commercialMeta() {
    return get('/commercial/meta');
  },

  async commercialInventory(params = {}) {
    return get('/commercial/inventory', params);
  },

  async commercialRefresh() {
    return post('/commercial/refresh', {});
  },

  // ── Sheet Sync ─────────────────────────────────────────────────────────────
  async sheetStatus() {
    return get('/sheet/status');
  },

  async sheetSync() {
    return post('/sheet/sync', {});
  },

  // ── Reports ────────────────────────────────────────────────────────────────
  async getReports(params = {}) {
    return get('/reports', params);
  },

  // ── Workspace ─────────────────────────────────────────────────────────────
  async getWorkspace() {
    return get('/workspace');
  },

  // ── Audit Log ─────────────────────────────────────────────────────────────
  async getAuditLog(params = {}) {
    return get('/audit', params);
  },

  // ── Pitch Pilot ───────────────────────────────────────────────────────────
  async generatePitch(lead, channel) {
    return post('/pulse/pitch', { lead, channel });
  },

  // ── SuperAdmin ────────────────────────────────────────────────────────────
  async superAdminSelfTest(params = {}) {
    return post('/pulse/superadmin/self-test', params);
  },

  async dbProbe() {
    return get('/pulse/db-probe');
  },
};
