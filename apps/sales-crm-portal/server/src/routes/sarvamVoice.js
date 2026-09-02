import express from 'express';
import { sarvamVoiceService } from '../services/sarvamVoice.js';
import { rbacMiddleware, PERMISSIONS } from '../services/rbac.js';

export const sarvamVoiceRouter = express.Router();

// ── 1. Webhook listener for Sarvam Call Completion Events ───────────────────
sarvamVoiceRouter.post('/webhook', async (req, res) => {
  try {
    const payload = req.body || {};
    const result = await sarvamVoiceService.handleWebhookPayload(payload);
    res.status(200).json({ ok: true, received: result });
  } catch (err) {
    console.error('[Sarvam Webhook Error]:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── 2. Get Integration Config & Credentials (Masked) ────────────────────────
sarvamVoiceRouter.get('/config', (req, res) => {
  const config = sarvamVoiceService.getConfig();
  res.json({
    ok: true,
    config: {
      ...config,
      apiKey: config.apiKey ? '••••••••' + config.apiKey.slice(-4) : '',
      isConfigured: Boolean(config.apiKey && config.appId && config.connectionId),
    },
  });
});

// ── 3. Save Integration Config ──────────────────────────────────────────────
sarvamVoiceRouter.post('/config', rbacMiddleware(PERMISSIONS.MANAGE_INTEGRATIONS), (req, res) => {
  try {
    const updated = sarvamVoiceService.saveConfig(req.body || {});
    res.json({
      ok: true,
      message: 'Sarvam Voice Agents configuration saved successfully',
      config: {
        ...updated,
        apiKey: updated.apiKey ? '••••••••' + updated.apiKey.slice(-4) : '',
        isConfigured: Boolean(updated.apiKey && updated.appId && updated.connectionId),
      },
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── 4. Test / Ping Connection ───────────────────────────────────────────────
sarvamVoiceRouter.post('/test-connection', async (req, res) => {
  const result = await sarvamVoiceService.testConnection();
  res.json(result);
});

// ── 5. Trigger Instant Outbound Call ────────────────────────────────────────
sarvamVoiceRouter.post('/calls/outbound', rbacMiddleware(PERMISSIONS.UPDATE_LEADS), async (req, res) => {
  try {
    const {
      userPhoneNumber,
      agentVariables,
      appOverrides,
      webhookConfig,
      leadId,
      appId,
      appVersion,
      connectionId,
      agentPhoneNumber,
    } = req.body || {};

    const result = await sarvamVoiceService.triggerInstantOutbound({
      userPhoneNumber,
      agentVariables,
      appOverrides,
      webhookConfig,
      leadId,
      appId,
      appVersion,
      connectionId,
      agentPhoneNumber,
    });

    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[Sarvam Outbound Error]:', err);
    res.status(500).json({ ok: false, error: err.message || 'Failed to trigger outbound call' });
  }
});

// ── 6. Analytics Interactions ───────────────────────────────────────────────
sarvamVoiceRouter.get('/calls/interactions', async (req, res) => {
  try {
    const { startDatetime, endDatetime, limit, offset, appId } = req.query;
    const data = await sarvamVoiceService.getInteractions({
      startDatetime,
      endDatetime,
      limit: limit ? Number(limit) : 20,
      offset: offset ? Number(offset) : 0,
      appId,
    });
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── 7. Get Interaction Transcript ───────────────────────────────────────────
sarvamVoiceRouter.get('/calls/transcripts/:interactionId', async (req, res) => {
  try {
    const { interactionId } = req.params;
    const { appId } = req.query;
    const transcript = await sarvamVoiceService.getTranscript(interactionId, appId);
    res.json({ ok: true, transcript });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── 8. Get Interaction Recording ────────────────────────────────────────────
sarvamVoiceRouter.get('/calls/recordings/:interactionId', async (req, res) => {
  try {
    const { interactionId } = req.params;
    const { appId } = req.query;
    const recording = await sarvamVoiceService.getRecording(interactionId, appId);
    res.json({ ok: true, recording });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── 9. Create Scheduled Campaign ────────────────────────────────────────────
sarvamVoiceRouter.post('/campaigns', rbacMiddleware(PERMISSIONS.TRIGGER_AI_PILOT), async (req, res) => {
  try {
    const result = await sarvamVoiceService.createCampaign(req.body || {});
    res.json({ ok: true, campaign: result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});
