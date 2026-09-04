import db from '../db/db.js';
import { logEvent } from './logger.js';
import { telephonyProvider } from './telephonyProvider.js';
import { transcriptionService } from './transcriptionService.js';
import { sentimentAnalysisService } from './sentimentAnalysisService.js';
import { nanoid } from 'nanoid';

const now = () => new Date().toISOString();

/**
 * Proprietary Elite Native Voice AI Agent Engine
 * 
 * Direct healthcare sales automation agent:
 * - Natural doctor conversational flow (Prime vs Reach)
 * - Multi-turn objection handling
 * - Universal telephony provider dispatch (Twilio / Exotel / Plivo / WebRTC / Simulator)
 * - Dual-channel AI Speech-to-Text Diarization
 * - Deep sentiment analysis for both AI Agent and Human Agent
 */
export class VoiceAgentService {
  constructor() {
    this.engineName = 'Elite Native Voice AI Engine v2.4';
  }

  /**
   * Place outbound sales call using Native Voice Agent
   */
  async placeVoiceCall({
    toPhone,
    doctorName = 'Doctor',
    clinicName = 'Clinic',
    locality = 'Bangalore',
    city = 'Bangalore',
    speciality = 'General Physician',
    product = 'prime',
    agentType = 'ai', // 'ai' | 'human'
    telephonyProviderName = null,
    leadId = null,
    customNotes = '',
    reachSlotDetails = null,
  }) {
    const callId = `call_${nanoid(12)}`;
    const ts = now();

    logEvent({
      type: 'info',
      category: 'voice_agent',
      message: `Executing Native Voice Agent outbound call to ${toPhone}`,
      detail: `Doctor: ${doctorName}, Clinic: ${clinicName}, Product: ${product.toUpperCase()}`,
      meta: { callId, leadId, agentType, reachSlotDetails },
    });

    // 1. Dispatch Telephony Call (Twilio / Exotel / Plivo / WebRTC / Simulator)
    const telephonyResult = await telephonyProvider.initiateCall({
      toPhone,
      doctorName,
      clinicName,
      product,
      provider: telephonyProviderName,
      leadId,
    });

    // 2. Generate / Process AI Speech-to-Text Diarized Transcription
    const transcriptData = await transcriptionService.transcribeCall({
      callId,
      agentType,
      doctorName,
      clinicName,
      product,
      reachSlotDetails,
    });

    // 3. Run Deep Sentiment Analysis on the Conversation
    const sentimentData = await sentimentAnalysisService.analyzeConversation({
      turns: transcriptData.turns,
      agentType,
      doctorName,
      product,
    });

    // 4. Persist to DB call_logs with enriched columns
    const cleanPhone = String(toPhone).replace(/[^0-9+]/g, '');
    const duration = telephonyResult.durationSec || transcriptData.stats.durationSec || 95;
    const audioUrl = telephonyResult.recordingUrl || `/recordings/sample_practo_call_${product}.mp3`;

    try {
      db.prepare(`
        INSERT INTO call_logs (
          id, lead_id, job_id, channel, direction, phone, status, duration_sec,
          recording_url, transcript, summary, provider, meta, created_at, updated_at,
          voice_engine, telephony_provider, agent_type, transcription_json,
          doctor_sentiment, agent_sentiment, sentiment_score, interest_score,
          objections_detected, talk_listen_ratio, interruption_count,
          qa_coaching_notes, doctor_intent, audio_url
        ) VALUES (
          ?, ?, ?, 'calls', 'outbound', ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?
        )
      `).run(
        callId,
        leadId || null,
        telephonyResult.callId || callId,
        cleanPhone,
        telephonyResult.status || 'completed',
        duration,
        audioUrl,
        transcriptData.plainText,
        sentimentData.summary || '',
        telephonyResult.provider || 'simulator',
        JSON.stringify({ doctorName, clinicName, product, metadata: telephonyResult }),
        ts,
        ts,
        'native',
        telephonyResult.provider || 'simulator',
        agentType,
        JSON.stringify(transcriptData.turns),
        sentimentData.doctorSentiment || 'positive',
        agentType === 'human' ? (sentimentData.agentTone || 'professional') : 'ai_persuasive',
        sentimentData.sentimentScore || sentimentData.qaScore || 80,
        sentimentData.interestScore || 82,
        JSON.stringify(sentimentData.objectionsDetected || []),
        transcriptData.stats.talkListenRatio || '45:55',
        sentimentData.interruptionCount || 0,
        JSON.stringify(sentimentData.coachingTips || []),
        sentimentData.doctorIntent || 'request_proposal',
        audioUrl
      );
    } catch (err) {
      console.warn('[VoiceAgentService] DB write error for call_log:', err.message);
    }

    // 5. Update lead activity & stage if leadId is associated
    if (leadId) {
      try {
        db.prepare('UPDATE leads SET last_contacted_at=?, updated_at=? WHERE id=?').run(ts, ts, leadId);
        db.prepare(`
          INSERT INTO activities (id, lead_id, type, channel, title, detail, status, created_at)
          VALUES (?, ?, 'call', 'calls', ?, ?, 'completed', ?)
        `).run(
          nanoid(),
          leadId,
          `${agentType === 'human' ? 'Human Agent' : 'Native AI'} call to Dr. ${doctorName}`,
          `Duration: ${duration}s · Sentiment: ${sentimentData.doctorSentiment} (${sentimentData.sentimentScore || 80}%) · Provider: ${telephonyResult.provider}`,
          ts
        );
      } catch { /* ignore */ }
    }

    return {
      callId,
      status: telephonyResult.status || 'completed',
      durationSec: duration,
      provider: telephonyResult.provider,
      voiceEngine: 'native',
      agentType,
      audioUrl,
      transcript: transcriptData.turns,
      stats: transcriptData.stats,
      sentiment: sentimentData,
      timestamp: ts,
    };
  }

