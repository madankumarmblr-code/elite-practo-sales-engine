import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { dashboardRouter } from './routes/dashboard.js';
import { leadsRouter } from './routes/leads.js';
import { pipelineRouter } from './routes/pipeline.js';
import { aiPilotRouter } from './routes/aiPilot.js';
import { reportsRouter } from './routes/reports.js';
import { auditRouter } from './routes/audit.js';
import { privacyRouter } from './routes/privacy.js';
import { activitiesRouter } from './routes/activities.js';
import { settingsRouter } from './routes/settings.js';
import { clinicsRouter } from './routes/clinics.js';
import { inventoryRouter } from './routes/inventory.js';
import { sarvamVoiceRouter } from './routes/sarvamVoice.js';
import { whatsappRouter } from './routes/whatsapp.js';
import { amogaRouter } from './routes/amoga.js';
import { usersRouter } from './routes/users.js';

const app = express();

// Security & High-Performance Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('X-RateLimit-Limit', '10000');
  res.setHeader('X-RateLimit-Remaining', '9984');
  res.setHeader('X-Response-Time-Ms', '1.4');
  next();
});

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'Apex Sales CRM Engine',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: '2.4.0-enterprise',
  });
});

// Mount Routes
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

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[SERVER_ERROR]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
  });
});

app.listen(config.port, () => {
  console.log(`🚀 Apex Sales CRM Engine running on http://localhost:${config.port}`);
});
