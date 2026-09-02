import express from 'express';
import { store } from '../db/store.js';
import { rbacMiddleware, PERMISSIONS } from '../services/rbac.js';

export const settingsRouter = express.Router();

settingsRouter.get('/team', (req, res) => {
  res.json({
    team: store.data.team || [],
  });
});

settingsRouter.get('/integrations', (req, res) => {
  res.json({
    integrations: store.data.integrations || [],
  });
});

settingsRouter.post('/integrations/:id/sync', rbacMiddleware(PERMISSIONS.MANAGE_TEAM), (req, res) => {
  const { id } = req.params;
  const integrations = store.data.integrations || [];
  const target = integrations.find((i) => i.id === id);
  if (!target) return res.status(404).json({ error: 'Integration not found' });

  target.lastSync = new Date().toISOString();
  target.recordsSynced = (target.recordsSynced || 1000) + Math.floor(Math.random() * 50 + 10);
  store.persist();

  store.logAudit({
    action: 'INTEGRATION_SYNC',
    entity: `Manual sync triggered for ${target.name}`,
    user: req.headers['x-user-name'] || 'User',
    ip: req.ip || '127.0.0.1',
    category: 'SYSTEM',
  });

  res.json({ message: 'Sync completed successfully', integration: target });
});

settingsRouter.post('/reset-demo-data', rbacMiddleware(PERMISSIONS.MANAGE_TEAM), (req, res) => {
  store.resetData();
  store.logAudit({
    action: 'SYSTEM_DATABASE_RESET',
    entity: 'Reset CRM database to default seed state',
    user: req.headers['x-user-name'] || 'SuperAdmin',
    ip: req.ip || '127.0.0.1',
    category: 'ADMIN',
  });

  res.json({ message: 'Demo data reset to initial state successfully' });
});
