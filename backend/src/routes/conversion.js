/**
 * Conversion engine HTTP API:
 *  - POST /api/v1/leads/ingest
 *  - POST /api/v1/whatsapp/inbound
 *  - POST /api/v1/proposals/generate
 *  - GET  /api/v1/status  (+ /status alias)
 */
import { ingestLead, getConversionLeadByExternalId, getConversionLeadById } from '../services/conversion/leadIngest.js';
import { handleInboundWhatsApp, rowToLead } from '../services/conversion/whatsappAutopilot.js';
import { generateCommercialProposalSuite } from '../services/conversion/proposalEngine.js';
import { getConversionEngineHealth } from '../services/conversion/healthStatus.js';
import { authRequired } from '../auth/middleware.js';

function webhookAuthorized(req) {
  const configured =
    process.env.LEAD_INGEST_SECRET ||
    process.env.CONVERSION_WEBHOOK_SECRET ||
    process.env.N8N_WEBHOOK_SECRET ||
    '';
  if (!configured) {
    // Dev-friendly: allow when no secret is set; production should set one.
    return process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1' || Boolean(req.user);
  }
  const header =
    req.headers['x-webhook-secret'] ||
    req.headers['x-conversion-secret'] ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : '');
  return header && header === configured;
}

function requireWebhookOrAuth(req, res, next) {
  if (req.user) return next();
  if (webhookAuthorized(req)) return next();
  // Try optional bearer for authenticated UI callers
  return authRequired(req, res, next);
}

function sendError(res, err) {
  const status = err.status || 500;
  return res.status(status).json({
    status: 'ERROR',
    error: err.message || 'Unexpected error',
  });
}

export function registerConversionRoutes(app) {
  app.get(['/status', '/api/v1/status', '/api/v1/health'], (_req, res) => {
    res.json(getConversionEngineHealth());
  });

  app.post('/api/v1/leads/ingest', (req, res, next) => requireWebhookOrAuth(req, res, next), (req, res) => {
    try {
      const autoPitch = req.body?.auto_pitch !== false;
      const simulate =
        req.body?.simulate === true ||
        process.env.WHATSAPP_SIMULATE === '1' ||
        !process.env.WHATSAPP_META_ACCESS_TOKEN;
      const result = ingestLead(req.body || {}, { autoPitch, simulateWhatsApp: simulate });
      res.status(202).json(result);
    } catch (err) {
      sendError(res, err);
    }
  });

  app.post('/api/v1/whatsapp/inbound', (req, res, next) => requireWebhookOrAuth(req, res, next), (req, res) => {
    try {
      const body = req.body || {};
      // Meta-style webhook envelope support
      const message =
        body.text ||
        body.message ||
        body.Body ||
        body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.text?.body ||
        '';
      const phone =
        body.phone ||
        body.from ||
        body.From ||
        body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.from ||
        '';
      const result = handleInboundWhatsApp({
        phone,
        text: message,
        lead_id: body.lead_id,
        conversion_lead_id: body.conversion_lead_id,
        city_location: body.city_location,
        speciality: body.speciality,
      });
      res.json({
        status: 'SUCCESS',
        lead_status: result.status,
        conversion_lead_id: result.conversion_lead_id,
        lead_id: result.lead_id,
        reply: result.reply,
        action: result.action,
        memory: result.memory,
        proposal: result.proposal,
      });
    } catch (err) {
      sendError(res, err);
    }
  });

  // Meta WhatsApp hub challenge (public)
  app.get('/api/v1/whatsapp/inbound', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const expected = process.env.WHATSAPP_VERIFY_TOKEN || process.env.LEAD_INGEST_SECRET;
    if (mode === 'subscribe' && expected && token === expected) {
      return res.status(200).send(String(challenge || ''));
    }
    if (mode === 'subscribe' && !expected) {
      return res.status(200).send(String(challenge || ''));
    }
    return res.status(403).json({ error: 'Verification failed' });
  });

  app.post('/api/v1/proposals/generate', (req, res, next) => requireWebhookOrAuth(req, res, next), (req, res) => {
    try {
      const body = req.body || {};
      let lead = { ...body };

      if (body.lead_id || body.conversion_lead_id) {
        const row =
          (body.conversion_lead_id && getConversionLeadById(body.conversion_lead_id)) ||
          (body.lead_id && getConversionLeadByExternalId(body.lead_id));
        if (row) {
          lead = { ...rowToLead(row), ...body };
          // Context preservation: stored values win unless explicitly provided
          lead.city_location = body.city_location || row.city_location;
          lead.speciality = body.speciality || row.speciality;
          lead.product_id = body.product_id || row.product_id;
        }
      }

      const proposal = generateCommercialProposalSuite(lead);
      res.json(proposal);
    } catch (err) {
      sendError(res, err);
    }
  });
}

export default { registerConversionRoutes };
