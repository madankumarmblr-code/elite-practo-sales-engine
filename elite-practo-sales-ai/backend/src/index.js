import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { bootstrap } from './db/seed.js';
import { createApp } from './app.js';
import { config, getFrontendDistDir } from './config.js';
import { startSheetAutoSync } from './services/sheetSync.js';
import { restoreFromBlobIfEmpty } from './services/dbSnapshot.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  // Attempt to restore DB from Vercel Blob (no-op locally or if not configured)
  await restoreFromBlobIfEmpty();

  // Bootstrap database (users + integrations)
  bootstrap();

  // Start Google Sheet auto-sync
  if (process.env.SHEET_CSV_URL) {
    startSheetAutoSync();
  }

  const app = createApp();

  // ── Serve frontend in production ───────────────────────────────────────────
  if (config.nodeEnv === 'production') {
    const distDir = getFrontendDistDir();
    if (fs.existsSync(distDir)) {
      const { default: serveStatic } = await import('serve-static');
      app.use(serveStatic(distDir));
      app.use((_req, res) => {
        const indexPath = path.join(distDir, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send('Frontend not built. Run: npm run build -w frontend');
        }
      });
    } else {
      console.warn(`[Server] Frontend dist not found at ${distDir}. Run: npm run build -w frontend`);
    }
  }

  const PORT = config.port;
  const HOST = process.env.HOST || '0.0.0.0';

  const server = http.createServer(app);
  server.listen(PORT, HOST, () => {
    console.log(`\n🚀 Elite Practo Sales AI running on http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
    console.log(`   ENV: ${config.nodeEnv}\n`);
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
      console.log(`\n[Server] ${signal} received — shutting down...`);
      server.close(() => {
        console.log('[Server] HTTP server closed.');
        process.exit(0);
      });
    });
  }
}

main().catch((err) => {
  console.error('[Server] Fatal startup error:', err);
  process.exit(1);
});
