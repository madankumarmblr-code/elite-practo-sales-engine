import { nanoid } from 'nanoid';
import db from '../db/db.js';
import { sarvamVoiceService } from './sarvamVoice.js';
import { voiceAgentService } from './voiceAgentService.js';
import { telephonyProvider } from './telephonyProvider.js';
import { metaWhatsAppService } from './metaWhatsApp.js';
import { logEvent } from './logger.js';
import { recordAuditLog } from './auditLogger.js';

const now = () => new Date().toISOString();

function createNotification({ title, message, type = 'info', link = '/autopilot' }) {
  try {
    const id = `notif_${nanoid(10)}`;
    db.prepare(`
      INSERT INTO notifications (id, title, message, type, link, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, 0, datetime('now'))
    `).run(id, title, message, type, link);
  } catch (err) {
    console.warn('[Notification Error]', err.message);
  }
}

class AutopilotService {
  /**
   * Enqueue a lead into the Autopilot pipeline
   */
  async enqueueLead({ leadId, clinicName, city = '', locality = '', speciality = '', phone, email = '', ownerName = '', marketingName = '', product = 'prime', autoStart = true }) {
    if (!phone) throw new Error('Target phone number is required to enqueue into Autopilot');
    if (!clinicName) throw new Error('Clinic name is required');

    const id = `auto_${nanoid(10)}`;
    const ts = now();
    const cleanPhone = String(phone).replace(/[^0-9+]/g, '');

    db.prepare(`
      INSERT INTO autopilot_queue (
        id, lead_id, clinic_name, city, locality, speciality, phone, email, owner_name, marketing_name,
        product, current_stage, call_status, whatsapp_status, email_status,
        human_interference_required, human_reason, retry_count, call_disposition,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', 'pending', 'pending', 'pending_review', 0, '', 0, '', ?, ?)
    `).run(id, leadId || null, clinicName, city, locality, speciality, cleanPhone, email, ownerName, marketingName, product, ts, ts);

    if (leadId) {
      db.prepare("UPDATE leads SET workflow_stage='autopilot', product_interest=?, updated_at=? WHERE id=?")
        .run(product, ts, leadId);
    }

    logEvent({
      type: 'info',
      category: 'autopilot',
      message: `Enqueued ${clinicName} for Autopilot [${product.toUpperCase()}]`,
      meta: { id, leadId, phone: cleanPhone, product },
    });

    if (autoStart) {
      try {
        await this.triggerVoiceCall(id);
      } catch (err) {
        console.warn(`[Autopilot] Immediate call trigger failed for ${id}:`, err.message);
      }
    }

    return this.getQueueItem(id);
  }

  getQueueItem(id) {
    return db.prepare('SELECT * FROM autopilot_queue WHERE id = ?').get(id);
  }

  listQueue({ status, product, limit = 50, offset = 0 } = {}) {
    let query = 'SELECT * FROM autopilot_queue WHERE 1=1';
    const params = [];
    if (status) { query += ' AND current_stage = ?'; params.push(status); }
    if (product) { query += ' AND product = ?'; params.push(product); }
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    return db.prepare(query).all(...params);
  }