  /**
   * Fetch all voice calls with rich transcription & sentiment data
   */
  listCalls({ limit = 50, offset = 0, agentType = null, provider = null } = {}) {
    let query = 'SELECT * FROM call_logs WHERE 1=1';
    const params = [];

    if (agentType) {
      query += ' AND agent_type = ?';
      params.push(agentType);
    }
    if (provider) {
      query += ' AND telephony_provider = ?';
      params.push(provider);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const rows = db.prepare(query).all(...params);
    return rows.map((r) => this._hydrateCall(r));
  }

  getCallById(id) {
    const row = db.prepare('SELECT * FROM call_logs WHERE id = ?').get(id);
    if (!row) return null;
    return this._hydrateCall(row);
  }

  _hydrateCall(row) {
    let transcriptionTurns = [];
    let meta = {};
    let objections = [];
    let coachingTips = [];

    try { transcriptionTurns = JSON.parse(row.transcription_json || '[]'); } catch {}
    try { meta = JSON.parse(row.meta || '{}'); } catch {}
    try { objections = JSON.parse(row.objections_detected || '[]'); } catch {}
    try { coachingTips = JSON.parse(row.qa_coaching_notes || '[]'); } catch {}

    return {
      ...row,
      meta,
      transcriptionTurns,
      objections,
      coachingTips,
      duration: row.duration_sec ? `${Math.floor(row.duration_sec / 60)}m ${row.duration_sec % 60}s` : '0s',
    };
  }

  /**
   * Re-analyze or manually score sentiment on any text or call transcript
   */
  async reanalyzeSentiment({ callId = null, turns = [], agentType = 'ai', doctorName = 'Doctor', product = 'prime' }) {
    let targetTurns = turns;
    let targetAgentType = agentType;
    let targetDoctorName = doctorName;
    let targetProduct = product;

    if (callId) {
      const call = this.getCallById(callId);
      if (call) {
        targetTurns = call.transcriptionTurns;
        targetAgentType = call.agent_type || 'ai';
        targetDoctorName = call.meta?.doctorName || doctorName;
        targetProduct = call.meta?.product || product;
      }
    }

    const sentiment = await sentimentAnalysisService.analyzeConversation({
      turns: targetTurns,
      agentType: targetAgentType,
      doctorName: targetDoctorName,
      product: targetProduct,
    });

    if (callId) {
      try {
        db.prepare(`
          UPDATE call_logs SET
            doctor_sentiment=?,
            agent_sentiment=?,
            sentiment_score=?,
            interest_score=?,
            objections_detected=?,
            qa_coaching_notes=?,
            doctor_intent=?,
            updated_at=?
          WHERE id=?
        `).run(
          sentiment.doctorSentiment || 'positive',
          targetAgentType === 'human' ? (sentiment.agentTone || 'professional') : 'ai_persuasive',
          sentiment.sentimentScore || sentiment.qaScore || 80,
          sentiment.interestScore || 80,
          JSON.stringify(sentiment.objectionsDetected || []),
          JSON.stringify(sentiment.coachingTips || []),
          sentiment.doctorIntent || 'request_proposal',
          now(),
          callId
        );
      } catch (err) {
        console.warn('[VoiceAgentService] Update sentiment DB error:', err.message);
      }
    }

    return sentiment;
  }
}

export const voiceAgentService = new VoiceAgentService();
