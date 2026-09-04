/**
 * Elite Practo Sales AI — Frontend API Client
 * Maps 1-to-1 to backend route handlers.
 */

const API_BASE = '/api';
const TOKEN_KEY = 'elite-auth-token';

// Clear any legacy persistent token so opening links requires fresh login
try { localStorage.removeItem(TOKEN_KEY); } catch {}

export function getToken() { return sessionStorage.getItem(TOKEN_KEY) || ''; }
export function setToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

function authHeaders(extra = {}) {
  const token = getToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

async function handleResponse(res) {
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || data.message || `HTTP error ${res.status}`);
  }
  return res.json();
}

function qs(query = {}) {
  const params = Object.entries(query).filter(([, v]) => v != null && v !== '');
  return params.length ? '?' + new URLSearchParams(params).toString() : '';
}

const get = (path, query) => fetch(`${API_BASE}${path}${qs(query)}`, { headers: authHeaders() }).then(handleResponse);
const post = (path, body = {}) => fetch(`${API_BASE}${path}`, { method: 'POST', headers: authHeaders(), body: JSON.stringify(body) }).then(handleResponse);
const put = (path, body = {}) => fetch(`${API_BASE}${path}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify(body) }).then(handleResponse);
const patch = (path, body = {}) => fetch(`${API_BASE}${path}`, { method: 'PATCH', headers: authHeaders(), body: JSON.stringify(body) }).then(handleResponse);
const del = (path) => fetch(`${API_BASE}${path}`, { method: 'DELETE', headers: authHeaders() }).then(handleResponse);

export const api = {
  // ── Health ─────────────────────────────────────────────────────────────────
  async getHealth() {
    try { return await fetch(`${API_BASE}/health`).then(handleResponse); }
    catch (err) { return { ok: false, error: err.message }; }
  },

  // ── Auth ───────────────────────────────────────────────────────────────────
  login: (credentials) => post('/auth/login', credentials),
  logout: () => post('/auth/logout'),
  getMe: () => get('/auth/me'),
  getRoles: () => get('/auth/roles'),

  // ── Users ──────────────────────────────────────────────────────────────────
  getUsers: () => get('/users'),
  createUser: (data) => post('/users', data),
  updateUser: (id, data) => put(`/users/${id}`, data),
  deleteUser: (id) => del(`/users/${id}`),

  // ── Leads ──────────────────────────────────────────────────────────────────
  getLeads: (params) => get('/leads', params),
  getLead: (id) => get(`/leads/${id}`),
  createLead: (data) => post('/leads', data),
  updateLead: (id, data) => put(`/leads/${id}`, data),
  deleteLead: (id) => del(`/leads/${id}`),
  bulkImportLeads: (leads) => post('/leads/bulk-import', { leads }),
  addLeadActivity: (id, data) => post(`/leads/${id}/activities`, data),

  // ── Sarvam Voice ──────────────────────────────────────────────────────────
  sarvamGetConfig: () => get('/sarvam/config'),
  sarvamSaveConfig: (data) => post('/sarvam/config', data),
  sarvamTestConnection: () => post('/sarvam/test-connection'),
  sarvamOutboundCall: (params) => post('/sarvam/calls/outbound', params),
  sarvamGetInteractions: (params) => get('/sarvam/calls/interactions', params),
  sarvamGetTranscript: (id, appId) => get(`/sarvam/calls/transcripts/${id}`, appId ? { appId } : {}),
  sarvamGetRecording: (id, appId) => get(`/sarvam/calls/recordings/${id}`, appId ? { appId } : {}),
  sarvamCreateCampaign: (data) => post('/sarvam/campaigns', data),
  sarvamCallLogs: (params) => get('/sarvam/call-logs', params),

  // ── WhatsApp ───────────────────────────────────────────────────────────────
  whatsappGetConfig: () => get('/whatsapp/config'),
  whatsappSaveConfig: (data) => post('/whatsapp/config', data),
  whatsappTestConnection: () => post('/whatsapp/test-connection'),
  whatsappSendMessage: (params) => post('/whatsapp/send-message', params),
  whatsappSendTemplate: (params) => post('/whatsapp/send-template', params),
  whatsappMessages: (params) => get('/whatsapp/messages', params),

  // ── Integrations ───────────────────────────────────────────────────────────
  getIntegrations: () => get('/integrations'),
  getIntegration: (provider) => get(`/integrations/${provider}`),
  updateIntegration: (provider, data) => put(`/integrations/${provider}`, data),

  // ── AI ─────────────────────────────────────────────────────────────────────
  generatePitch: (lead, channel) => post('/ai/pitch', { lead, channel }),
  smartChannel: (lead) => post('/ai/smart-channel', { lead }),

  // ── Settings ───────────────────────────────────────────────────────────────
  getSettings: () => get('/settings'),
  saveSettings: (data) => put('/settings', data),

  // ── Dashboard ──────────────────────────────────────────────────────────────
  getDashboardStats: () => get('/dashboard/stats'),

  // ── Audit & Compliance ─────────────────────────────────────────────────────
  getAuditLogs: (params) => get('/audit', params),
  getCompliance: () => get('/compliance'),

  // ── Notifications ──────────────────────────────────────────────────────────
  getNotifications: (limit) => get('/notifications', { limit }),
  markNotificationsRead: (ids) => post('/notifications/mark-read', { ids }),

  // ── Pipeline ───────────────────────────────────────────────────────────────
  getPipelineStages: () => get('/pipeline-stages'),

  // ── Scraper & Clinic Discovery ───────────────────────────────────────────
  searchClinics: (params) => get('/scraper/search', params),
  assignScrapedToCrm: (data) => post('/scraper/assign-crm', data),

  // ── Reach Inventory & Master Catalog ──────────────────────────────────────
  getInventoryCities: () => get('/inventory/cities'),
  getInventoryZones: (city) => get('/inventory/zones', { city }),
  getInventorySpecialities: (city, zone) => get('/inventory/specialities', { city, zone }),
  checkInventory: (city, zone, speciality) => get('/inventory/check', { city, zone, speciality }),
  searchInventory: (params) => get('/inventory/search', params),
  getInventoryStats: () => get('/inventory/stats'),
  getNewlyOpenedSlots: (params) => get('/inventory/newly-opened', params),

  // ── Commercial Proposals ──────────────────────────────────────────────────
  createProposal: (data) => post('/proposals', data),
  getProposals: () => get('/proposals'),
  generateWhatsAppSummary: (data) => post('/proposals/whatsapp-summary', data),

  // ── Autopilot AI Pipeline ─────────────────────────────────────────────────
  getAutopilotQueue: (params) => get('/autopilot/queue', params),
  getAutopilotQueueItem: (id) => get(`/autopilot/queue/${id}`),
  enqueueAutopilot: (data) => post('/autopilot/enqueue', data),
  triggerAutopilotCall: (id) => post(`/autopilot/queue/${id}/trigger-call`),
  triggerAutopilotWhatsApp: (id) => post(`/autopilot/queue/${id}/trigger-whatsapp`),
  triggerManualCall: (data) => post('/autopilot/manual-call', data),
  triggerManualWhatsApp: (data) => post('/autopilot/manual-whatsapp', data),
  advanceAutopilotQueue: (id, data) => post(`/autopilot/queue/${id}/advance`, data),
  transferAutopilotToHuman: (id, data) => post(`/autopilot/queue/${id}/transfer-human`, data),
  retryAutopilotCall: (id) => post(`/autopilot/queue/${id}/retry-call`),
  stepAutopilotQueue: () => post('/autopilot/step'),
  approveAutopilotEmail: (id, data) => post(`/autopilot/queue/${id}/approve-email`, data),
  getAutopilotStats: () => get('/autopilot/stats'),
  runFullAutopilot: (data) => post('/autopilot/run-all', data),
  autoEnqueueScrapedToAutopilot: (data) => post('/autopilot/auto-enqueue-scraped', data),
  getAutomationStatus: () => get('/autopilot/automation-status'),

  // ── Leads Batch Actions & Export ──────────────────────────────────────────
  batchActionLeads: (data) => post('/leads/batch-action', data),
  exportLeadsUrl: (params) => `/api/leads/export${qs(params)}`,

  // ── Proprietary Voice Agent, Telephony & Dual Sentiment ───────────────────
  getVoiceAgentConfig: () => get('/voice-agent/config'),
  saveVoiceAgentConfig: (data) => post('/voice-agent/config', data),
  dialVoiceAgent: (data) => post('/voice-agent/dial', data),
  getVoiceAgentCalls: (params) => get('/voice-agent/calls', params),
  getVoiceAgentCallById: (id) => get(`/voice-agent/calls/${id}`),
  analyzeCallSentiment: (data) => post('/voice-agent/analyze-sentiment', data),

  // ── System ─────────────────────────────────────────────────────────────────
  getSystemEvents: (params) => get('/system/events', params),
  getSystemHealth: () => get('/system/health'),
  getServerStatus: () => get('/system/status'),
};
