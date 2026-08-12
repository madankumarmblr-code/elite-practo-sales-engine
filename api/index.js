/**
 * Vercel serverless Express entry.
 * All /api/* requests are rewritten here (see vercel.json).
 */
let appPromise;

async function loadApp() {
  if (!process.env.DATA_DIR) {
    process.env.DATA_DIR = '/tmp/practo-sales-data';
  }
  if (!appPromise) {
    appPromise = import('../backend/src/app.js').then((mod) =>
      mod.createApp({ serveStatic: false, warmSheet: true })
    );
  }
  return appPromise;
}

export default async function handler(req, res) {
  const app = await loadApp();
  return app(req, res);
}
