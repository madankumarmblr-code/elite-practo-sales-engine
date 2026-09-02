import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const CrmContext = createContext(null);

export function CrmProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('crm_theme') || 'light');
  const [token, setToken] = useState(() => localStorage.getItem('crm_token') || null);
  const [currentRole, setCurrentRole] = useState(() => localStorage.getItem('crm_active_role') || 'superadmin');
  const [currentUser, setCurrentUser] = useState(null);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [liveActivities, setLiveActivities] = useState([]);

  // Modals / Drawers State
  const [selectedLeadId, setSelectedLeadId] = useState(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [voiceDialerLead, setVoiceDialerLead] = useState(null);
  const [pitchLead, setPitchLead] = useState(null);

  // Sync Theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('crm_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const [isManualPushOpen, setIsManualPushOpen] = useState(false);
  const [isProfilePicModalOpen, setIsProfilePicModalOpen] = useState(false);

  // Fetch Current User & Permissions
  const loadUser = useCallback(async () => {
    try {
      const data = await api.getMe();
      const storedAvatar = localStorage.getItem('crm_user_avatar');
      const user = data.user ? { ...data.user, avatar: storedAvatar || data.user.avatar } : null;
      setCurrentUser(user);
      setAvailableRoles(data.availableRoles || []);
    } catch (err) {
      console.warn('Error loading user profile:', err);
    }
  }, []);

  const updateUserProfilePic = (avatarUrl) => {
    if (avatarUrl) {
      localStorage.setItem('crm_user_avatar', avatarUrl);
    } else {
      localStorage.removeItem('crm_user_avatar');
    }
    setCurrentUser((prev) => (prev ? { ...prev, avatar: avatarUrl } : prev));
    addToast('Profile picture updated successfully!', 'success');
  };

  useEffect(() => {
    if (token) {
      loadUser();
    }
  }, [loadUser, currentRole, token]);

  // Login handler — accepts userId, optional roleOverride, and password
  const login = async (userId, roleOverride = null, password = '') => {
    try {
      const res = await api.login(userId, password);
      if (!res || !res.user) {
        addToast('Invalid credentials', 'error');
        return false;
      }
      const generatedToken = res.token || `jwt-enterprise-${Date.now()}`;
      localStorage.setItem('crm_token', generatedToken);
      localStorage.setItem('crm_active_role', res.user.role);
      localStorage.setItem('crm_active_name', res.user.name);
      setToken(generatedToken);
      setCurrentRole(res.user.role);
      setCurrentUser(res.user);
      addToast(`Welcome, ${res.user.name}`, 'success');
      return true;
    } catch (err) {
      addToast(err.message || 'Authentication failed', 'error');
      return false;
    }
  };

  // Logout handler
  const logout = () => {
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_active_role');
    localStorage.removeItem('crm_active_name');
    setToken(null);
    setCurrentUser(null);
    addToast('You have been securely logged out', 'info');
  };

  // Switch Role
  const handleSwitchRole = async (newRole) => {
    try {
      localStorage.setItem('crm_active_role', newRole);
      const res = await api.switchRole(newRole);
      setCurrentRole(newRole);
      setCurrentUser(res.user);
      localStorage.setItem('crm_active_name', res.user.name);
      addToast(`Switched active persona to ${newRole.toUpperCase().replace('_', ' ')}`, 'success');
    } catch (err) {
      addToast(err.message || 'Failed to switch role', 'error');
    }
  };

  // Real-Time SSE Listener
  useEffect(() => {
    if (!token) return;
    try {
      const subscribeFn = api.subscribeToEvents || api.connectActivityStream;
      if (typeof subscribeFn === 'function') {
        const cleanup = subscribeFn((event) => {
          setRealtimeConnected(true);
          if (event && (event.type === 'audit:logged' || event.type?.includes(':'))) {
            setLiveActivities((prev) => [event, ...prev.slice(0, 19)]);
          }
        });
        return cleanup;
      }
    } catch (err) {
      console.warn('[SSE Event Stream Warning]:', err);
    }
  }, [token]);

  const hasPermission = (permissionKey) => {
    if (!currentUser || !currentUser.permissions) return true;
    return currentUser.permissions.includes(permissionKey);
  };

  const value = {
    theme,
    toggleTheme,
    token,
    isAuthenticated: !!token,
    login,
    logout,
    currentRole,
    currentUser,
    availableRoles,
    handleSwitchRole,
    hasPermission,
    toasts,
    addToast,
    removeToast,
    realtimeConnected,
    liveActivities,

    // Lead drawer / Modals
    selectedLeadId,
    setSelectedLeadId,
    isLeadModalOpen,
    setIsLeadModalOpen,
    editingLead,
    setEditingLead,
    voiceDialerLead,
    setVoiceDialerLead,
    pitchLead,
    setPitchLead,

    // Manual Push & Profile Pic
    isManualPushOpen,
    setIsManualPushOpen,
    isProfilePicModalOpen,
    setIsProfilePicModalOpen,
    updateUserProfilePic,
  };

  return <CrmContext.Provider value={value}>{children}</CrmContext.Provider>;
}

export function useCrm() {
  const context = useContext(CrmContext);
  if (!context) throw new Error('useCrm must be used within CrmProvider');
  return context;
}
