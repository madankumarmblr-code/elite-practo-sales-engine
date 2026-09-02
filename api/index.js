/**
 * Vercel Serverless Entry Point
 * All /api/* requests are routed here by vercel.json rewrites.
 *
 * On cold start:
 *  1. Restores durable SQLite snapshot from Vercel Blob into /tmp
 *  2. Builds the full Express app with ALL routes registered
 *  3. Caches the promise so subsequent warm invocations skip setup
 */

let appPromise;

async function loadApp() {
  if (!process.env.DATA_DIR) {
    process.env.DATA_DIR = '/tmp/practo-sales-data';
  }

  if (!appPromise) {
    appPromise = (async () => {
      // Restore durable DB snapshot if available (Vercel Blob / KV)
      try {
        const { restoreDurableDb } = await import('../backend/src/services/dbSnapshot.js');
        await restoreDurableDb();
      } catch (err) {
        console.warn('[api/index] DB snapshot restore skipped:', err.message);
      }

      // Build and return the full Express app (all routes registered)
      const mod = await import('../backend/src/app.js');
      const createApp = mod.createApp;
      if (typeof createApp !== 'function') {
        throw new Error('[api/index] createApp is not a function — check backend/src/app.js exports');
      }
      return createApp({ serveStatic: false, warmSheet: true });
    })();
  }

  return appPromise;
}

export default async function handler(req, res) {
  try {
    const app = await loadApp();
    return app(req, res);
  } catch (err) {
    console.error('[api/index] Fatal handler error:', err);
    res.status(500).json({ error: 'Server initialization failed', detail: err.message });
  }
}
