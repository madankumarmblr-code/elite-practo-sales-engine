import express from 'express';
import { store } from '../db/store.js';

export const activitiesRouter = express.Router();

activitiesRouter.get('/', (req, res) => {
  const limit = parseInt(req.query.limit || '50', 10);
  res.json({
    activities: store.getAuditLogs(limit),
  });
});

// Real-Time Server-Sent Events (SSE) Stream
activitiesRouter.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send initial connected ping
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  const unsubscribe = store.subscribe((event, payload) => {
    res.write(`data: ${JSON.stringify({ type: event, payload, timestamp: new Date().toISOString() })}\n\n`);
  });

  // Keep-alive heartbeat every 20 seconds
  const heartbeat = setInterval(() => {
    res.write(`: heartbeat\n\n`);
  }, 20000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
});
