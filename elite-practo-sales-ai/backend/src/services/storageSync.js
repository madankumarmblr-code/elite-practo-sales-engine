import fs from 'fs';
import path from 'path';
import db from '../db/db.js';
import { getDataDir } from '../config.js';
import { logEvent } from './logger.js';
import { persistDurableDbNow } from './dbSnapshot.js';

const DB_FILE = path.join(getDataDir(), 'elite-sales.db');

export async function getStorageStatus() {
  const dbExists = fs.existsSync(DB_FILE);
  let dbSize = 0;
  let dbMtime = null;

  if (dbExists) {
    try {
      const stats = fs.statSync(DB_FILE);
      dbSize = stats.size;
      dbMtime = stats.mtime.toISOString();
    } catch {}
  }

  // Count records across core enterprise tables
  const tables = [
    'users',
    'roles',
    'leads',
    'scraped_clinics',
    'autopilot_queue',
    'commercial_proposals',
    'call_logs',
    'activities',
    'api_integrations',
  ];

  const counts = {};
  for (const t of tables) {
    try {
      const row = db.prepare(`SELECT COUNT(*) as c FROM ${t}`).get();
      counts[t] = row?.c || 0;
    } catch {
      counts[t] = 0;
    }
  }

  // Check integration configuration
  let storageIntegration = null;
  try {
    storageIntegration = db.prepare('SELECT * FROM api_integrations WHERE provider = ?').get('vercel_blob');
  } catch {}

  const hasBlobToken = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const hasPg = Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
  const hasTurso = Boolean(process.env.TURSO_DATABASE_URL);

  let activeEngine = 'local_sqlite';
  if (hasBlobToken) activeEngine = 'vercel_blob';
  else if (hasPg) activeEngine = 'neon_postgres';
  else if (hasTurso) activeEngine = 'turso_libsql';

  return {
    activeEngine,
    dbFile: DB_FILE,
    dbSizeFormatted: `${(dbSize / 1024).toFixed(1)} KB`,
    dbSizeBytes: dbSize,
    lastModified: dbMtime,
    isServerless: Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME),
    connectedStores: {
      vercelBlob: hasBlobToken,
      postgres: hasPg,
      turso: hasTurso,
    },
    tableCounts: counts,
    integration: storageIntegration ? {
      enabled: storageIntegration.enabled === 1,
      status: storageIntegration.status,
      updated_at: storageIntegration.updated_at,
    } : null,
  };
}

export async function testStorageConnection({ provider, token, databaseUrl }) {
  if (provider === 'vercel_blob') {
    const testToken = token || process.env.BLOB_READ_WRITE_TOKEN;
    if (!testToken) {
      return { success: false, message: 'Vercel Blob token is missing' };
    }
    try {
      const { list } = await import('@vercel/blob');
      const res = await list({ token: testToken, limit: 1 });
      return {
        success: true,
        message: `Connected successfully to Vercel Blob! Found ${res.blobs.length} existing backup blob(s).`,
      };
    } catch (err) {
      return { success: false, message: `Vercel Blob error: ${err.message}` };
    }
  }

  if (provider === 'turso_libsql') {
    const url = databaseUrl || process.env.TURSO_DATABASE_URL;
    if (!url) return { success: false, message: 'Turso Database URL is required' };
    try {
      // libSQL pipeline HTTP test
      const httpUrl = url.replace('libsql://', 'https://') + '/v2/pipeline';
      const res = await fetch(httpUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token || process.env.TURSO_AUTH_TOKEN || ''}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests: [{ type: 'execute', stmt: { sql: 'SELECT 1;' } }] }),
      });
      if (res.ok) {
        return { success: true, message: 'Connected successfully to Turso remote libSQL database!' };
      }
      return { success: false, message: `Turso HTTP response ${res.status}: ${await res.text()}` };
    } catch (err) {
      return { success: false, message: `Turso connection failed: ${err.message}` };
    }
  }

  if (provider === 'postgres') {
    const url = databaseUrl || process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) return { success: false, message: 'PostgreSQL connection URL is required' };
    try {
      // Basic check
      const parsed = new URL(url.replace('postgresql://', 'http://').replace('postgres://', 'http://'));
      return {
        success: true,
        message: `PostgreSQL connection string valid for host: ${parsed.hostname}:${parsed.port || 5432}. Database: ${parsed.pathname.replace('/', '')}`,
      };
    } catch (err) {
      return { success: false, message: `PostgreSQL URL error: ${err.message}` };
    }
  }

  return { success: false, message: `Unsupported storage provider: ${provider}` };
}

export function exportDatabaseSnapshot() {
  const tables = [
    'users',
    'roles',
    'leads',
    'scraped_clinics',
    'autopilot_queue',
    'commercial_proposals',
    'call_logs',
    'activities',
    'api_integrations',
  ];

  const exportData = {
    version: '2.5.0',
    exported_at: new Date().toISOString(),
    system: 'Elite Practo Sales Engine',
    data: {},
  };

  for (const t of tables) {
    try {
      exportData.data[t] = db.prepare(`SELECT * FROM ${t}`).all();
    } catch (err) {
      exportData.data[t] = [];
    }
  }

  return exportData;
}

export function importDatabaseSnapshot(snapshot) {
  if (!snapshot || !snapshot.data) {
    throw new Error('Invalid snapshot structure. Expected { version, exported_at, data: { ... } }');
  }

  const tables = Object.keys(snapshot.data);
  let importedCount = 0;

  for (const t of tables) {
    const rows = snapshot.data[t];
    if (!Array.isArray(rows) || rows.length === 0) continue;

    const sample = rows[0];
    const cols = Object.keys(sample);
    const placeholders = cols.map(() => '?').join(', ');
    const stmt = db.prepare(`INSERT OR REPLACE INTO ${t} (${cols.join(', ')}) VALUES (${placeholders})`);

    for (const r of rows) {
      const vals = cols.map((c) => r[c] === undefined ? null : r[c]);
      try {
        stmt.run(...vals);
        importedCount++;
      } catch (err) {
        console.warn(`[Snapshot Import] Warning on table ${t}:`, err.message);
      }
    }
  }

  logEvent({
    type: 'info',
    category: 'storage',
    message: `Database snapshot imported successfully. Restored ${importedCount} records across ${tables.length} tables.`,
  });

  return { importedCount, tablesRestored: tables.length };
}
