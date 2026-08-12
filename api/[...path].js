/**
 * Vercel catch-all serverless API — handles /api and /api/*
 */
if (!process.env.DATA_DIR) {
  process.env.DATA_DIR = '/tmp/practo-sales-data';
}

const { createApp } = await import('../backend/src/app.js');

export default createApp({
  serveStatic: false,
  warmSheet: true,
});
