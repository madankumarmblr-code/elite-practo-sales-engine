/**
 * Vercel serverless entry — Express API at /api/*
 * Static UI is served from frontend/dist via vercel.json outputDirectory.
 */
if (!process.env.DATA_DIR) {
  process.env.DATA_DIR = '/tmp/practo-sales-data';
}

const { createApp } = await import('../backend/src/app.js');

const app = createApp({
  serveStatic: false,
  warmSheet: true,
});

export default app;
