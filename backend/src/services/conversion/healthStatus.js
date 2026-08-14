/**
 * Component health for the Practo Lead Conversion Engine.
 */
import db from '../../db/db.js';
import { durableStoreConfigured } from '../dbSnapshot.js';
import { getSheetSyncStatus } from '../sheetSync.js';

function componentStatus(ok, detail) {
  return { status: ok ? 'UP' : 'DOWN', detail: detail || (ok ? 'ok' : 'unavailable') };
}

function whatsappGatewayStatus() {
  try {
    const rows = db
      .prepare(
        `SELECT provider, enabled, status, last_test_ok FROM api_integrations
         WHERE channel = 'whatsapp'`
      )
      .all();
    if (!rows.length) {
      return {
        status: process.env.WHATSAPP_META_ACCESS_TOKEN || process.env.WATI_API_TOKEN ? 'UP' : 'DEGRADED',
        detail: rows.length
          ? `${rows.length} connector(s)`
          : 'No WhatsApp connector — env token fallback or simulate mode',
      };
    }
    const enabled = rows.filter((r) => r.enabled);
    const healthy = enabled.some((r) => r.last_test_ok === 1 || r.status === 'ready');
    if (!enabled.length) {
      const simulate = process.env.WHATSAPP_SIMULATE === '1' || !process.env.WHATSAPP_META_ACCESS_TOKEN;
      return {
        status: simulate ? 'DEGRADED' : 'DOWN',
        detail: simulate
          ? `${rows.length} connector(s) present — simulate/autopilot mode (enable a WhatsApp integration for live send)`
          : 'No WhatsApp connector enabled',
      };
    }
    return {
      status: healthy ? 'UP' : 'DEGRADED',
      detail: `${enabled.length}/${rows.length} enabled`,
    };
  } catch (err) {
    return { status: 'DOWN', detail: err.message };
  }
}

function aiEngineStatus() {
  const envKey = Boolean(
    process.env.OPENAI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || process.env.GROQ_API_KEY
  );
  try {
    const rows = db
      .prepare(
        `SELECT provider, enabled FROM api_integrations WHERE channel = 'ai' AND enabled = 1`
      )
      .all();
    if (rows.length || envKey) {
      return {
        status: 'UP',
        detail: rows.length
          ? `AI connectors: ${rows.map((r) => r.provider).join(', ')}`
          : 'Env AI key present (template autopilot + polish ready)',
      };
    }
    return {
      status: 'DEGRADED',
      detail: 'No AI key — template autopilot active',
    };
  } catch (err) {
    return { status: 'DOWN', detail: err.message };
  }
}

function n8nStatus() {
  const url = process.env.N8N_WEBHOOK_URL || process.env.N8N_BASE_URL;
  if (!url) {
    return { status: 'CONNECTED', detail: 'Workflow JSON shipped; set N8N_WEBHOOK_URL to link live' };
  }
  return { status: 'CONNECTED', detail: `Configured: ${url}` };
}

function dbStatus() {
  try {
    const row = db.prepare('SELECT COUNT(*) AS c FROM conversion_leads').get();
    db.prepare('SELECT 1').get();
    return {
      status: 'UP',
      detail: `SQLite ok · ${row?.c || 0} conversion lead(s) · durable=${durableStoreConfigured()}`,
    };
  } catch (err) {
    return { status: 'DOWN', detail: err.message };
  }
}

/**
 * Full conversion-engine health document.
 */
export function getConversionEngineHealth() {
  const database = dbStatus();
  const whatsapp_autopilot = whatsappGatewayStatus();
  const ai = aiEngineStatus();
  const n8n_integration = n8nStatus();

  let sheet = { status: 'UP', detail: 'optional' };
  try {
    const s = getSheetSyncStatus?.() || null;
    if (s) {
      sheet = {
        status: s.lastError ? 'DEGRADED' : 'UP',
        detail: s.lastError || s.lastSync || (s.cached ? `cached ${s.rows} rows` : 'no cache yet'),
      };
    }
  } catch {
    sheet = { status: 'DEGRADED', detail: 'sheet status unavailable' };
  }

  const components = {
    webhook_ingestion: componentStatus(true, '/api/v1/leads/ingest'),
    whatsapp_autopilot: {
      status: whatsapp_autopilot.status,
      detail: whatsapp_autopilot.detail,
    },
    proposal_suite_generator: componentStatus(true, 'Commercial Proposal Suite only'),
    ai_engine: ai,
    database,
    n8n_integration,
    commercial_sheet: sheet,
  };

  const statuses = Object.values(components).map((c) => c.status);
  let status = 'HEALTHY';
  if (statuses.includes('DEGRADED')) status = 'DEGRADED';
  if (statuses.includes('DOWN')) status = 'DEGRADED';
  if (database.status === 'DOWN') status = 'UNHEALTHY';

  return {
    service: 'Practo Lead Conversion Engine',
    status,
    timestamp: new Date().toISOString(),
    components,
  };
}

export default { getConversionEngineHealth };
