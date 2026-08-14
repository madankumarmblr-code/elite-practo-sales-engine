import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import './db/db.js';
import './db/seed.js';
import { authRequired } from './auth/middleware.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerLeadRoutes } from './routes/leads.js';
import { registerCommercialRoutes } from './routes/commercial.js';
import { registerWorkspaceRoutes } from './routes/workspace.js';
import { registerPulseRoutes } from './routes/pulse.js';
import { logEvent } from './services/logger.js';
import { syncSheetFromGoogle } from './services/sheetSync.js';
import { reloadLocationsIndex } from './services/locations.js';
import { getFrontendDistDir } from './config.js';
import {
  durablePersistMiddleware,
  durableStoreConfigured,
} from './services/dbSnapshot.js';

/**
 * Build the Express app — Lead Generator + Commercial Suite only.
 * @param {{ serveStatic?: boolean, warmSheet?: boolean }} [options]
 */
export function createApp(options = {}) {
  const serveStatic = options.serveStatic !== false;
  const warmSheet = options.warmSheet === true;
  const isProd = process.env.NODE_ENV === 'production';

  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (warmSheet) {
    let boot;
    app.use(async (req, res, next) => {
      if (!req.path.startsWith('/api') && req.path !== '/api') return next();
      if (!boot) {
        boot = (async () => {
          await syncSheetFromGoogle().catch(() => {});
          try {
            reloadLocationsIndex();
          } catch {
            /* ignore */
          }
        })();
      }
      try {
        await boot;
      } catch {
        /* ignore */
      }
      next();
    });
  }

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'practo-sales-api',
      modules: ['lead-generator', 'commercial-suite', 'practopulse'],
      env: isProd ? 'production' : 'development',
      vercel: Boolean(process.env.VERCEL),
      durableStore: durableStoreConfigured(),
      time: new Date().toISOString(),
    });
  });

  registerAuthRoutes(app);

  app.use('/api', (req, res, next) => {
    if (req.path === '/health' || req.path === '/auth/login') {
      return next();
    }
    return authRequired(req, res, next);
  });

  app.use('/api', (req, res, next) => {
    const started = Date.now();
    res.on('finish', () => {
      if (req.path === '/auth/login') return;
      if (req.path.startsWith('/system/events')) return;
      logEvent({
        type: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
        category: 'api',
        message: `${req.method} ${req.originalUrl}`,
        detail: `status ${res.statusCode} in ${Date.now() - started}ms`,
        userId: req.user?.id || null,
        meta: { method: req.method, path: req.originalUrl, status: res.statusCode },
      });
    });
    next();
  });

  app.use('/api', durablePersistMiddleware);

  registerLeadRoutes(app);
  registerWorkspaceRoutes(app);
  registerCommercialRoutes(app);
  registerPulseRoutes(app);

  if (serveStatic) {
    const distDir = getFrontendDistDir();
    if (fs.existsSync(distDir)) {
      app.use(express.static(distDir, { index: false, maxAge: isProd ? '1h' : 0 }));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) {
          return res.status(404).json({ error: 'Not found' });
        }
        res.sendFile(path.join(distDir, 'index.html'), (err) => {
          if (err) next();
        });
      });
    } else if (isProd) {
      console.warn(`Frontend dist not found at ${distDir}. Run: npm run build`);
    }
  }

  app.use((err, _req, res, _next) => {
    console.error(err);
    logEvent({
      type: 'error',
      category: 'system',
      message: 'Unhandled API error',
      detail: err.message || 'Internal server error',
    });
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}
