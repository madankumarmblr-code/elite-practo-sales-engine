import { authRequired, requirePermission } from '../auth/middleware.js';
import { autopilotService } from '../services/autopilotService.js';
import db from '../db/db.js';

export function registerAutopilotRoutes(app) {
  // ── Queue Management ──────────────────────────────────────────────────────
  app.get('/api/autopilot/queue', authRequired, requirePermission('leads:read'), (req, res) => {
    const { status, product, limit, offset } = req.query;
    const items = autopilotService.listQueue({
      status,
      product,
      limit: Number(limit) || 50,
      offset: Number(offset) || 0,
    });
    res.json(items);
  });

  app.get('/api/autopilot/queue/:id', authRequired, requirePermission('leads:read'), (req, res) => {
    const item = autopilotService.getQueueItem(req.params.id);
    if (!item) return res.status(404).json({ error: 'Autopilot queue item not found' });
    res.json(item);
  });

  app.post('/api/autopilot/enqueue', authRequired, requirePermission('leads:write'), async (req, res) => {
    try {
      const item = await autopilotService.enqueueLead(req.body);
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  // ── Direct Manual Call AI Trigger ─────────────────────────────────────────
  app.post('/api/autopilot/manual-call', authRequired, requirePermission('voice:call'), async (req, res) => {
    try {
      const { sarvamVoiceService } = await import('../services/sarvamVoice.js');
      const { phone, doctorName, clinicName, locality, city, speciality, product = 'prime', leadId } = req.body || {};

      if (!phone) return res.status(400).json({ error: 'phone number is required' });

      const callResult = await sarvamVoiceService.triggerProductPitchCall({
        userPhoneNumber: phone,
        product,
        clinicName: clinicName || 'Clinic',
        doctorName: doctorName || 'Doctor',
        locality: locality || 'Bangalore',
        city: city || 'Bangalore',
        speciality: speciality || 'General Physician',
        leadId,
      });

      // Record activity
      if (leadId) {
        const actId = `act_${Date.now()}`;
        db.prepare(`
          INSERT INTO activities (id, lead_id, type, channel, title, detail, status, created_at)
          VALUES (?, ?, 'call', 'voice_ai', ?, ?, 'initiated', datetime('now'))
        `).run(actId, leadId, `Manual Sarvam Voice AI Call (${product.toUpperCase()})`, `Attempt ID: ${callResult.attempt_id} to ${phone}`);
      }

      res.json({ ok: true, ...callResult });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Direct Manual WhatsApp AI Trigger ──────────────────────────────────────
  app.post('/api/autopilot/manual-whatsapp', authRequired, requirePermission('pitch:write'), async (req, res) => {
    try {
      const { metaWhatsAppService } = await import('../services/metaWhatsApp.js');
      const { phone, doctorName, clinicName, product = 'prime', customMessage, leadId } = req.body || {};

      if (!phone) return res.status(400).json({ error: 'phone number is required' });

      let messageText = customMessage;
      if (!messageText) {
        if (product === 'reach') {
          messageText = `Hello Dr. ${doctorName || 'Doctor'},\n\nThis is Practo Reach regarding *${clinicName || 'your clinic'}*. We have opened the exclusive Position 1 Spotlight placement for your speciality in your area.\n\nOnly 1 slot is allocated to capture 100% of high-intent patient searches.\n\nReply *YES* to review search volume and claim this slot.`;
        } else {
          messageText = `Hello Dr. ${doctorName || 'Doctor'},\n\nThis is Practo Prime regarding *${clinicName || 'your clinic'}*. We are activating Practo Prime for top clinics in your area, guaranteeing assured 24/7 online appointments and zero clinic wait times.\n\nReply *YES* to activate your Prime badge with zero setup fees.`;
        }
      }

      let cleanPhone = String(phone).replace(/\D/g, '');
      if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
      const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageText)}`;

      // Attempt send via WhatsApp service if configured
      let sendResult = { sent: false };
      try {
        const out = await metaWhatsAppService.sendTextMessage({ to: cleanPhone, text: messageText });
        sendResult = { sent: true, messageId: out.messageId };
      } catch {
        // Fall back to link mode if Meta WhatsApp API not configured
      }

      if (leadId) {
        const actId = `act_${Date.now()}`;
        db.prepare(`
          INSERT INTO activities (id, lead_id, type, channel, title, detail, status, created_at)
          VALUES (?, ?, 'message', 'whatsapp', ?, ?, 'sent', datetime('now'))
        `).run(actId, leadId, `Manual WhatsApp AI (${product.toUpperCase()})`, messageText);
      }

      res.json({
        ok: true,
        sent: sendResult.sent,
        phone: cleanPhone,
        message: messageText,
        waLink,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Advance Queue Item (Simulated outcome or automated progress) ─────────
  app.post('/api/autopilot/queue/:id/advance', authRequired, requirePermission('leads:write'), async (req, res) => {
    try {
      const { outcome = 'answered_interested' } = req.body || {};
      const updated = await autopilotService.advanceQueueItem(req.params.id, outcome);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Transfer Lead to Human Interference ──────────────────────────────────
  app.post('/api/autopilot/queue/:id/transfer-human', authRequired, requirePermission('leads:write'), async (req, res) => {
    try {
      const { reason } = req.body || {};
      const updated = await autopilotService.transferToHuman(req.params.id, reason);
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Retry Call for RNR / Busy ─────────────────────────────────────────────
  app.post('/api/autopilot/queue/:id/retry-call', authRequired, requirePermission('leads:write'), async (req, res) => {
    try {
      const result = await autopilotService.triggerVoiceCall(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Step / Advance All Pending Items in Pipeline ──────────────────────────
  app.post('/api/autopilot/step', authRequired, requirePermission('leads:write'), async (_req, res) => {
    try {
      const result = await autopilotService.stepActiveQueue();
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Human Approval for Email Proposals ────────────────────────────────────
  app.post('/api/autopilot/queue/:id/approve-email', authRequired, requirePermission('pitch:write'), async (req, res) => {
    try {
      const { customSubject, customBody } = req.body || {};
      const updated = await autopilotService.approveAndSendEmail(req.params.id, {
        approvedBy: req.user.name || 'Sales Representative',
        customSubject,
        customBody,
        req,
      });
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Funnel Analytics Dashboard ────────────────────────────────────────────
  app.get('/api/autopilot/stats', authRequired, requirePermission('dashboard:read'), (_req, res) => {
    res.json(autopilotService.getFunnelStats());
  });

  // ── ⚡ Master 100% Full End-to-End Autopilot Execution ──────────────────────
  app.post('/api/autopilot/run-all', authRequired, requirePermission('leads:write'), async (req, res) => {
    try {
      const { count = 15, mode = 'full_auto', product = null } = req.body || {};
      const report = await autopilotService.runFullEndToEndAutopilot({ count: Number(count) || 15, mode, product });
      res.json({ ok: true, report });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── ⚡ Auto-Enqueue Scraped Clinics Directly into Autopilot ─────────────────
  app.post('/api/autopilot/auto-enqueue-scraped', authRequired, requirePermission('leads:write'), async (req, res) => {
    try {
      const { limit = 30, product = 'prime', autoStart = true } = req.body || {};
      const result = await autopilotService.autoEnqueueScrapedClinics({ limit: Number(limit) || 30, product, autoStart });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── ⚡ Global Automation Status & Mode ──────────────────────────────────────
  app.get('/api/autopilot/automation-status', authRequired, requirePermission('dashboard:read'), (_req, res) => {
    const stats = autopilotService.getFunnelStats();
    res.json({
      ok: true,
      mode: 'full_auto',
      voiceEngine: 'Proprietary Practo Voice AI',
      telephonyProvider: 'Universal Multi-Carrier',
      sttDiarization: 'Dual-Channel Active',
      sentimentAnalysis: 'Dual Perspective (Voice Agent & Human Rep)',
      autoProposalGeneration: 'Enabled (Prime & Reach)',
      autoWhatsAppDispatch: 'Enabled',
      ...stats,
    });
  });

  // ── Sarvam Webhook Integration for Autopilot ──────────────────────────────
  app.post('/api/autopilot/webhook', async (req, res) => {
    try {
      const { attempt_id, status, duration, interaction_id } = req.body || {};
      if (attempt_id) {
        await autopilotService.handleCallOutcome({
          attemptId: attempt_id,
          status: status || 'completed',
          duration: Number(duration) || 0,
          interactionId: interaction_id,
        });
      }
      res.json({ ok: true });
    } catch (err) {
      console.error('[Autopilot Webhook Error]', err.message);
      res.status(200).json({ ok: false, error: err.message });
    }
  });
}
