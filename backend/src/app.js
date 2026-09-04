import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerLeadsRoutes } from './routes/leads.js';
import { registerSarvamVoiceRoutes } from './routes/sarvamVoice.js';
import { registerWhatsAppRoutes } from './routes/whatsapp.js';
import { registerIntegrationsRoutes } from './routes/integrations.js';
import { registerScraperRoutes } from './routes/scraper.js';
import { registerProposalRoutes } from './routes/proposal.js';
import { registerAutopilotRoutes } from './routes/autopilot.js';
import { registerUsersRoutes } from './routes/users.js';
import { registerStatusRoutes } from './routes/status.js';

const corsOptions = {
  origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((o) => o.trim()),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'x-api-key'],
  credentials: true,
};

export function createApp() {
  const app = express();

  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Health (public) ────────────────────────────────────────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'elite-practo-sales-api', timestamp: new Date().toISOString(), env: config.nodeEnv });
  });

  // ── Register all route groups ──────────────────────────────────────────────
  registerAuthRoutes(app);
  registerLeadsRoutes(app);
  registerSarvamVoiceRoutes(app);
  registerWhatsAppRoutes(app);
  registerIntegrationsRoutes(app);
  registerScraperRoutes(app);
  registerProposalRoutes(app);
  registerAutopilotRoutes(app);
  registerUsersRoutes(app);
  registerStatusRoutes(app);

  // ── 404 for unknown /api/* routes ─────────────────────────────────────────
  app.use('/api/*', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // ── Global error handler ───────────────────────────────────────────────────
  app.use((err, _req, res, _next) => {
    console.error('[API Error]', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });

  return app;
}