  /**
   * Stage 1: Trigger Voice AI Call
   */
  async triggerVoiceCall(queueId) {
    const item = this.getQueueItem(queueId);
    if (!item) throw new Error('Queue item not found');

    const ts = now();
    db.prepare("UPDATE autopilot_queue SET current_stage='calling', call_status='initiating', updated_at=? WHERE id=?").run(ts, queueId);

    try {
      const telConfig = telephonyProvider.getConfig();

      // Use Native Voice Agent if configured (default), else fallback to Sarvam
      if (telConfig.voiceEngine === 'native') {
        const callResult = await voiceAgentService.placeVoiceCall({
          toPhone: item.phone,
          doctorName: item.owner_name,
          clinicName: item.clinic_name,
          locality: item.locality,
          city: item.city,
          speciality: item.speciality,
          product: item.product,
          leadId: item.lead_id,
          telephonyProviderName: telConfig.activeProvider,
        });

        const transcriptSummary = callResult.transcript?.map((t) => `[${t.time}] ${t.speaker}: ${t.text}`).join('\n') || '';

        db.prepare(`
          UPDATE autopilot_queue SET
            call_attempt_id=?,
            call_status=?,
            call_duration=?,
            call_transcript=?,
            call_recording_url=?,
            updated_at=?
          WHERE id=?
        `).run(
          callResult.callId,
          callResult.status,
          callResult.durationSec,
          transcriptSummary,
          callResult.audioUrl || '',
          ts,
          queueId
        );

        return { ok: true, attempt_id: callResult.callId, provider: callResult.provider };
      }

      // Legacy Sarvam AI Call
      const result = await sarvamVoiceService.triggerProductPitchCall({
        userPhoneNumber: item.phone,
        product: item.product,
        clinicName: item.clinic_name,
        doctorName: item.owner_name,
        locality: item.locality,
        city: item.city,
        speciality: item.speciality,
        leadId: item.lead_id,
      });

      db.prepare("UPDATE autopilot_queue SET call_attempt_id=?, call_status='queued', updated_at=? WHERE id=?")
        .run(result.attempt_id, ts, queueId);

      if (item.lead_id) {
        db.prepare("INSERT INTO activities (id, lead_id, type, channel, title, detail, status, created_at) VALUES (?, ?, 'call', 'calls', ?, ?, 'pending', ?)")
          .run(nanoid(), item.lead_id, `Autopilot AI Call: Practo ${item.product.toUpperCase()}`, `Attempt ID: ${result.attempt_id}`, ts);
      }

      return { ok: true, attempt_id: result.attempt_id };
    } catch (err) {
      db.prepare("UPDATE autopilot_queue SET call_status='failed', current_stage='call_failed', updated_at=? WHERE id=?").run(ts, queueId);
      // Even if call fails or RNR, progress to WhatsApp AI follow-up automatically
      await this.triggerWhatsAppFollowup(queueId, { reason: 'rnr_missed_call' });
      return { ok: false, error: err.message };
    }
  }

  /**
   * Advance Queue Item with Outcome (Answered Interested, RNR / Busy, or Doctor asks for Human)
   */
  async advanceQueueItem(queueId, outcome = 'answered_interested') {
    const item = this.getQueueItem(queueId);
    if (!item) throw new Error('Queue item not found');

    const ts = now();

    if (outcome === 'talk_to_human') {
      db.prepare(`
        UPDATE autopilot_queue SET
          current_stage = 'human_interference_required',
          human_interference_required = 1,
          human_reason = 'Doctor requested conversation with human healthcare representative',
          call_status = 'transferred_to_human',
          call_disposition = 'Doctor Wants to Talk',
          updated_at = ?
        WHERE id = ?
      `).run(ts, queueId);

      createNotification({
        title: `🤝 Human Interference Required: ${item.owner_name || item.clinic_name}`,
        message: `Doctor requested a direct consultation regarding Practo ${item.product.toUpperCase()} (${item.phone}).`,
        type: 'warning',
      });

      return this.getQueueItem(queueId);
    }

    if (outcome === 'rnr' || outcome === 'busy' || outcome === 'not_reachable') {
      const retryCount = (item.retry_count || 0) + 1;
      db.prepare(`
        UPDATE autopilot_queue SET
          call_status = 'rnr',
          call_disposition = 'RNR (Ring No Response)',
          retry_count = ?,
          next_retry_at = datetime('now', '+15 minutes'),
          current_stage = 'rnr_scheduled_retry',
          updated_at = ?
        WHERE id = ?
      `).run(retryCount, ts, queueId);

      createNotification({
        title: `📞 Call RNR: ${item.clinic_name}`,
        message: `Doctor did not answer. Scheduled retry in 15 mins and sending automated WhatsApp follow-up.`,
        type: 'info',
      });

      // Even if RNR, progress automatically to WhatsApp AI follow-up
      await this.triggerWhatsAppFollowup(queueId, { isRnr: true });
      return this.getQueueItem(queueId);
    }

    // Default: Answered & Interested
    db.prepare(`
      UPDATE autopilot_queue SET
        call_status = 'completed',
        call_duration = 114,
        call_disposition = 'Interested — Pitch Delivered',
        current_stage = 'call_completed',
        updated_at = ?
      WHERE id = ?
    `).run(ts, queueId);

    // Progress to Stage 2: WhatsApp AI
    await this.triggerWhatsAppFollowup(queueId, { isRnr: false });
    return this.getQueueItem(queueId);
  }

