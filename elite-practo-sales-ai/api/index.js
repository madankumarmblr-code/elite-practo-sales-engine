import { createApp } from '../backend/src/app.js';
import { bootstrap } from '../backend/src/db/seed.js';
import { restoreFromBlobIfEmpty } from '../backend/src/services/dbSnapshot.js';

let app = null;
let ready = false;
let readyPromise = null;

async function init() {
  if (ready && app) return app;
  if (readyPromise) return readyPromise;

  readyPromise = (async () => {
    await restoreFromBlobIfEmpty();
    bootstrap();
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
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,x-auth-token,x-api-key');
    return res.status(204).end();
  }

  try {
    const expressApp = await init();
    return expressApp(req, res);
  } catch (err) {
    console.error('[Vercel Handler] Fatal:', err);
    res.status(500).json({ error: 'Service initialization error', message: err.message });
  }
}
