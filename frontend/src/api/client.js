// Same-origin by default (Docker/Node single-port). For Cloudflare Pages UI + separate API, set VITE_API_BASE at build time.
const BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
const TOKEN_KEY = 'practo_sales_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers,
    });
  } catch {
    throw new Error('Cannot reach API. Check that the server is running.');
  }

  if (res.status === 401 && !path.startsWith('/api/auth/login')) {
    setToken('');
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }

  const contentType = res.headers.get('Content-Type') || '';
  if (!res.ok) {
    if (contentType.includes('application/json')) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || err.message || 'Request failed');
    }
    if (res.status === 504) {
      throw new Error(
        'Lead search timed out on the server. Try a smaller zone or Refresh again — Practo.com may be slow.'
      );
    }
    throw new Error(
      res.status === 405 || res.status === 404
        ? 'API is not available on this deployment. Redeploy with the fullstack Vercel config.'
        : `Request failed (${res.status})`
    );
  }

  const disposition = res.headers.get('Content-Disposition') || '';
  if (disposition.includes('attachment') || contentType.includes('text/csv')) {
    return res;
  }
  if (!contentType.includes('application/json')) {
    throw new Error('API returned a non-JSON response. The serverless API may not be deployed.');
  }
  return res.json();
}

export const api = {
  login: (body) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),

  searchLeads: (body) =>
    request('/api/lead-generator/search', { method: 'POST', body: JSON.stringify(body) }),
  getLeadGeneratorMeta: () => request('/api/lead-generator/meta'),
  getLeadGeneratorOptions: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString();
    return request(`/api/lead-generator/options${qs ? `?${qs}` : ''}`);
  },
  importLeads: (leads) =>
    request('/api/lead-generator/import', { method: 'POST', body: JSON.stringify({ leads }) }),

  getSheetStatus: () => request('/api/sheet/status'),
  syncSheet: () => request('/api/sheet/sync', { method: 'POST' }),
  getCommercialMeta: () => request('/api/commercial/meta'),
  getCommercialInventory: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString();
    return request(`/api/commercial/inventory${qs ? `?${qs}` : ''}`);
  },
  refreshCommercial: () => request('/api/commercial/refresh', { method: 'POST' }),

  rehydrateWorkspace: (body) =>
    request('/api/workspace/rehydrate', { method: 'POST', body: JSON.stringify(body) }),

  pulseMeta: () => request('/api/pulse/meta'),
  pulseLeads: () => request('/api/pulse/leads'),
  pulseSource: (body) =>
    request('/api/pulse/source', { method: 'POST', body: JSON.stringify(body) }),
  pulseDiscover: (body) =>
    request('/api/pulse/discover', { method: 'POST', body: JSON.stringify(body) }),
  pulseStatus: () => request('/api/pulse/status'),
  pingAllServicesAndApis: () => request('/api/pulse/status/ping-all', { method: 'POST' }),
  pulseDbProbe: () => request('/api/pulse/db-probe'),

  pulseSettings: () => request('/api/pulse/settings'),
  pulseSaveSettings: (settings) =>
    request('/api/pulse/settings', { method: 'PUT', body: JSON.stringify({ settings }) }),
  pulseWebhooks: () => request('/api/pulse/webhooks'),
  pulseSaveWebhooks: (webhooks) =>
    request('/api/pulse/webhooks', { method: 'PUT', body: JSON.stringify({ webhooks }) }),
  pulseTestWebhooks: () => request('/api/pulse/webhooks/test', { method: 'POST' }),
  pulseAutopilot: () => request('/api/pulse/autopilot'),
  pulseAutopilotPush: (body) =>
    request('/api/pulse/autopilot/push', { method: 'POST', body: JSON.stringify(body) }),
  pulseMessages: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString();
    return request(`/api/pulse/logs/messages${qs ? `?${qs}` : ''}`);
  },
  pulseCallLogs: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString();
    return request(`/api/pulse/logs/calls${qs ? `?${qs}` : ''}`);
  },
  pulseTestChannel: (body) =>
    request('/api/pulse/channels/test', { method: 'POST', body: JSON.stringify(body) }),
  pulseTestAllChannels: () => request('/api/pulse/channels/test-all', { method: 'POST' }),
  pulsePitch: (body) =>
    request('/api/pulse/pitch', { method: 'POST', body: JSON.stringify(body) }),
  pulseSmartlead: (body) =>
    request('/api/pulse/smartlead', { method: 'POST', body: JSON.stringify(body) }),
  pulseHeyReach: (body) =>
    request('/api/pulse/heyreach', { method: 'POST', body: JSON.stringify(body) }),
  pulseDemo: (body) =>
    request('/api/pulse/demo', { method: 'POST', body: JSON.stringify(body) }),
  pulseFireflies: (body) =>
    request('/api/pulse/fireflies', { method: 'POST', body: JSON.stringify(body) }),

  pulsePresets: () => request('/api/pulse/presets'),
  validateLeads: (leads) =>
    request('/api/pulse/validate', { method: 'POST', body: JSON.stringify({ leads }) }),
  getCrmLeads: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString();
    return request(`/api/pulse/crm/leads${qs ? `?${qs}` : ''}`);
  },
  updateCrmStage: (id, body) =>
    request(`/api/pulse/crm/leads/${id}/stage`, { method: 'PATCH', body: JSON.stringify(body) }),
  addCrmNote: (id, body) =>
    request(`/api/pulse/crm/leads/${id}/notes`, { method: 'POST', body: JSON.stringify(body) }),
  dialAiCall: (body) =>
    request('/api/pulse/calls/dial', { method: 'POST', body: JSON.stringify(body) }),
  sendWhatsApp: (body) =>
    request('/api/pulse/whatsapp/send', { method: 'POST', body: JSON.stringify(body) }),
  sendEmail: (body) =>
    request('/api/pulse/email/send', { method: 'POST', body: JSON.stringify(body) }),
  superAdminSelfTest: (body) =>
    request('/api/pulse/superadmin/self-test', { method: 'POST', body: JSON.stringify(body) }),
  getNotifications: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString();
    return request(`/api/pulse/notifications${qs ? `?${qs}` : ''}`);
  },
  markNotificationsRead: (ids = []) =>
    request('/api/pulse/notifications/mark-read', { method: 'POST', body: JSON.stringify({ ids }) }),
  getMasterExportUrl: (format = 'csv') => `${BASE}/api/pulse/export/master?format=${format}`,

  getUsers: () => request('/api/users'),
  createUser: (body) => request('/api/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id, body) =>
    request(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteUser: (id) => request(`/api/users/${id}`, { method: 'DELETE' }),
  getRoles: () => request('/api/auth/roles'),
  getSystemEvents: (params = {}) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
    ).toString();
    return request(`/api/system/events${qs ? `?${qs}` : ''}`);
  },
  getSystemHealth: () => request('/api/system/health'),
  getApiHealth: () => request('/api/health'),
};

