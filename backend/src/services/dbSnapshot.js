import db from '../db/db.js';
import path from 'path';
import fs from 'fs';
import { logEvent } from './logger.js';
import { getDataDir } from '../config.js';

const DB_FILE = path.join(getDataDir(), 'elite-sales.db');
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || '';
const BLOB_PATHNAME = 'elite-sales.db';

let lastPersisted = null;
let lastPersistHash = null;
let persistCooldownUntil = 0;
const PERSIST_COOLDOWN_MS = 10_000;

export function durableStoreConfigured() {
  return Boolean(BLOB_TOKEN);
}

function fileHash() {
  try {
    const stats = fs.statSync(DB_FILE);
    return `${stats.size}_${stats.mtimeMs}`;
  } catch {
    return null;
  }
}

export async function persistDurableDbNow({ force = false } = {}) {
  if (!BLOB_TOKEN) return { persisted: false, reason: 'blob_not_configured' };

  const now = Date.now();
  if (!force && now < persistCooldownUntil) {
    return { persisted: false, reason: 'cooldown', waitMs: persistCooldownUntil - now };
  }

  // Ensure DB in-memory state is flushed to disk/buffer
  if (typeof db.flush === 'function') {
    try { db.flush(); } catch {}
  }

  const hash = fileHash();
  if (!force && hash && hash === lastPersistHash) {
    return { persisted: false, reason: 'unchanged' };
  }

  try {
    const buffer = typeof db.exportBuffer === 'function' ? db.exportBuffer() : fs.readFileSync(DB_FILE);
    if (!buffer || buffer.length === 0) {
      return { persisted: false, reason: 'empty_buffer' };
    }
    const { put } = await import('@vercel/blob');
    const result = await put(BLOB_PATHNAME, buffer, {
      access: 'private',
      token: BLOB_TOKEN,
      addRandomSuffix: false,
    });
    lastPersisted = new Date().toISOString();
    lastPersistHash = hash;
    persistCooldownUntil = now + PERSIST_COOLDOWN_MS;
    logEvent({ type: 'info', category: 'db', message: 'DB persisted to Vercel Blob', detail: result.url });
    return { persisted: true, url: result.url, at: lastPersisted };
  } catch (err) {
    logEvent({ type: 'error', category: 'db', message: 'DB persist to Blob failed', detail: err.message });
    return { persisted: false, reason: 'error', error: err.message };
  }
}

export async function restoreFromBlobIfEmpty() {
  if (!BLOB_TOKEN) return false;

  try {
    const rowCount = db.prepare('SELECT COUNT(*) as c FROM users').get()?.c ?? 0;
    if (rowCount > 0) return false; // DB is populated — no restore needed
  } catch {
    // table not yet created, proceed with restore attempt
  }

  try {
    const { list, download } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: BLOB_PATHNAME, token: BLOB_TOKEN, limit: 1 });
    if (!blobs.length) return false;

    const res = await download(blobs[0].downloadUrl);
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(DB_FILE, buf);

    // CRITICAL: Reload in-memory database instance so active queries reflect restored state
    if (typeof db.reloadFromBuffer === 'function') {
      db.reloadFromBuffer(buf);
    } else if (typeof db.reloadFromFile === 'function') {
      db.reloadFromFile();
    }

    logEvent({ type: 'info', category: 'db', message: 'DB restored from Vercel Blob', detail: blobs[0].downloadUrl });
    return true;
  } catch (err) {
    logEvent({ type: 'warn', category: 'db', message: 'DB restore from Blob failed', detail: err.message });
    return false;
  }
}
