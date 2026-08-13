/**
 * Durable SQLite snapshots for ephemeral hosts (Vercel /tmp).
 *
 * Without this, Settings / API Integrations / CRM writes succeed on one
 * serverless instance then vanish when the next request hits a fresh /tmp.
 *
 * Requires BLOB_READ_WRITE_TOKEN (Vercel Blob store). No-ops elsewhere.
 *
 * Snapshots use better-sqlite3's backup() API (not a raw file copy) so WAL
 * pages are included. A monotonic revision blob prevents a stale warm
 * instance from overwriting a newer snapshot.
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getDataDir } from '../config.js';

const SNAPSHOT_PATHNAME = (process.env.DB_SNAPSHOT_BLOB_PATH || 'practo-sales/sales.db').replace(
  /^\/+/,
  ''
);
const REV_PATHNAME = `${SNAPSHOT_PATHNAME}.rev`;
const REV_SETTING_KEY = 'durable_snapshot_rev';

let persistChain = Promise.resolve();
let restoredThisProcess = false;

export function durableStoreConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function dbFilePath() {
  return path.join(getDataDir(), 'sales.db');
}

function walSidecars(dbPath) {
  return [`${dbPath}-wal`, `${dbPath}-shm`];
}

function clearLocalDbFiles(dbPath) {
  for (const p of [dbPath, ...walSidecars(dbPath)]) {
    try {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    } catch {
      /* ignore */
    }
  }
}

async function blobClient() {
  if (!durableStoreConfigured()) return null;
  return import('@vercel/blob');
}

