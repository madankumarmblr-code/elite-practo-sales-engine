import { authRequired, requirePermission } from '../auth/middleware.js';
import { generateSalesPitch, pickSmartChannel } from '../services/aiAssist.js';
import db from '../db/db.js';
import { nanoid } from 'nanoid';
import { persistDurableDbNow } from '../services/dbSnapshot.js';
import { logEvent } from '../services/logger.js';
import {
  getStorageStatus,
  testStorageConnection,
  exportDatabaseSnapshot,
  importDatabaseSnapshot,
} from '../services/storageSync.js';

const now = () => new Date().toISOString();

export function registerIntegrationsRoutes(app) {
  // ── List all integrations ─────────────────────────────────────────────────
  app.get('/api/integrations', authRequired, requirePermission('api_integrations:read'), (_req, res) => {
    const rows = db.prepare('SELECT * FROM api_integrations ORDER BY category, label').all();
    const masked = rows.map((row) => {
      let secrets = {};
      try { secrets = JSON.parse(row.secrets || '{}'); } catch { secrets = {}; }
      const maskedSecrets = Object.fromEntries(Object.entries(secrets).map(([k, v]) => [k, v ? '••••••••' : '']));
      return { ...row, secrets: maskedSecrets, config: (() => { try { return JSON.parse(row.config || '{}'); } catch { return {}; } })() };
    });
    res.json(masked);
  });

  // ── Get single integration ────────────────────────────────────────────────
  app.get('/api/integrations/:provider', authRequired, requirePermission('api_integrations:read'), (req, res) => {
    const row = db.prepare('SELECT * FROM api_integrations WHERE provider = ?').get(req.params.provider);
    if (!row) return res.status(404).json({ error: 'Integration not found' });
    let secrets = {};
    try { secrets = JSON.parse(row.secrets || '{}'); } catch { /* ignore */ }
    const maskedSecrets = Object.fromEntries(Object.entries(secrets).map(([k, v]) => [k, v ? '••••••••' : '']));
    res.json({ ...row, secrets: maskedSecrets, config: (() => { try { return JSON.parse(row.config || '{}'); } catch { return {}; } })() });
  });

  // ── Update integration ────────────────────────────────────────────────────
  app.put('/api/integrations/:provider', authRequired, requirePermission('api_integrations:write'), async (req, res) => {
    const existing = db.prepare('SELECT * FROM api_integrations WHERE provider = ?').get(req.params.provider);
    if (!existing) return res.status(404).json({ error: 'Integration not found' });

    const b = req.body || {};
    const ts = now();

    let curSecrets = {};
    let curConfig = {};
    try { curSecrets = JSON.parse(existing.secrets || '{}'); } catch { curSecrets = {}; }
    try { curConfig = JSON.parse(existing.config || '{}'); } catch { curConfig = {}; }

    const nextSecrets = { ...curSecrets };
    if (b.secrets && typeof b.secrets === 'object') {
      for (const [k, v] of Object.entries(b.secrets)) {
        if (v && v !== '••••••••') nextSecrets[k] = v;
      }
    }
    const nextConfig = b.config && typeof b.config === 'object' ? { ...curConfig, ...b.config } : curConfig;
    const hasSecrets = Object.values(nextSecrets).some(Boolean);
    const nextEnabled = b.enabled !== undefined ? (b.enabled ? 1 : 0) : existing.enabled;
    let nextStatus = b.status ?? existing.status;
    if (!hasSecrets && (nextStatus === 'connected')) nextStatus = 'ready';

    db.prepare('UPDATE api_integrations SET enabled=?, status=?, config=?, secrets=?, notes=?, updated_at=? WHERE provider=?')
      .run(nextEnabled, nextStatus, JSON.stringify(nextConfig), JSON.stringify(nextSecrets), b.notes !== undefined ? b.notes : existing.notes, ts, existing.provider);

    logEvent({ type: 'info', category: 'integrations', message: `Integration ${existing.provider} updated`, userId: req.user.id });
    await persistDurableDbNow();

    const updated = db.prepare('SELECT * FROM api_integrations WHERE provider = ?').get(existing.provider);
    const maskedSecrets = Object.fromEntries(Object.entries(nextSecrets).map(([k, v]) => [k, v ? '••••••••' : '']));
    res.json({ ...updated, secrets: maskedSecrets, config: nextConfig });
  });

  // ── AI Pitch Generator ────────────────────────────────────────────────────
  app.post('/api/ai/pitch', authRequired, requirePermission('pitch:write'), async (req, res) => {
    const { lead, channel = 'whatsapp', product } = req.body || {};
    if (!lead) return res.status(400).json({ error: '"lead" object is required' });

    try {
      const pitch = await generateSalesPitch({ lead, channel, product });
      const ts = now();
      try {
        db.prepare('INSERT INTO activities (id, lead_id, type, channel, title, detail, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
          .run(nanoid(), lead.id || null, 'pitch', channel, `AI Pitch generated for ${channel}`, pitch.substring(0, 200), 'completed', ts);
      } catch { /* ignore */ }
      res.json({ pitch, channel, lead: { id: lead.id, name: lead.name }, generatedAt: ts });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── AI Test Connection (NVIDIA Nemotron) ──────────────────────────────────
  app.post('/api/ai/test-connection', authRequired, requirePermission('api_integrations:read'), async (_req, res) => {
    try {
      const { testAiConnection } = await import('../services/aiAssist.js');
      const result = await testAiConnection();
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ── Generic Provider Test Endpoint ────────────────────────────────────────
  app.post('/api/integrations/:provider/test', authRequired, requirePermission('api_integrations:read'), async (req, res) => {
    const { provider } = req.params;
    try {
      if (provider === 'google_gemini') {
        const { testGeminiConnection } = await import('../services/aiAssist.js');
        const result = await testGeminiConnection();
        return res.json(result);
      }
      if (provider === 'nvidia_nemotron' || provider === 'meta_llama') {
        const { testAiConnection } = await import('../services/aiAssist.js');
        const result = await testAiConnection();
        return res.json(result);
      }
      if (provider === 'sarvam_voice') {
        const { sarvamVoiceService } = await import('../services/sarvamVoice.js');
        const result = await sarvamVoiceService.testConnection();
        return res.json(result);
      }
      if (provider === 'meta_whatsapp') {
        const { metaWhatsAppService } = await import('../services/metaWhatsApp.js');
        const result = await metaWhatsAppService.testConnection();
        return res.json(result);
      }
      if (provider === 'apollo_io') {
        const row = db.prepare("SELECT secrets FROM api_integrations WHERE provider = 'apollo_io'").get();
        let key = process.env.APOLLO_API_KEY || '';
        try {
          if (row) {
            const s = JSON.parse(row.secrets || '{}');
            if (s.apiKey) key = s.apiKey;
          }
        } catch {}
        if (!key) return res.status(400).json({ success: false, message: 'Apollo.io API Key is not configured' });
        const aRes = await fetch('https://api.apollo.io/v1/auth/health', {
          headers: { 'Cache-Control': 'no-cache', 'X-Api-Key': key },
          signal: AbortSignal.timeout(5000),
        });
        if (aRes.ok) {
          return res.json({ success: true, message: 'Apollo.io B2B Intelligence verified & connected' });
        }
        return res.status(400).json({ success: false, message: `Apollo.io returned HTTP ${aRes.status}` });
      }
      if (provider === 'google_maps') {
        const row = db.prepare("SELECT secrets FROM api_integrations WHERE provider = 'google_maps'").get();
        let key = process.env.GOOGLE_MAPS_API_KEY || '';
        try {
          if (row) {
            const s = JSON.parse(row.secrets || '{}');
            if (s.apiKey) key = s.apiKey;
          }
        } catch {}
        if (!key) return res.status(400).json({ success: false, message: 'Google Maps API Key is not configured' });
        const gRes = await fetch(`https://maps.googleapis.com/maps/api/place/textsearch/json?query=clinic&key=${key}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (gRes.ok) {
          const d = await gRes.json();
          if (d.status === 'OK' || d.status === 'ZERO_RESULTS') {
            return res.json({ success: true, message: 'Google Maps Places API verified & connected' });
          }
          return res.status(400).json({ success: false, message: `Google Places: ${d.error_message || d.status}` });
        }
        return res.status(400).json({ success: false, message: `Google Maps HTTP error ${gRes.status}` });
      }
      res.json({ success: true, message: `${provider} verified ready` });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // ── Smart Channel Picker ──────────────────────────────────────────────────
  app.post('/api/ai/smart-channel', authRequired, requirePermission('leads:read'), (req, res) => {
    const { lead } = req.body || {};
    if (!lead) return res.status(400).json({ error: '"lead" object is required' });
    res.json(pickSmartChannel(lead));
  });

  // ── Settings ──────────────────────────────────────────────────────────────
  app.get('/api/settings', authRequired, requirePermission('settings:read'), (_req, res) => {
    const rows = db.prepare('SELECT * FROM app_settings').all();
    const settings = {};
    for (const r of rows) {
      try { settings[r.key] = JSON.parse(r.value); } catch { settings[r.key] = r.value; }
    }
    res.json(settings);
  });

  app.put('/api/settings', authRequired, requirePermission('settings:write'), async (req, res) => {
    const body = req.body || {};
    const upsert = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)');
    const tx = db.transaction(() => {
      for (const [key, value] of Object.entries(body)) {
        upsert.run(key, typeof value === 'string' ? value : JSON.stringify(value));
      }
    });
    tx();
    logEvent({ type: 'info', category: 'settings', message: 'App settings updated', userId: req.user.id, meta: body });
    await persistDurableDbNow();
    res.json({ ok: true, updated: Object.keys(body).length });
  });

  // ── Audit log ─────────────────────────────────────────────────────────────
  app.get('/api/audit', authRequired, requirePermission('audit:read'), async (req, res) => {
    try {
      const { limit = 50, offset = 0, action, entityType, actorRole, search, startDate, endDate } = req.query;
      const { listAuditLogs } = await import('../services/auditLogger.js');
      res.json(listAuditLogs({ limit: Number(limit), offset: Number(offset), action, entityType, actorRole, search, startDate, endDate }));
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── Compliance scorecard ───────────────────────────────────────────────────
  app.get('/api/compliance', authRequired, requirePermission('compliance:read'), async (_req, res) => {
    try {
      const { getComplianceScorecard } = await import('../services/auditLogger.js');
      res.json(getComplianceScorecard());
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // ── Pipeline stages ────────────────────────────────────────────────────────
  app.get('/api/pipeline-stages', authRequired, requirePermission('leads:read'), (_req, res) => {
    res.json(db.prepare('SELECT * FROM pipeline_stages ORDER BY position').all());
  });

  // ── Notifications ──────────────────────────────────────────────────────────
  app.get('/api/notifications', authRequired, requirePermission('dashboard:read'), (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const rows = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?').all(limit);
    const unread = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE is_read = 0').get().c;
    res.json({ notifications: rows, unread });
  });

  app.post('/api/notifications/mark-read', authRequired, requirePermission('dashboard:read'), (req, res) => {
    const { ids = [] } = req.body || {};
    if (ids.length === 0) {
      db.prepare('UPDATE notifications SET is_read = 1').run();
    } else {
      const stmt = db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?');
      for (const id of ids) stmt.run(id);
    }
    res.json({ ok: true });
  });

  // ── Dashboard stats ────────────────────────────────────────────────────────
  app.get('/api/dashboard/stats', authRequired, requirePermission('dashboard:read'), (_req, res) => {
    const totalLeads = db.prepare('SELECT COUNT(*) as c FROM leads').get().c;
    const leadsThisMonth = db.prepare("SELECT COUNT(*) as c FROM leads WHERE created_at >= date('now', 'start of month')").get().c;
    const wonLeads = db.prepare("SELECT COUNT(*) as c FROM leads WHERE stage = 'won'").get().c;
    const totalCalls = db.prepare('SELECT COUNT(*) as c FROM call_logs').get().c;
    const totalMessages = db.prepare("SELECT COUNT(*) as c FROM outreach_messages WHERE channel = 'whatsapp'").get().c;
    const byStage = db.prepare('SELECT stage, COUNT(*) as count FROM leads GROUP BY stage').all();

    res.json({
      leads: { total: totalLeads, thisMonth: leadsThisMonth, won: wonLeads, conversionRate: totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0.0' },
      outreach: { calls: totalCalls, whatsapp: totalMessages },
      pipeline: byStage,
      updatedAt: new Date().toISOString(),
    });
  });

  // ── Enterprise Storage Management (Vercel, Neon/Postgres, Turso & Snapshots) ──
  app.get('/api/storage/status', authRequired, requirePermission('api_integrations:read'), async (_req, res) => {
    try {
      const status = await getStorageStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/storage/test', authRequired, requirePermission('api_integrations:write'), async (req, res) => {
    try {
      const result = await testStorageConnection(req.body || {});
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  app.post('/api/storage/sync-now', authRequired, requirePermission('api_integrations:write'), async (req, res) => {
    try {
      const result = await persistDurableDbNow({ force: true });
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get('/api/storage/export-snapshot', authRequired, requirePermission('api_integrations:read'), (_req, res) => {
    try {
      const snapshot = exportDatabaseSnapshot();
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=elite-sales-snapshot-${new Date().toISOString().split('T')[0]}.json`);
      res.json(snapshot);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/storage/import-snapshot', authRequired, requirePermission('api_integrations:write'), (req, res) => {
    try {
      const result = importDatabaseSnapshot(req.body);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });
}

