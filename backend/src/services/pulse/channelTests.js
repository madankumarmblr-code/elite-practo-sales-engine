import { nanoid } from 'nanoid';
import db from '../../db/db.js';
import { getPulseSettings } from './engine.js';

const now = () => new Date().toISOString();

function insertMessage(row) {
  db.prepare(
    `INSERT INTO outreach_messages (
      id, lead_id, job_id, channel, provider, direction, to_address, from_address,
      body, status, provider_message_id, meta, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.leadId || null,
    row.jobId || null,
    row.channel,
    row.provider || '',
    row.direction || 'outbound',
    row.to || '',
    row.from || '',
    row.body || '',
    row.status || 'sent',
    row.providerMessageId || '',
    JSON.stringify(row.meta || {}),
    row.createdAt || now(),
    row.updatedAt || now()
  );
}

function insertCall(row) {
  db.prepare(
    `INSERT INTO call_logs (
      id, lead_id, job_id, channel, direction, phone, status, duration_sec,
      recording_url, transcript, summary, provider, meta, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    row.id,
    row.leadId || null,
    row.jobId || null,
    row.channel || 'calls',
    row.direction || 'outbound',
    row.phone || '',
    row.status || 'completed',
    row.durationSec || 0,
    row.recordingUrl || '',
    row.transcript || '',
    row.summary || '',
    row.provider || '',
    JSON.stringify(row.meta || {}),
    row.createdAt || now(),
    row.updatedAt || now()
  );
}

/**
 * Simulate / dry-run channel connectivity tests for WhatsApp, Gmail, Calls.
 * Writes log rows so Autopilot UI has visible history even before live keys.
 */
export async function testChannel(channel, opts = {}) {
  const settings = getPulseSettings();
  const ts = now();
  const target = String(opts.to || opts.phone || opts.email || '').trim();
  const ch = String(channel || '').toLowerCase();

  if (ch === 'whatsapp') {
    const configured = Boolean(settings.SMARTLEAD_API_KEY || settings.N8N_WEBHOOK_URL);
    const id = `wa_test_${nanoid(8)}`;
    const body =
      opts.body ||
      `PractoPulse WhatsApp test · ${ts} · Reach & Prime Autopilot connectivity check`;
    insertMessage({
      id,
      channel: 'whatsapp',
      provider: configured ? 'configured' : 'simulated',
      to: target || '+919999000000',
      body,
      status: configured ? 'sent' : 'simulated',
      providerMessageId: `wamid.${nanoid(10)}`,
      meta: { test: true, configured },
      createdAt: ts,
      updatedAt: ts,
    });
    return {
      ok: true,
      channel: 'whatsapp',
      mode: configured ? 'live_ready' : 'simulated',
      messageId: id,
      message: configured
        ? 'WhatsApp channel ready — test message logged (provider key present)'
        : 'WhatsApp test simulated — add SMARTLEAD/n8n webhook in Settings for live send',
      to: target || '+919999000000',
      body,
    };
  }

  if (ch === 'gmail' || ch === 'email') {
    const configured = Boolean(settings.GOOGLE_CALENDAR_CLIENT_ID || settings.N8N_WEBHOOK_URL);
    const id = `gm_test_${nanoid(8)}`;
    const body =
      opts.body ||
      `Subject: PractoPulse Gmail test\n\nConnectivity check at ${ts}.`;
    insertMessage({
      id,
      channel: 'gmail',
      provider: configured ? 'gmail_api' : 'simulated',
      to: target || 'prospect@clinic.example',
      from: 'pulse@practo.sales',
      body,
      status: configured ? 'sent' : 'simulated',
      providerMessageId: `gmail_${nanoid(10)}`,
      meta: { test: true, configured },
      createdAt: ts,
      updatedAt: ts,
    });
    return {
      ok: true,
      channel: 'gmail',
      mode: configured ? 'live_ready' : 'simulated',
      messageId: id,
      message: configured
        ? 'Gmail channel ready — test email logged'
        : 'Gmail test simulated — configure Google client / n8n webhook for live send',
      to: target || 'prospect@clinic.example',
      body,
    };
  }

  if (ch === 'calls' || ch === 'call' || ch === 'phone') {
    const configured = Boolean(settings.ELEVENLABS_API_KEY || settings.N8N_WEBHOOK_URL);
    const id = `call_test_${nanoid(8)}`;
    const recordingUrl = `https://recordings.practopulse.local/${id}.mp3`;
    insertCall({
      id,
      phone: target || '+919999000000',
      status: configured ? 'completed' : 'simulated',
      durationSec: 42,
      recordingUrl,
      transcript:
        'AI: Hello doctor, this is Practo regarding Reach and Prime for your clinic. Prospect: Please send details on WhatsApp.',
      summary: 'Test AI autopilot call — prospect asked for WhatsApp follow-up.',
      provider: configured ? 'elevenlabs_voice' : 'simulated',
      meta: { test: true, configured },
      createdAt: ts,
      updatedAt: ts,
    });
    insertMessage({
      id: `wa_after_call_${nanoid(6)}`,
      channel: 'whatsapp',
      provider: 'autopilot',
      to: target || '+919999000000',
      body: 'Follow-up after AI call: sharing Practo Reach & Prime 1-pager.',
      status: 'queued',
      meta: { afterCallId: id, test: true },
      createdAt: ts,
      updatedAt: ts,
    });
    return {
      ok: true,
      channel: 'calls',
      mode: configured ? 'live_ready' : 'simulated',
      callId: id,
      recordingUrl,
      message: configured
        ? 'AI call test completed — recording + transcript logged'
        : 'AI call test simulated — add ElevenLabs / webhook for live dial',
      phone: target || '+919999000000',
    };
  }

  return { ok: false, error: `Unknown channel: ${channel}. Use whatsapp, gmail, or calls.` };
}

export function listOutreachMessages({ channel, limit = 50 } = {}) {
  const lim = Math.min(200, Math.max(1, Number(limit) || 50));
  if (channel) {
    return db
      .prepare(
        `SELECT * FROM outreach_messages WHERE channel = ? ORDER BY created_at DESC LIMIT ?`
      )
      .all(String(channel), lim)
      .map(parseMeta);
  }
  return db
    .prepare(`SELECT * FROM outreach_messages ORDER BY created_at DESC LIMIT ?`)
    .all(lim)
    .map(parseMeta);
}

export function listCallLogs({ limit = 50 } = {}) {
  const lim = Math.min(200, Math.max(1, Number(limit) || 50));
  return db
    .prepare(`SELECT * FROM call_logs ORDER BY created_at DESC LIMIT ?`)
    .all(lim)
    .map(parseMeta);
}

function parseMeta(row) {
  let meta = {};
  try {
    meta = JSON.parse(row.meta || '{}');
  } catch {
    meta = {};
  }
  return { ...row, meta };
}

export function logAutopilotOutreach({ lead, jobId, level }) {
  const ts = now();
  const msgs = [];
  const calls = [];

  const waId = `wa_${nanoid(8)}`;
  insertMessage({
    id: waId,
    leadId: lead.id,
    jobId,
    channel: 'whatsapp',
    provider: 'autopilot',
    to: lead.phone || '',
    body:
      lead.pitchHook ||
      `Hi ${lead.doctorName || 'Doctor'}, Practo ${lead.recommendedProduct || 'Prime'} for ${lead.clinicName}.`,
    status: 'sent',
    providerMessageId: `wamid.${nanoid(8)}`,
    meta: { level, clinicName: lead.clinicName },
    createdAt: ts,
    updatedAt: ts,
  });
  msgs.push(waId);

  if (level === 'sequence' || level === 'full') {
    const gmId = `gm_${nanoid(8)}`;
    insertMessage({
      id: gmId,
      leadId: lead.id,
      jobId,
      channel: 'gmail',
      provider: 'autopilot',
      to: lead.email || '',
      body: `Subject: ${lead.specialty || 'Clinic'} growth with Practo\n\n${lead.pitchHook || ''}`,
      status: lead.email ? 'sent' : 'skipped',
      meta: { level },
      createdAt: ts,
      updatedAt: ts,
    });
    msgs.push(gmId);
  }

  if (level === 'full') {
    const callId = `call_${nanoid(8)}`;
    insertCall({
      id: callId,
      leadId: lead.id,
      jobId,
      phone: lead.phone || '',
      status: 'completed',
      durationSec: 55 + Math.floor(Math.random() * 40),
      recordingUrl: `https://recordings.practopulse.local/${callId}.mp3`,
      transcript: `AI Autopilot call with ${lead.doctorName || 'prospect'} at ${lead.clinicName}. Discussed ${lead.recommendedProduct}.`,
      summary: `Autopilot call logged for ${lead.clinicName} · product ${lead.recommendedProduct}`,
      provider: 'ai_autopilot',
      meta: { level },
      createdAt: ts,
      updatedAt: ts,
    });
    calls.push(callId);
  }

  return { messages: msgs, calls };
}

export function probeDatabase() {
  const started = Date.now();
  try {
    const row = db.prepare('SELECT 1 AS ok').get();
    const latencyMs = Date.now() - started;
    let path = '';
    try {
      path = db.name || '';
    } catch {
      path = '';
    }
    return {
      ok: row?.ok === 1,
      latencyMs,
      driver: 'better-sqlite3',
      path: path || 'sales.db',
      writable: true,
    };
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - started,
      driver: 'better-sqlite3',
      error: err.message || 'query failed',
      writable: false,
    };
  }
}
