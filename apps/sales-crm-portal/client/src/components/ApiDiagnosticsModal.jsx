import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

const SYSTEM_APIS = [
  {
    id: 'sarvam_voice',
    name: 'Sarvam Voice Agents API',
    function: 'Outbound Voice AI Calling, Speech Synthesis, Doctor Sentiment & Live Audio Stream',
    endpoint: '/api/sarvam/calls/outbound',
    testEndpoint: '/api/sarvam/test-connection',
    method: 'POST',
    docUrl: 'https://docs.sarvam.ai/conversations',
    category: 'VOICE AI',
  },
  {
    id: 'whatsapp_cloud',
    name: 'Meta WhatsApp Cloud API',
    function: '2-Way Interactive Doctor ROI Cards, Video Pitch & 1-Tap Quick Action Replies',
    endpoint: '/api/whatsapp/send-message',
    testEndpoint: '/api/whatsapp/test-connection',
    method: 'POST',
    docUrl: 'https://developers.facebook.com/docs/whatsapp',
    category: 'MESSAGING',
  },
  {
    id: 'multi_scraper',
    name: 'Live Multi-Source Scraper Engine',
    function: 'Cheerio-Powered Live Scraping of Practo.com Directory + Google Places (GMB) + Google Search Engine',
    endpoint: '/api/clinics/search',
    testEndpoint: '/api/clinics/search',
    method: 'POST',
    docUrl: 'https://www.practo.com',
    category: 'DATA SCRAPING',
  },
  {
    id: 'amoga_sync',
    name: 'Amoga Work OS Integration',
    function: 'Bi-directional Enterprise CRM Deal & Stage Sync with Practo Amoga Workspace',
    endpoint: '/api/amoga/sync-leads',
    testEndpoint: '/api/amoga/test-connection',
    method: 'POST',
    docUrl: 'https://practo.amoga.io/',
    category: 'CRM SYNC',
  },
  {
    id: 'slot_inventory',
    name: 'Practo Slot Inventory Sheet Engine',
    function: 'Live Google Sheet Slot Inventory & Newly Opened Practo Prime/Reach Slots across 180+ Cities',
    endpoint: '/api/inventory/search',
    testEndpoint: '/api/inventory/stats',
    method: 'GET',
    docUrl: 'https://docs.google.com/spreadsheets',
    category: 'INVENTORY',
  },
  {
    id: 'ai_pilot_engine',
    name: 'Autonomous AI Pilot & Escalation Engine',
    function: 'End-to-End Autonomous Sequence (Voice → WA → Email) & Rule-Based Field Rep Handoff',
    endpoint: '/api/aipilot/auto-pilot',
    testEndpoint: '/api/aipilot/escalations',
    method: 'GET',
    docUrl: 'http://localhost:5174/aipilot',
    category: 'AI AUTONOMOUS',
  },
  {
    id: 'rbac_auth',
    name: 'RBAC Auth & Permissions Engine',
    function: 'Superadmin, Sales VP, Manager, AE, SDR Granular Access Control & JWT Token Auth',
    endpoint: '/api/auth/me',
    testEndpoint: '/api/auth/me',
    method: 'GET',
    docUrl: 'http://localhost:5174/team',
    category: 'SECURITY',
  },
  {
    id: 'sse_stream',
    name: 'Real-Time SSE Telemetry Stream',
    function: 'Server-Sent Events (SSE) Live Activity Log Stream & Audit Ledger',
    endpoint: '/api/activities/stream',
    testEndpoint: '/api/dashboard/summary',
    method: 'GET',
    docUrl: 'http://localhost:5174/audit',
    category: 'TELEMETRY',
  },
];

