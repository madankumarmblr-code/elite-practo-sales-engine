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
};
