import { createApp } from '../src/app.js';
import { bootstrap } from '../src/db/seed.js';
import { restoreFromBlobIfEmpty } from '../src/services/dbSnapshot.js';

let app = null;
let ready = false;
let readyPromise = null;

async function init() {
  if (ready && app) return app;
  if (readyPromise) return readyPromise;

  readyPromise = (async () => {
    try {
      await restoreFromBlobIfEmpty();
    } catch (e) {
      console.warn('[Vercel Init] Blob restore warning:', e.message);
    }
    try {
      bootstrap();
    } catch (e) {
      console.warn('[Vercel Init] Bootstrap warning:', e.message);
    }
    app = createApp();
    ready = true;
    return app;
  })();

  return readyPromise;
}

export default async function handler(req, res) {
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-auth-token,x-user-role,x-user-name,x-api-key');
    return res.status(204).end();
  }

  try {
    const expressApp = await init();
    return new Promise((resolve, reject) => {
      res.on('finish', resolve);
      res.on('error', reject);
      expressApp(req, res, (err) => {
        if (err) {
          console.error('[Vercel Handler Express Error]', err);
          if (!res.headersSent) {
            res.status(500).json({ error: err.message || 'Internal server error' });
          }
          resolve();
        } else {
          resolve();
        }
      });
    });
  } catch (err) {
    console.error('[Vercel Handler] Fatal:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Service initialization error', message: err.message });
    }
  }
}