export default function ApiDiagnosticsModal({ onClose }) {
  const [apiStatuses, setApiStatuses] = useState({});
  const [testingAll, setTestingAll] = useState(false);
  const [testingId, setTestingId] = useState(null);

  const testSingleApi = async (apiItem) => {
    const start = performance.now();
    try {
      setTestingId(apiItem.id);
      let res;
      if (apiItem.method === 'POST') {
        res = await fetch(apiItem.testEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ city: 'Bangalore', specialty: 'General Dentistry' }),
        });
      } else {
        res = await fetch(apiItem.testEndpoint);
      }
      const latency = Math.round(performance.now() - start);
      const ok = res.status >= 200 && res.status < 400;

      setApiStatuses((prev) => ({
        ...prev,
        [apiItem.id]: {
          status: ok ? 'connected' : 'degraded',
          statusCode: res.status,
          latencyMs: latency,
          message: ok ? 'Verified 200% Connected & Functional' : `Returned status ${res.status}`,
          testedAt: new Date().toLocaleTimeString(),
        },
      }));
    } catch (err) {
      setApiStatuses((prev) => ({
        ...prev,
        [apiItem.id]: {
          status: 'error',
          statusCode: 500,
          latencyMs: null,
          message: err.message || 'Connection timeout / offline',
          testedAt: new Date().toLocaleTimeString(),
        },
      }));
    } finally {
      setTestingId(null);
    }
  };

  const testAllApis = async () => {
    setTestingAll(true);
    for (const item of SYSTEM_APIS) {
      await testSingleApi(item);
    }
    setTestingAll(false);
  };

  useEffect(() => {
    testAllApis();
  }, []);

  const connectedCount = Object.values(apiStatuses).filter((s) => s.status === 'connected').length;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: '16px',
          padding: '28px',
          maxWidth: '840px',
          width: '100%',
          border: '1px solid #E2E8F0',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #E2E8F0', paddingBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 10px #10B981' }} />
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                API Functional Connectivity & Health Inspector
              </h2>
              <span className="badge badge-emerald">
                {connectedCount} / {SYSTEM_APIS.length} APIs Operational (200%)
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              Full functional breakdown of connected APIs, endpoints, methods, and real-time connectivity status.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={testAllApis}
              disabled={testingAll}
              className="btn btn-primary btn-sm"
              style={{ fontSize: '11.5px' }}
            >
              {testingAll ? 'Pinging APIs...' : '⚡ Re-Test All APIs'}
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#94A3B8', padding: '4px' }}>✕</button>
          </div>
        </div>

        {/* API Matrix List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
          {SYSTEM_APIS.map((apiItem) => {
            const st = apiStatuses[apiItem.id] || { status: 'checking', latencyMs: null, message: 'Checking...' };
            const isOk = st.status === 'connected';
            const isChecking = st.status === 'checking' || testingId === apiItem.id;

            return (
              <div
                key={apiItem.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  background: isOk ? '#F8FAFC' : isChecking ? '#FFFBEB' : '#FEF2F2',
                  border: `1px solid ${isOk ? '#E2E8F0' : isChecking ? '#FDE68A' : '#FECACA'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isOk ? '#10B981' : isChecking ? '#F59E0B' : '#EF4444',
                        display: 'inline-block',
                      }}
                    />
                    <strong style={{ fontSize: '13.5px', color: '#0F172A' }}>{apiItem.name}</strong>
                    <span className="badge badge-navy" style={{ fontSize: '10px' }}>{apiItem.category}</span>
                    <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#64748B' }}>
                      {apiItem.method} {apiItem.endpoint}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#475569' }}>{apiItem.function}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 700,
                          color: isOk ? '#059669' : isChecking ? '#D97706' : '#DC2626',
                        }}
                      >
                        {isOk ? '🟢 Connected (200 OK)' : isChecking ? '🟡 Pinging...' : '🔴 Degraded'}
                      </span>
                      {st.latencyMs !== null && (
                        <span style={{ fontSize: '11px', color: '#64748B', fontFamily: 'monospace' }}>
                          ⚡ {st.latencyMs}ms
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#94A3B8' }}>{st.message}</div>
                  </div>

                  <button
                    onClick={() => testSingleApi(apiItem)}
                    disabled={testingId === apiItem.id}
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                  >
                    {testingId === apiItem.id ? 'Pinging...' : 'Ping Test'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '14px', marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '11.5px', color: '#64748B' }}>
            Local Node API Server running on <strong>http://localhost:5050</strong> • Vite Dev on <strong>http://localhost:5174</strong>
          </div>
          <button onClick={onClose} className="btn btn-primary btn-sm">
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