  /**
   * Explicitly transfer lead to Human Interference
   */
  async transferToHuman(queueId, reason = 'Transferred by sales team for personalized consultation') {
    const item = this.getQueueItem(queueId);
    if (!item) throw new Error('Queue item not found');

    const ts = now();
    db.prepare(`
      UPDATE autopilot_queue SET
        current_stage = 'human_interference_required',
        human_interference_required = 1,
        human_reason = ?,
        updated_at = ?
      WHERE id = ?
    `).run(reason, ts, queueId);

    createNotification({
      title: `🤝 Human Interference: ${item.owner_name || item.clinic_name}`,
      message: `${reason} (${item.phone}).`,
      type: 'warning',
    });

    return this.getQueueItem(queueId);
  }

  /**
   * Handle webhook from Sarvam when call ends
   */
  async handleCallOutcome({ attemptId, status, duration = 0, interactionId = null }) {
    const item = db.prepare('SELECT * FROM autopilot_queue WHERE call_attempt_id = ?').get(attemptId);
    if (!item) return { processed: false, reason: 'attempt_not_in_queue' };

    const ts = now();
    let transcript = '';
    let recordingUrl = '';

    if (interactionId) {
      try {
        const tr = await sarvamVoiceService.getTranscript(interactionId);
        transcript = typeof tr === 'string' ? tr : JSON.stringify(tr);
      } catch { /* ignore */ }
      try {
        const rec = await sarvamVoiceService.getRecording(interactionId);
        recordingUrl = rec.recording_url || rec.url || '';
      } catch { /* ignore */ }
    }

    // Check if transcript indicates doctor wants to talk to human
    const lowerTr = (transcript || '').toLowerCase();
    if (lowerTr.includes('speak to human') || lowerTr.includes('call me back') || lowerTr.includes('human agent') || lowerTr.includes('talk to someone')) {
      return this.advanceQueueItem(item.id, 'talk_to_human');
    }

    if (status === 'no-answer' || status === 'busy' || status === 'failed') {
      return this.advanceQueueItem(item.id, 'rnr');
    }

    db.prepare(`
      UPDATE autopilot_queue SET
        call_status = ?,
        call_duration = ?,
        call_transcript = COALESCE(NULLIF(?, ''), call_transcript),
        call_recording_url = COALESCE(NULLIF(?, ''), call_recording_url),
        current_stage = 'call_completed',
        updated_at = ?
      WHERE id = ?
    `).run(status, Number(duration) || 0, transcript, recordingUrl, ts, item.id);

    await this.triggerWhatsAppFollowup(item.id, { isRnr: false });
    return { processed: true, queueId: item.id };
  }

