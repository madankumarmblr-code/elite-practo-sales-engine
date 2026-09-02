import { Router } from 'express';

export const healthRouter = Router();

healthRouter.get('/', (req, res) => {
  const memoryUsage = process.memoryUsage();
  res.json({
    status: 'ok',
    service: 'Full-Stack Express API',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    memory: {
      rssMB: (memoryUsage.rss / 1024 / 1024).toFixed(2),
      heapUsedMB: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2)
    },
    environment: process.env.NODE_ENV || 'development'
  });
});
