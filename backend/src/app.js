import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { config } from './config.js';
import { healthRouter } from './routes/health.js';
import { apiRouter } from './routes/api.js';
import { registerPulseRoutes } from './routes/pulse.js';
import { registerSarvamVoiceRoutes } from './routes/sarvamVoice.js';
import { registerCommercialRoutes } from './routes/commercial.js';
import { registerLeadRoutes } from './routes/leads.js';
import { registerWhatsAppRoutes } from './routes/whatsapp.js';
import { registerWorkspaceRoutes } from './routes/workspace.js';
import { registerAuditRoutes } from './routes/audit.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerPitchRoutes } from './routes/pitchPilot.js';
import { registerReportRoutes } from './routes/reports.js';

/**
 * Factory function — used by both the local server and the Vercel serverless handler.
 * @param {object} opts
 * @param {boolean} [opts.serveStatic=true]  Serve frontend/dist static assets
 * @param {boolean} [opts.warmSheet=false]   Trigger Google-Sheet sync on startup
 */
export async function createApp({ serveStatic = true, warmSheet = false } = {}) {
  const application = express();

  // ── Security & Parsing Middlewares ────────────────────────────────────────
  application.use(
    cors({
      origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(','),
      credentials: true,
    })
  );
  application.use(express.json({ limit: '10mb' }));
  application.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── Request Logger ─────────────────────────────────────────────────────────
  application.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (!req.path.startsWith('/assets') && !req.path.endsWith('.ico')) {
        console.log(
          `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`
        );
      }
    });
    next();
  });

  // ── Core API routes ────────────────────────────────────────────────────────
  application.use('/api/health', healthRouter);
  application.use('/api', apiRouter);

  // ── Auth routes ────────────────────────────────────────────────────────────
  registerAuthRoutes(application);

  // ── Pulse (Lead Engine, CRM, Autopilot, Calls, Email, WhatsApp) ───────────
  registerPulseRoutes(application);

  // ── Sarvam Voice AI ────────────────────────────────────────────────────────
  registerSarvamVoiceRoutes(application);

  // ── Commercial Suite (Google Sheet inventory + filtering) ─────────────────
  registerCommercialRoutes(application);

  // ── Leads (import / export / save) ────────────────────────────────────────
  registerLeadRoutes(application);

  // ── WhatsApp Cloud API ────────────────────────────────────────────────────
  registerWhatsAppRoutes(application);

  // ── Workspace & Team ──────────────────────────────────────────────────────
  registerWorkspaceRoutes(application);

  // ── Audit Log ─────────────────────────────────────────────────────────────
  registerAuditRoutes(application);

  // ── Pitch Pilot (AI pitch generation) ─────────────────────────────────────
  registerPitchRoutes(application);

  // ── Custom Reports ────────────────────────────────────────────────────────
  registerReportRoutes(application);

  // ── Warm Google Sheet Cache on boot ───────────────────────────────────────
  if (warmSheet) {
    try {
      const { startSheetAutoSync } = await import('./services/sheetSync.js');
      startSheetAutoSync();
    } catch (err) {
      console.warn('[app] Sheet warm-up skipped:', err.message);
    }
  }

  // ── Serve frontend static assets in production ────────────────────────────
  if (serveStatic) {
    const frontendDist = config.frontendDistDir;
    if (fs.existsSync(frontendDist)) {
      application.use(express.static(frontendDist));
      // Serve commercial-suite.html from public/ if present
      const publicDir = path.join(frontendDist, '..', 'public');
      if (fs.existsSync(publicDir)) {
        application.use(express.static(publicDir));
      }
      application.get('*', (req, res, next) => {
        if (req.path.startsWith('/api')) return next();
        res.sendFile(path.join(frontendDist, 'index.html'));
      });
    } else {
      application.get('/', (_req, res) => {
        res.json({
          message: 'Practo Sales Automation API is running',
          version: '2.0.0',
          health: '/api/health',
          sarvam: '/api/sarvam/config',
          pulse: '/api/pulse/meta',
          commercial: '/api/commercial/meta',
        });
      });
    }
  }

  // ── 404 Handler ───────────────────────────────────────────────────────────
  application.use((req, res) => {
    res.status(404).json({
      success: false,
      error: `Route not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // ── Global Error Handler ──────────────────────────────────────────────────
  application.use((err, _req, res, _next) => {
    console.error('[Unhandled Error]', err);
    res.status(err.status || 500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    });
  });

  return application;
}

// NOTE: Do NOT add top-level await here.
// The local dev server (index.js) and Vercel handler (api/index.js) both call createApp() themselves.
