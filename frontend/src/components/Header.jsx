import React from 'react';
import { Layers, Server, Activity, Plus, RefreshCw } from 'lucide-react';

export function Header({ health, onRefresh, isRefreshing, onOpenCreate }) {
  const isOnline = health?.status === 'ok';

  return (
    <header className="navbar">
      <div className="brand-wrapper">
        <div className="brand-icon">
          <Layers size={22} />
        </div>
        <div className="brand-text">
          <h1>
            NexusHub
            <span className="brand-badge">Full-Stack</span>
          </h1>
          <div className="brand-subtitle">React + Node.js Express Platform</div>
        </div>
      </div>

      <div className="nav-actions">
        <div className="server-pill" title={`Node ${health?.nodeVersion || 'v20'} | Uptime: ${health?.uptime || '0s'}`}>
          <div className={`status-dot ${isOnline ? '' : 'status-dot-offline'}`} style={{ backgroundColor: isOnline ? '#10b981' : '#ef4444' }} />
          <span>{isOnline ? 'Express API Live' : 'Connecting API...'}</span>
        </div>

        <button 
          className="btn btn-secondary" 
          onClick={onRefresh} 
          disabled={isRefreshing}
          title="Refresh Data from Server"
        >
          <RefreshCw size={15} className={isRefreshing ? 'spin-icon' : ''} />
          <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
        </button>

        <button className="btn btn-primary" onClick={onOpenCreate}>
          <Plus size={16} />
          <span>New Project</span>
        </button>
      </div>
    </header>
  );
}
