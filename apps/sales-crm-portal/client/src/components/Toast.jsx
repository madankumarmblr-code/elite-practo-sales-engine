import React from 'react';
import { useCrm } from '../context/CrmContext';

export function ToastContainer() {
  const { toasts, removeToast } = useCrm();

  if (!toasts.length) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 1000,
        maxWidth: '380px',
      }}
    >
      {toasts.map((t) => {
        const isError = t.type === 'error';
        const isSuccess = t.type === 'success';

        return (
          <div
            key={t.id}
            className="glass-panel animate-slide-in-right"
            style={{
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              background: 'var(--bg-card-solid)',
              borderLeft: `4px solid ${isError ? 'var(--accent-rose)' : isSuccess ? 'var(--accent-emerald)' : 'var(--accent-primary)'}`,
              boxShadow: 'var(--shadow-card)',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-primary)',
            }}
          >
            <span>{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '2px',
              }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
