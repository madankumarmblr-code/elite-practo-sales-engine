import { Outlet, Navigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import { readWorkspaceBackup } from '../lib/workspaceBackup';

/**
 * Auth gate + workspace rehydrate.
 * All authenticated pages render inside PractoPulse (PulseLayout) — one UI shell.
 */
export default function Layout({ toast }) {
  const [bootstrapped, setBootstrapped] = useState(false);
  const { isAuthenticated, loading } = useAuth();
  const rehydrated = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      rehydrated.current = false;
      setBootstrapped(false);
      return;
    }
    if (rehydrated.current) {
      setBootstrapped(true);
      return;
    }
    rehydrated.current = true;
    let cancelled = false;
    (async () => {
      const backup = readWorkspaceBackup();
      if (backup) {
        try {
          await api.rehydrateWorkspace(backup);
        } catch {
          /* non-fatal */
        }
      }
      if (!cancelled) setBootstrapped(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  if (loading || (isAuthenticated && !bootstrapped)) {
    return (
      <div className="login-page">
        <div className="muted">Loading workspace…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Outlet />
      {toast ? <div className="toast">{toast}</div> : null}
    </>
  );
}
