import { authRequired, requirePermission } from '../auth/middleware.js';
import { autopilotService } from '../services/autopilotService.js';
import { persistDurableDbNow } from '../services/dbSnapshot.js';
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
      persistDurableDbNow().catch(() => {});
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

      // Auto-resolve leadId if missing
      let targetLeadId = leadId;
      if (!targetLeadId && phone) {
        const cleanLast10 = String(phone).replace(/\D/g, '').slice(-10);
        if (cleanLast10.length >= 10) {
          const match = db.prepare('SELECT id FROM leads WHERE phone LIKE ? LIMIT 1').get(`%${cleanLast10}`);
          if (match) targetLeadId = match.id;
        }
      }

      // Record activity and advance lead status
      if (targetLeadId) {
        const actId = `act_${Date.now()}`;
        const ts = new Date().toISOString();
        try {
          db.prepare(`
            UPDATE leads SET
              stage = CASE WHEN stage IN ('new', 'open') THEN 'contacted' ELSE stage END,
              status = 'contacted',
              last_contacted_at = ?,
              temperature = COALESCE(NULLIF(temperature, ''), 'warm'),
              next_action = 'Sarvam AI Call initiated — awaiting completion',
              updated_at = ?
            WHERE id = ?
          `).run(ts, ts, targetLeadId);

          db.prepare(`
            INSERT INTO activities (id, lead_id, type, channel, title, detail, status, created_at)
            VALUES (?, ?, 'call', 'voice_ai', ?, ?, 'initiated', datetime('now'))
          `).run(actId, targetLeadId, `Manual Sarvam Voice AI Call (${product.toUpperCase()})`, `Attempt ID: ${callResult.attempt_id} to ${phone}`);
        } catch (leadErr) {
          console.warn('[Autopilot manual-call] Lead update error:', leadErr.message);
        }
      }

      persistDurableDbNow().catch(() => {});
      res.json({ ok: true, ...callResult, leadId: targetLeadId });
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

      // Dispatch via Meta WhatsApp Service (supports both Live Meta Cloud API and 1-Click WhatsApp Web)
      const out = await metaWhatsAppService.sendTextMessage({
        to: cleanPhone,
        text: messageText,
        doctorName: doctorName || 'Doctor',
        clinicName: clinicName || 'Clinic',
        product,
        leadId,
      });

      persistDurableDbNow().catch(() => {});
      res.json({
        ok: true,
        sent: true,
        mode: out.mode,
        phone: cleanPhone,
        message: messageText,
        waLink: out.waLink,
        statusLabel: out.statusLabel,
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

  // ── Retry / Trigger Call for Queue Item ────────────────────────────────────
  app.post(['/api/autopilot/queue/:id/retry-call', '/api/autopilot/queue/:id/trigger-call'], authRequired, requirePermission('leads:write'), async (req, res) => {
    try {
      const result = await autopilotService.triggerVoiceCall(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Trigger WhatsApp Dispatch for Queue Item ──────────────────────────────
  app.post('/api/autopilot/queue/:id/trigger-whatsapp', authRequired, requirePermission('leads:write'), async (req, res) => {
    try {
      const result = await autopilotService.triggerWhatsAppDispatch(req.params.id);
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
      const { count = 15, mode = 'full_auto', product = null, reachSlotId = '', reachSlotDetails = null } = req.body || {};
      const report = await autopilotService.runFullEndToEndAutopilot({
        count: Number(count) || 15,
        mode,
        product,
        reachSlotId,
        reachSlotDetails,
      });
      res.json({ ok: true, report });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── ⚡ Auto-Enqueue Scraped Clinics Directly into Autopilot ─────────────────
  app.post('/api/autopilot/auto-enqueue-scraped', authRequired, requirePermission('leads:write'), async (req, res) => {
    try {
      const { limit = 30, product = 'prime', reachSlotId = '', reachSlotDetails = null, autoStart = true } = req.body || {};
      const result = await autopilotService.autoEnqueueScrapedClinics({
        limit: Number(limit) || 30,
        product,
        reachSlotId,
        reachSlotDetails,
        autoStart,
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // ── ⚡ Get Available Reach Inventory Slots for Autopilot Dropdown ─────────
  app.get('/api/autopilot/available-reach-slots', authRequired, requirePermission('leads:read'), (req, res) => {
    try {
      const { city = '', zone = '', speciality = '', limit = 50 } = req.query;
      const slots = autopilotService.getAvailableReachSlots({
        city,
        zone,
        speciality,
        limit: Number(limit) || 50,
      });
      res.json({ ok: true, slots });
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
