/**
 * Vercel Serverless Function — Apex Sales CRM API
 *
 * All /api/* requests are rewritten here by vercel.json.
 * On Vercel the filesystem is read-only except /tmp, so we redirect
 * all DB writes to /tmp/crm_store.json (in-memory fallback on cold start).
 */

// Force DB path to /tmp so JSON file-store can write on Vercel
if (!process.env.DB_PATH) {
  process.env.DB_PATH = '/tmp/crm_store.json';
}

let appCache;

async function getApp() {
  if (appCache) return appCache;

  const { default: express } = await import('express');
  const { default: cors } = await import('cors');

  // Dynamically import all route modules (server lives in apps/sales-crm-portal/server)
  const [
    { authRouter },
    { dashboardRouter },
    { leadsRouter },
    { pipelineRouter },
    { aiPilotRouter },
    { reportsRouter },
    { auditRouter },
    { privacyRouter },
    { activitiesRouter },
    { settingsRouter },
    { clinicsRouter },
    { inventoryRouter },
    { sarvamVoiceRouter },
    { whatsappRouter },
    { amogaRouter },
    { usersRouter },
  ] = await Promise.all([
    import('../apps/sales-crm-portal/server/src/routes/auth.js'),
    import('../apps/sales-crm-portal/server/src/routes/dashboard.js'),
    import('../apps/sales-crm-portal/server/src/routes/leads.js'),
    import('../apps/sales-crm-portal/server/src/routes/pipeline.js'),
    import('../apps/sales-crm-portal/server/src/routes/aiPilot.js'),
    import('../apps/sales-crm-portal/server/src/routes/reports.js'),
    import('../apps/sales-crm-portal/server/src/routes/audit.js'),
    import('../apps/sales-crm-portal/server/src/routes/privacy.js'),
    import('../apps/sales-crm-portal/server/src/routes/activities.js'),
    import('../apps/sales-crm-portal/server/src/routes/settings.js'),
    import('../apps/sales-crm-portal/server/src/routes/clinics.js'),
    import('../apps/sales-crm-portal/server/src/routes/inventory.js'),
    import('../apps/sales-crm-portal/server/src/routes/sarvamVoice.js'),
    import('../apps/sales-crm-portal/server/src/routes/whatsapp.js'),
    import('../apps/sales-crm-portal/server/src/routes/amoga.js'),
    import('../apps/sales-crm-portal/server/src/routes/users.js'),
  ]);

  const app = express();

  // Security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
  app.use(express.json({ limit: '10mb' }));

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      system: 'Apex Sales CRM Engine',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: '2.4.0-enterprise',
      environment: 'vercel',
    });
  });

  // Mount all routes
  app.use('/api/auth', authRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/leads', leadsRouter);
  app.use('/api/pipeline', pipelineRouter);
  app.use('/api/aipilot', aiPilotRouter);
  app.use('/api/reports', reportsRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/privacy', privacyRouter);
  app.use('/api/activities', activitiesRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/clinics', clinicsRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/sarvam', sarvamVoiceRouter);
  app.use('/api/whatsapp', whatsappRouter);
  app.use('/api/amoga', amogaRouter);
  app.use('/api/users', usersRouter);

  // Global error handler
  app.use((err, req, res, next) => {
    console.error('[VERCEL_API_ERROR]', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    });
  });

  appCache = app;
  return app;
}

export default async function handler(req, res) {
  const app = await getApp();
  return app(req, res);
}