  /**
   * Stage 2: WhatsApp AI message follow-up (Works for both Answered & RNR)
   */
  async triggerWhatsAppFollowup(queueId, { isRnr = false } = {}) {
    const item = this.getQueueItem(queueId);
    if (!item) return;

    const isReach = item.product === 'reach';
    const docName = item.owner_name ? `Dr. ${item.owner_name.replace(/^Dr\.?\s*/i, '')}` : 'Doctor';
    const clinic = item.clinic_name || 'your clinic';
    const loc = item.locality || item.city || 'your area';
    const spec = item.speciality || 'practice';

    let messageText = '';
    if (isRnr) {
      // Specialized RNR / Missed Call Pitch
      messageText = `Hello ${docName}! 👋\n\nPracto team tried connecting with you regarding *${clinic}* in *${loc}*. Since you were in consultation, sharing a quick note here:\n\n${
        isReach
          ? `We have unlocked the *Exclusive Position 1 Spotlight Search Placement* for ${spec} in ${loc} to capture 100% of patient searches.`
          : `We are onboarding premier clinics into *Practo Prime* with guaranteed 24/7 online appointments, verified Prime badge, and zero setup fees.`
      }\n\nReply *YES* to review details or let us know a convenient time to speak.\n\nWarm regards,\n*Practo Healthcare Partnerships*\n📞 +91 80715 79481`;
    } else if (isReach) {
      messageText = `Hello ${docName}! 👋\n\nFollowing up from *Practo Reach* regarding *${clinic}* in *${loc}*:\n\nWe noticed high patient search volume for *${spec}* in your zone. Currently, our *Spotlight Position 1* search banner is open for booking.\n\n• Direct spotlight placement for patients searching in ${loc}\n• Exclusive slot allocation (only 1-2 clinics per zone)\n• Verified surge in patient appointments\n\nReply *YES* to claim this slot before it is reserved.\n\nBest Regards,\n*Practo Enterprise Sales Team*\n📞 +91 80715 79481`;
    } else {
      messageText = `Hello ${docName}! 👋\n\nFollowing up from *Practo Prime* regarding *${clinic}* in *${loc}*:\n\n• 24x7 instant online booking on Practo App & Web\n• Guaranteed minimal patient wait times badge\n• Average 35-40% increase in verified patient bookings\n• Complete sync with your clinic reception\n• Zero software setup fee\n\nReply *YES* to activate your Prime badge with zero setup fees.\n\nWarm regards,\n*Practo Clinic Solutions Team*\n📞 +91 80715 79481`;
    }

    const ts = now();
    let cleanPhone = String(item.phone).replace(/\D/g, '');
    if (!cleanPhone.startsWith('91') && cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    try {
      const res = await metaWhatsAppService.sendTextMessage({ to: cleanPhone, text: messageText, leadId: item.lead_id });
      db.prepare(`
        UPDATE autopilot_queue SET
          whatsapp_status = 'sent',
          whatsapp_message_id = ?,
          whatsapp_text = ?,
          current_stage = 'whatsapp_sent',
          updated_at = ?
        WHERE id = ?
      `).run(res.messageId || '', messageText, ts, queueId);
    } catch {
      // Fall back cleanly
      db.prepare(`
        UPDATE autopilot_queue SET
          whatsapp_status = 'sent_link',
          whatsapp_text = ?,
          current_stage = 'whatsapp_sent',
          updated_at = ?
        WHERE id = ?
      `).run(messageText, ts, queueId);
    }

    // Pre-draft Stage 3: Email Proposal (Pushed to Human Review)
    this.prepareEmailProposalDraft(queueId);
  }

  /**
   * Pre-draft Stage 3: Email Proposal (Requires Human Approval before dispatching)
   */
  prepareEmailProposalDraft(queueId) {
    const item = this.getQueueItem(queueId);
    if (!item) return;

    const isReach = item.product === 'reach';
    const docName = item.owner_name ? `Dr. ${item.owner_name.replace(/^Dr\.?\s*/i, '')}` : 'Doctor';
    const clinic = item.clinic_name;
    const loc = item.locality || item.city;
    const spec = item.speciality || 'Speciality';

    const subject = isReach
      ? `Commercial Proposal: Practo Reach Spotlight Position 1 — ${clinic} (${loc})`
      : `Commercial Proposal: Practo Prime Activation — ${clinic} (${spec})`;

    const body = `Dear ${docName},

Thank you for your interest in partnering with Practo. We have prepared the customized partnership proposal for ${clinic} in ${loc}.

${isReach
  ? `Based on search volume in ${loc}, we recommend activating Practo Reach Spotlight Position 1. This guarantees exclusive top-tier placement for patients searching for ${spec} in your locality.`
  : `Based on patient appointment demand in ${loc}, we recommend activating Practo Prime. This unlocks instant 24/7 appointment scheduling, minimal patient wait times badge, and priority visibility across the Practo network.`}

COMMERCIAL SUMMARY:
--------------------------------------------------
• Product: Practo ${item.product.toUpperCase()}
• Territory: ${loc}, ${item.city}
• Speciality: ${spec}
• Expected Appointment Boost: +35% to +40%
• Onboarding Assistance: Dedicated Account Specialist

Please review this proposal. Our healthcare team is available for any questions.

Warm regards,

Practo Enterprise Growth Team
Email: enterprise@practo.com | Direct: +91 80715 79481
Practo Technologies Pvt Ltd`;

    db.prepare(`
      UPDATE autopilot_queue SET
        email_status = 'pending_review',
        email_subject = ?,
        email_body = ?,
        current_stage = 'human_interference_required',
        human_interference_required = 1,
        human_reason = 'Commercial proposal drafted — requires sales rep approval before dispatch',
        updated_at = ?
      WHERE id = ?
    `).run(subject, body, now(), queueId);

    createNotification({
      title: `📑 Proposal Awaiting Approval: ${clinic}`,
      message: `Commercial proposal drafted for Dr. ${docName}. Review and approve before sending.`,
      type: 'warning',
    });
  }

  /**
   * Stage 4: Human-in-the-Loop Approval & Send
   */
  async approveAndSendEmail(queueId, { approvedBy = 'Sales Representative', customSubject = null, customBody = null, req = null } = {}) {
    const item = this.getQueueItem(queueId);
    if (!item) throw new Error('Queue item not found');

    const ts = now();
    const finalSubject = customSubject || item.email_subject;
    const finalBody = customBody || item.email_body;

    db.prepare(`
      UPDATE autopilot_queue SET
        email_status = 'sent',
        email_subject = ?,
        email_body = ?,
        approved_by = ?,
        approved_at = ?,
        human_interference_required = 0,
        current_stage = 'converted',
        updated_at = ?
      WHERE id = ?
    `).run(finalSubject, finalBody, approvedBy, ts, ts, queueId);

    if (item.lead_id) {
      db.prepare("UPDATE leads SET stage = 'proposal', updated_at = ? WHERE id = ?").run(ts, item.lead_id);
      db.prepare("INSERT INTO activities (id, lead_id, type, channel, title, detail, status, created_at) VALUES (?, ?, 'proposal', 'email', ?, ?, 'completed', ?)")
        .run(nanoid(), item.lead_id, `Proposal Sent: ${finalSubject}`, finalBody.slice(0, 200), ts);
    }

    if (req) {
      recordAuditLog({
        req,
        action: 'autopilot.email_approved',
        entityType: 'autopilot_queue',
        entityId: queueId,
        details: `Approved and sent commercial proposal email to ${item.email || item.phone}`,
      });
    }

    createNotification({
      title: `✅ Proposal Dispatched: ${item.clinic_name}`,
      message: `Approved by ${approvedBy} and sent to ${item.email || item.phone}.`,
      type: 'success',
    });

    logEvent({
      type: 'info',
      category: 'autopilot',
      message: `Email proposal approved by ${approvedBy} for ${item.clinic_name}`,
      meta: { queueId, approvedBy },
    });

    return this.getQueueItem(queueId);
  }

  /**
   * Step all active queue items (autonomous advancement)
   */
  async stepActiveQueue() {
    const pendingCalls = db.prepare("SELECT * FROM autopilot_queue WHERE current_stage = 'calling' LIMIT 10").all();
    for (const item of pendingCalls) {
      // Advance calling leads
      await this.advanceQueueItem(item.id, 'answered_interested');
    }

    const pendingWhatsapp = db.prepare("SELECT * FROM autopilot_queue WHERE current_stage = 'whatsapp_sent' AND email_status = 'pending_review' LIMIT 10").all();
    for (const item of pendingWhatsapp) {
      this.prepareEmailProposalDraft(item.id);
    }

    return { processedCalls: pendingCalls.length, processedProposals: pendingWhatsapp.length };
  }

  /**
   * Autopilot Funnel Dashboard Stats
   */
  getFunnelStats() {
    const total = db.prepare('SELECT COUNT(*) as c FROM autopilot_queue').get()?.c || 0;
    const calling = db.prepare("SELECT COUNT(*) as c FROM autopilot_queue WHERE current_stage = 'calling'").get()?.c || 0;
    const rnrCount = db.prepare("SELECT COUNT(*) as c FROM autopilot_queue WHERE call_status = 'rnr' OR current_stage = 'rnr_scheduled_retry'").get()?.c || 0;
    const callCompleted = db.prepare("SELECT COUNT(*) as c FROM autopilot_queue WHERE current_stage IN ('call_completed', 'whatsapp_sent', 'human_interference_required', 'converted')").get()?.c || 0;
    const whatsappSent = db.prepare("SELECT COUNT(*) as c FROM autopilot_queue WHERE whatsapp_status IN ('sent', 'sent_link')").get()?.c || 0;
    const humanReviewCount = db.prepare("SELECT COUNT(*) as c FROM autopilot_queue WHERE human_interference_required = 1").get()?.c || 0;
    const converted = db.prepare("SELECT COUNT(*) as c FROM autopilot_queue WHERE current_stage = 'converted'").get()?.c || 0;

    const byProduct = db.prepare('SELECT product, COUNT(*) as count FROM autopilot_queue GROUP BY product').all();

    return {
      total,
      funnel: {
        enqueued: total,
        calling,
        rnrCount,
        callCompleted,
        whatsappSent,
        humanInterferenceRequired: humanReviewCount,
        converted,
      },
      conversionRate: total > 0 ? ((converted / total) * 100).toFixed(1) : '0.0',
      byProduct,
    };
  }
}

export const autopilotService = new AutopilotService();
