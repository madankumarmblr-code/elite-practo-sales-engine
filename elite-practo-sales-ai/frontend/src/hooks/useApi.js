import { useState, useEffect, useCallback, useRef } from 'react';
import { api, getToken, setToken } from '../api/client.js';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!getToken()) { setUser(null); setLoading(false); return; }
    try {
      const me = await api.getMe();
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const login = useCallback(async (credentials) => {
    const data = await api.login(credentials);
    setToken(data.token);
    setUser(data.user);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await api.logout(); } catch { /* ignore */ }
    setToken(null);
    setUser(null);
  }, []);

  return { user, loading, login, logout, refresh };
}

export function useLeads(params = {}) {
  const [state, setState] = useState({ leads: [], total: 0, loading: true, error: null });

  const fetch = useCallback(async (p = params) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api.getLeads(p);
      setState({ leads: data.leads || [], total: data.total || 0, loading: false, error: null });
    } catch (err) {
      setState((s) => ({ ...s, loading: false, error: err.message }));
    }
  }, []); // eslint-disable-line

  useEffect(() => { fetch(); }, []); // eslint-disable-line

  return { ...state, refetch: fetch };
}

export function useDashboardStats() {
  const [state, setState] = useState({ stats: null, loading: true, error: null });

  useEffect(() => {
    api.getDashboardStats()
      .then((stats) => setState({ stats, loading: false, error: null }))
      .catch((err) => setState({ stats: null, loading: false, error: err.message }));
  }, []);

  return state;
}

export function useIntegrations() {
  const [state, setState] = useState({ integrations: [], loading: true, error: null });

  const fetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await api.getIntegrations();
      setState({ integrations: data, loading: false, error: null });
    } catch (err) {
      setState({ integrations: [], loading: false, error: err.message });
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { ...state, refetch: fetch };
}

export function useNotifications() {
  const [state, setState] = useState({ notifications: [], unread: 0, loading: true });

  const fetch = useCallback(async () => {
    try {
      const data = await api.getNotifications(30);
      setState({ notifications: data.notifications || [], unread: data.unread || 0, loading: false });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);
  return { ...state, refetch: fetch };
}

export function useInterval(fn, ms) {
  const savedFn = useRef(fn);
  useEffect(() => { savedFn.current = fn; }, [fn]);
  useEffect(() => {
    if (!ms) return;
    const id = setInterval(() => savedFn.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}