function readLocalRev(db) {
  try {
    const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(REV_SETTING_KEY);
    if (!row?.value) return 0;
    const parsed = JSON.parse(row.value);
    const n = Number(parsed);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeLocalRev(db, rev) {
  db.prepare(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(REV_SETTING_KEY, JSON.stringify(rev));
}

/**
 * Advance local durable revision after confirming we are not behind Blob.
 * @returns {{ rev: number, stale?: boolean, remoteRev?: number }}
 */
export async function bumpDurableRevisionSync() {
  const { default: db } = await import('../db/db.js');
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  let remoteRev = 0;
  if (durableStoreConfigured() && token) {
    const blob = await blobClient();
    remoteRev = await readRemoteRev(blob, token);
  }
  const cur = readLocalRev(db);
  if (remoteRev > cur) {
    return { rev: cur, stale: true, remoteRev };
  }
  const next = Math.max(cur, remoteRev) + 1;
  writeLocalRev(db, next);
  return { rev: next, stale: false, remoteRev };
}

async function readRemoteRev(blob, token) {
  try {
    const meta = await blob.head(REV_PATHNAME, { token });
    const res = await fetch(meta.url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return 0;
    const n = Number((await res.text()).trim());
    return Number.isFinite(n) ? n : 0;
  } catch {
    try {
      const listed = await blob.list({ prefix: REV_PATHNAME, limit: 5, token });
      const match = (listed.blobs || []).find((b) => b.pathname === REV_PATHNAME);
      if (!match?.url) return 0;
      const res = await fetch(match.url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return 0;
      const n = Number((await res.text()).trim());
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }
}

/**
 * Download the latest durable snapshot into DATA_DIR before opening SQLite.
 * Runs once per process. Overwrites any leftover /tmp DB so cold starts see
 * the newest Settings / Integrations / users snapshot.
 */
export async function restoreDurableDb() {
  if (restoredThisProcess) return { restored: false, reason: 'already_restored' };
  restoredThisProcess = true;

  if (!durableStoreConfigured()) {
    return { restored: false, reason: 'no_blob_token' };
  }

  const dbPath = dbFilePath();
  const dataDir = getDataDir();
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  try {
    const blob = await blobClient();
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    let downloadUrl = null;
    let pathname = SNAPSHOT_PATHNAME;

    try {
      const meta = await blob.head(SNAPSHOT_PATHNAME, { token });
      downloadUrl = meta?.url || null;
      pathname = meta?.pathname || SNAPSHOT_PATHNAME;
    } catch {
      const listed = await blob.list({
        prefix: 'practo-sales/',
        limit: 20,
        token,
      });
      const match =
        (listed.blobs || []).find((b) => b.pathname === SNAPSHOT_PATHNAME) ||
        (listed.blobs || []).find((b) => (b.pathname || '').endsWith('/sales.db')) ||
        (listed.blobs || []).find((b) => (b.pathname || '').endsWith('sales.db'));
      downloadUrl = match?.url || null;
      pathname = match?.pathname || SNAPSHOT_PATHNAME;
    }

    if (!downloadUrl) {
      console.log('Durable DB snapshot not found yet — starting fresh');
      return { restored: false, reason: 'no_snapshot' };
    }

    const res = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`Blob download failed (${res.status})`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) {
      return { restored: false, reason: 'empty_snapshot' };
    }

    clearLocalDbFiles(dbPath);
    fs.writeFileSync(dbPath, buf);
    const rev = await readRemoteRev(blob, token);
    console.log(
      `Restored durable SQLite snapshot (${buf.length} bytes) from ${pathname} (rev ${rev})`
    );
    return { restored: true, bytes: buf.length, pathname, rev };
  } catch (err) {
    console.warn('Durable DB restore failed:', err.message || err);
    return { restored: false, reason: 'error', error: err.message || String(err) };
  }
}

async function consistentBackupBuffer() {
  const { default: db } = await import('../db/db.js');
  const tmpPath = path.join(
    os.tmpdir(),
    `practo-sales-snap-${process.pid}-${Date.now()}.db`
  );
  try {
    // backup() copies committed pages including WAL — unlike raw readFileSync
    await db.backup(tmpPath);
    return { buf: fs.readFileSync(tmpPath), localRev: readLocalRev(db) };
  } finally {
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      /* ignore */
    }
    for (const side of walSidecars(tmpPath)) {
      try {
        if (fs.existsSync(side)) fs.unlinkSync(side);
      } catch {
        /* ignore */
      }
    }
  }
}

/**
 * Upload the current sales.db to Vercel Blob. Serialized so concurrent
 * mutations on THIS instance cannot race two uploads. Stale instances
 * (lower revision than Blob) skip upload to avoid clobbering newer data.
 */
export function persistDurableDb({ force = false } = {}) {
  if (!durableStoreConfigured()) {
    return Promise.resolve({ persisted: false, reason: 'no_blob_token' });
  }

  persistChain = persistChain
    .catch(() => {})
    .then(async () => {
      const dbPath = dbFilePath();
      if (!fs.existsSync(dbPath)) {
        return { persisted: false, reason: 'missing_db' };
      }

      const blob = await blobClient();
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      const { default: db } = await import('../db/db.js');
      let localRev = readLocalRev(db);
      const remoteRev = await readRemoteRev(blob, token);

      if (remoteRev > localRev) {
        console.warn(
          `Skipping durable persist — local rev ${localRev} behind remote ${remoteRev}`
        );
        return {
          persisted: false,
          reason: 'stale_instance',
          localRev,
          remoteRev,
        };
      }

      // Ensure the snapshot we upload carries a rev >= remote
      if (localRev <= remoteRev) {
        localRev = remoteRev + 1;
        writeLocalRev(db, localRev);
      }

      const { buf } = await consistentBackupBuffer();
      if (!buf.length) {
        return { persisted: false, reason: 'empty_db' };
      }

      // Re-check just before upload to reduce clobber races
      const remoteRev2 = await readRemoteRev(blob, token);
      if (remoteRev2 > localRev) {
        return {
          persisted: false,
          reason: 'stale_instance',
          localRev,
          remoteRev: remoteRev2,
        };
      }

      const result = await blob.put(SNAPSHOT_PATHNAME, buf, {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/x-sqlite3',
        token,
      });

      await blob.put(REV_PATHNAME, String(localRev), {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'text/plain',
        token,
      });

      if (force || process.env.DB_SNAPSHOT_DEBUG === '1') {
        console.log(
          `Persisted durable SQLite snapshot (${buf.length} bytes, rev ${localRev}) → ${result.pathname}`
        );
      }
      return {
        persisted: true,
        bytes: buf.length,
        url: result.url,
        pathname: result.pathname,
        rev: localRev,
      };
    })
    .catch((err) => {
      console.warn('Durable DB persist failed:', err.message || err);
      return { persisted: false, reason: 'error', error: err.message || String(err) };
    });

  return persistChain;
}

/**
 * Express middleware: after successful mutating API calls, snapshot the DB.
 * Uses waitUntil on Vercel so the upload can finish after the response.
 */
export function durablePersistMiddleware(req, res, next) {
  if (!durableStoreConfigured()) return next();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

  const p = req.path || '';
  if (
    p === '/auth/login' ||
    p === '/auth/logout' ||
    p.endsWith('/test') ||
    p.endsWith('/self-test') ||
    p.endsWith('/test-all')
  ) {
    return next();
  }

  res.on('finish', () => {
    if (res.statusCode >= 400) return;
    const job = persistDurableDb();
    import('@vercel/functions')
      .then((mod) => {
        if (typeof mod.waitUntil === 'function') mod.waitUntil(job);
      })
      .catch(() => {
        /* local / non-Vercel — fire and forget */
      });
  });
  next();
}

/** Awaited persist for critical settings/integration/user saves. */
export async function persistDurableDbNow() {
  return persistDurableDb({ force: true });
}
