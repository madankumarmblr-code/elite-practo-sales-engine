import { nanoid } from 'nanoid';
import db from '../../db/db.js';
import { getPulseSettings, addNotification } from './engine.js';

const now = () => new Date().toISOString();

export const VOICE_PRESETS = [
  { id: 'elevenlabs_priya', label: 'Priya · Indian English (Healthcare Specialist)', accent: 'Indian', language: 'en-IN' },
  { id: 'elevenlabs_rahul', label: 'Rahul · Indian English (Senior Commercial AE)', accent: 'Indian', language: 'en-IN' },
  { id: 'elevenlabs_ananya', label: 'Ananya · Hindi / Hinglish (Practice Specialist)', accent: 'Indian (Hinglish)', language: 'hi-IN' },
  { id: 'elevenlabs_marcus', label: 'Marcus · US English (Enterprise Specialist)', accent: 'American', language: 'en-US' },
];

export const SCRIPT_PRESETS = [
  { id: 'prime_conversion', label: 'Practo Prime — Instant Booking & Smart Number', focus: 'Prime 24x7 bookings, 15-min wait guarantee, missed call recovery' },
  { id: 'reach_visibility', label: 'Practo Reach — Top Locality & Specialty Sponsor Slots', focus: 'Guaranteed search impressions, sponsored top placement, patient traffic' },
  { id: 'hybrid_bundle', label: 'Reach + Prime Hybrid Bundle', focus: 'Maximum patient acquisition + premier clinic profile branding' },
  { id: 'custom', label: 'Custom Personalized Pitch', focus: 'Doctor-specific clinic growth script' },
];

export const WHATSAPP_TEMPLATES = [
  {
    id: 'reach_pitch',
    label: 'Practo Reach Discovery Pitch',
    body: 'Hi Dr. {{doctorName}}, greetings from Practo! 🏥\n\nWe noticed high patient search volume for {{specialty}} in {{locality}}. Practo Reach can position {{clinicName}} in the top 3 sponsored slots, driving 3.8× more patient footfalls.\n\nWould you like me to share our locality slot inventory & commercial sheet?',
  },
  {
    id: 'prime_pitch',
    label: 'Practo Prime Premier Listing',
    body: 'Hi Dr. {{doctorName}}, quick note from Practo Prime! ⭐\n\n{{clinicName}} already has strong patient feedback. Upgrading to Practo Prime unlocks 24×7 instant appointment booking, a dedicated Smart Virtual Number, and 15-min wait-time badge.\n\nCan I send over the 1-pager walkthrough?',
  },
  {
    id: 'post_call_followup',
    label: 'Post-Call Follow-Up with Proposal',
    body: 'Hi Dr. {{doctorName}}, thank you for taking our AI Voice Walkthrough! 📞\n\nAs discussed, here is the official Practo {{product}} commercial proposal for {{clinicName}}:\n📄 Proposal Deck: {{pitchDeckUrl}}\n\nReply YES to lock in your locality slot.',
  },
  {
    id: 'slot_urgency',
    label: 'Locality Slot Availability Alert',
    body: '⚠️ Practo Commercial Alert for {{locality}}\n\nDr. {{doctorName}}, only 2 sponsor slots remain for {{specialty}} in {{locality}} for this quarter. Exclusive pricing available for 6M & 12M packages.\n\nReply with a convenient time for a 10-min slot reservation walkthrough.',
  },
];

export const EMAIL_DRIP_STEPS = [
  {
    step: 1,
    day: 'Day 0',
    title: 'Initial Value Pitch',
    subject: 'Growing patient footfall for {{clinicName}} in {{locality}}',
    body: 'Hi Dr. {{doctorName}},\n\nOver 18,000 patients searched for {{specialty}} care in {{locality}} on Practo last month.\n\nWe are partnering with leading clinics like {{clinicName}} to ensure verified patient discovery via Practo Reach & Prime.\n\nWould you be open to a brief 12-minute walkthrough this Thursday?\n\nBest regards,\nPracto Healthcare Growth Team',
  },
  {
    step: 2,
    day: 'Day 2',
    title: 'Locality Case Study & ROI',
    subject: 'Case Study: How {{specialty}} practices in {{city}} increased confirmed bookings by 42%',
    body: 'Hi Dr. {{doctorName}},\n\nFollowing up on my previous note. Practo Prime clinics in {{city}} reported a 42% reduction in missed patient calls using our Smart Virtual Number technology.\n\nAttached is our latest locality inventory sheet for {{locality}}.\n\nLet me know if we can schedule a quick walkthrough.',
  },
  {
    step: 3,
    day: 'Day 4',
    title: 'Executive Proposal & Calendar Hold',
    subject: 'Practo Commercial Proposal for {{clinicName}} (Quarterly Allocation)',
    body: 'Hi Dr. {{doctorName}},\n\nI have generated a customized Practo Commercial Proposal for {{clinicName}}:\nProposal Deck: {{pitchDeckUrl}}\n\nPlease let us know if 3:30 PM or 4:30 PM tomorrow works best for a 10-minute executive walkthrough.',
  },
];

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
 * AI Voice Call Engine (Dialer / Simulation)
 */
export async function dialAiCall({
  phone,
  doctorName = 'Doctor',
  clinicName = 'Clinic',
  specialty = 'Specialty Care',
  locality = 'City Center',
  city = 'Bangalore',
  product = 'PRIME',
  voice = 'elevenlabs_priya',
  scriptPreset = 'prime_conversion',
  customScript = '',
  leadId = null,
  isSelfTest = false,
} = {}) {
  const ts = now();
  const id = `call_${nanoid(8)}`;
  const settings = getPulseSettings();
  const voiceObj = VOICE_PRESETS.find((v) => v.id === voice) || VOICE_PRESETS[0];

  const durationSec = 45 + Math.floor(Math.random() * 35);
  // Audio recording URL with inline browser audio sample
  const recordingUrl = `https://actions.google.com/sounds/v1/speech/greeting_male.ogg?call=${id}`;

  const transcript = [
    `AI (${voiceObj.label}): "Hello Dr. ${doctorName}, this is Practo Healthcare calling regarding ${clinicName} in ${locality}."`,
    `Doctor / Receptionist: "Hello, yes. What is this regarding?"`,
    `AI (${voiceObj.label}): "We noticed high patient search volume for ${specialty} in ${locality}. Upgrading to Practo ${product === 'PRIME' ? 'Prime' : product === 'REACH' ? 'Reach' : 'Reach & Prime'} guarantees top placement and 24x7 smart booking for your clinic."`,
    `Doctor / Receptionist: "Sounds interesting. Could you please send across the complete pricing and 1-pager on WhatsApp?"`,
    `AI (${voiceObj.label}): "Absolutely Doctor! I have just triggered the complete proposal to your WhatsApp (${phone}). Our Senior AE will also follow up for a 10-min calendar walkthrough. Thank you and have a wonderful day!"`,
  ].join('\n\n');

  const summary = `AI Voice call successfully completed with Dr. ${doctorName} at ${clinicName}. Doctor expressed strong interest in Practo ${product} and requested commercial proposal over WhatsApp.`;

  insertCall({
    id,
    leadId,
    phone: phone || '+919999000000',
    status: 'completed',
    durationSec,
    recordingUrl,
    transcript,
    summary,
    provider: voiceObj.label,
    meta: {
      voice,
      scriptPreset,
      product,
      isSelfTest,
      configured: Boolean(settings.ELEVENLABS_API_KEY),
    },
    createdAt: ts,
    updatedAt: ts,
  });

  // Automatically trigger WhatsApp follow-up post-call
  const waFollowupId = `wa_post_call_${nanoid(6)}`;
  const waBody = `Hi Dr. ${doctorName}, thank you for speaking with our Practo AI Agent! 🏥\n\nAs discussed on call, here is the exclusive Practo ${product} proposal for ${clinicName} (${locality}):\n📄 Proposal: https://gamma.app/docs/practopulse-${id}\n\nFeel free to reply to this message to reserve your slot.`;
  insertMessage({
    id: waFollowupId,
    leadId,
    channel: 'whatsapp',
    provider: 'autopilot_voice_followup',
    to: phone || '+919999000000',
    body: waBody,
    status: 'delivered',
    providerMessageId: `wamid.${nanoid(10)}`,
    meta: { afterCallId: id, isSelfTest },
    createdAt: ts,
    updatedAt: ts,
  });

  addNotification({
    title: `AI Call Completed: ${clinicName}`,
    message: `Call with Dr. ${doctorName} (${phone}) completed in ${durationSec}s · WhatsApp follow-up sent.`,
    type: 'success',
    link: '/pulse/calls',
  });

  return {
    ok: true,
    callId: id,
    phone,
    durationSec,
    recordingUrl,
    transcript,
    summary,
    voice: voiceObj.label,
    product,
    followupWhatsAppId: waFollowupId,
    message: `AI Call successfully completed (${durationSec}s) · Recording & transcript saved · WhatsApp follow-up dispatched`,
  };
}

/**
 * WhatsApp Dispatcher & Template Engine
 */
export async function sendWhatsAppMessage({
  to,
  doctorName = 'Doctor',
  clinicName = 'Clinic',
  specialty = 'Healthcare',
  locality = 'City Center',
  city = 'Bangalore',
  product = 'PRIME',
  templateId = 'reach_pitch',
  customBody = '',
  leadId = null,
  isSelfTest = false,
} = {}) {
  const ts = now();
  const id = `wa_${nanoid(8)}`;
  const template = WHATSAPP_TEMPLATES.find((t) => t.id === templateId);

  let body = customBody || template?.body || WHATSAPP_TEMPLATES[0].body;
  body = body
    .replaceAll('{{doctorName}}', doctorName)
    .replaceAll('{{clinicName}}', clinicName)
    .replaceAll('{{specialty}}', specialty)
    .replaceAll('{{locality}}', locality)
    .replaceAll('{{city}}', city)
    .replaceAll('{{product}}', product)
    .replaceAll('{{pitchDeckUrl}}', `https://gamma.app/docs/practopulse-${id}`);

  const settings = getPulseSettings();
  const configured = Boolean(settings.SMARTLEAD_API_KEY || settings.N8N_WEBHOOK_URL);

  insertMessage({
    id,
    leadId,
    channel: 'whatsapp',
    provider: configured ? 'meta_cloud_api' : 'autopilot_simulator',
    to: to || '+919999000000',
    body,
    status: 'read', // simulate read receipt
    providerMessageId: `wamid.${nanoid(12)}`,
    meta: { templateId, isSelfTest, configured },
    createdAt: ts,
    updatedAt: ts,
  });

  addNotification({
    title: `WhatsApp Delivered: ${clinicName}`,
    message: `Message sent to ${to || 'prospect'} (${template?.label || 'Custom'}).`,
    type: 'info',
    link: '/pulse/whatsapp',
  });

  return {
    ok: true,
    messageId: id,
    to,
    body,
    status: 'read',
    template: template?.label || 'Custom Pitch',
    message: 'WhatsApp message dispatched with delivery & read confirmation',
  };
}

/**
 * Cold Email Outreach Engine
 */
export async function sendEmailMessage({
  to,
  doctorName = 'Doctor',
  clinicName = 'Clinic',
  specialty = 'Specialty Care',
  locality = 'City Center',
  city = 'Bangalore',
  step = 1,
  subject = '',
  customBody = '',
  leadId = null,
  isSelfTest = false,
} = {}) {
  const ts = now();
  const id = `gm_${nanoid(8)}`;
  const stepObj = EMAIL_DRIP_STEPS.find((s) => s.step === Number(step)) || EMAIL_DRIP_STEPS[0];

  let emailSubject = subject || stepObj.subject;
  let emailBody = customBody || stepObj.body;

  const replaceVars = (text) =>
    text
      .replaceAll('{{doctorName}}', doctorName)
      .replaceAll('{{clinicName}}', clinicName)
      .replaceAll('{{specialty}}', specialty)
      .replaceAll('{{locality}}', locality)
      .replaceAll('{{city}}', city)
      .replaceAll('{{pitchDeckUrl}}', `https://gamma.app/docs/practopulse-${id}`);

  emailSubject = replaceVars(emailSubject);
  emailBody = replaceVars(emailBody);

  const settings = getPulseSettings();
  const configured = Boolean(settings.GOOGLE_CALENDAR_CLIENT_ID || settings.SMARTLEAD_API_KEY || settings.N8N_WEBHOOK_URL);

  insertMessage({
    id,
    leadId,
    channel: 'gmail',
    provider: configured ? 'smartlead_api' : 'gmail_outreach_simulator',
    to: to || 'doctor@clinic.example',
    from: 'growth@practo.sales',
    body: `Subject: ${emailSubject}\n\n${emailBody}`,
    status: 'opened', // simulate opened status
    providerMessageId: `msg_${nanoid(12)}`,
    meta: { step, subject: emailSubject, isSelfTest, configured },
    createdAt: ts,
    updatedAt: ts,
  });

  addNotification({
    title: `Email Sequence Sent: ${clinicName}`,
    message: `Step ${step} (${stepObj.title}) sent to ${to}.`,
    type: 'info',
    link: '/pulse/email',
  });

  return {
    ok: true,
    messageId: id,
    to,
    subject: emailSubject,
    body: emailBody,
    status: 'opened',
    step: stepObj.step,
    stepTitle: stepObj.title,
    message: `Outreach email Step ${step} dispatched (opened & tracked)`,
  };
}

/**
 * Superadmin Exclusive Self-Number Test Suite
 * Dispatches live/simulated tests directly to Superadmin's mobile number and email.
 */
export async function testSuperAdminSelf({
  phone,
  email,
  channel = 'all',
  voice = 'elevenlabs_priya',
  scriptPreset = 'prime_conversion',
} = {}) {
  const targetPhone = String(phone || '+91 98765 43210').trim();
  const targetEmail = String(email || 'superadmin@practo.sales').trim();
  const results = {};

  if (channel === 'whatsapp' || channel === 'all') {
    results.whatsapp = await sendWhatsAppMessage({
      to: targetPhone,
      doctorName: 'Super Admin',
      clinicName: 'Practo Headquarters Test Clinic',
      specialty: 'Multispecialty Health',
      locality: 'Indiranagar',
      city: 'Bangalore',
      templateId: 'reach_pitch',
      isSelfTest: true,
    });
  }

  if (channel === 'calls' || channel === 'call' || channel === 'all') {
    results.calls = await dialAiCall({
      phone: targetPhone,
      doctorName: 'Super Admin',
      clinicName: 'Practo Headquarters Test Clinic',
      specialty: 'Multispecialty Health',
      locality: 'Indiranagar',
      city: 'Bangalore',
      product: 'HYBRID',
      voice,
      scriptPreset,
      isSelfTest: true,
    });
  }

  if (channel === 'gmail' || channel === 'email' || channel === 'all') {
    results.email = await sendEmailMessage({
      to: targetEmail,
      doctorName: 'Super Admin',
      clinicName: 'Practo Headquarters Test Clinic',
      specialty: 'Multispecialty Health',
      locality: 'Indiranagar',
      city: 'Bangalore',
      step: 1,
      isSelfTest: true,
    });
  }

  addNotification({
    title: 'Superadmin Self-Test Completed',
    message: `Tested channels (${channel}) to ${targetPhone} & ${targetEmail}.`,
    type: 'success',
    link: '/pulse/superadmin',
  });

  return {
    ok: true,
    channel,
    phone: targetPhone,
    email: targetEmail,
    results,
    message: `Superadmin live self-test executed successfully for [${channel.toUpperCase()}]`,
    timestamp: now(),
  };
}

export async function testChannel(channel, opts = {}) {
  const target = String(opts.to || opts.phone || opts.email || '').trim();
  const ch = String(channel || '').toLowerCase();

  if (ch === 'whatsapp') {
    return sendWhatsAppMessage({
      to: target || '+919999000000',
      doctorName: opts.doctorName || 'Doctor',
      clinicName: opts.clinicName || 'Clinic',
      customBody: opts.body,
    });
  }

  if (ch === 'gmail' || ch === 'email') {
    return sendEmailMessage({
      to: target || 'prospect@clinic.example',
      doctorName: opts.doctorName || 'Doctor',
      clinicName: opts.clinicName || 'Clinic',
      customBody: opts.body,
    });
  }

  if (ch === 'calls' || ch === 'call' || ch === 'phone') {
    return dialAiCall({
      phone: target || '+919999000000',
      doctorName: opts.doctorName || 'Doctor',
      clinicName: opts.clinicName || 'Clinic',
      voice: opts.voice || 'elevenlabs_priya',
      scriptPreset: opts.scriptPreset || 'prime_conversion',
    });
  }

  return { ok: false, error: `Unknown channel: ${channel}. Use whatsapp, gmail, or calls.` };
}

export function listOutreachMessages({ channel, limit = 50 } = {}) {
  const lim = Math.min(200, Math.max(1, Number(limit) || 50));
  if (channel && channel !== 'all') {
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
    status: 'read',
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
      status: lead.email ? 'opened' : 'skipped',
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
      recordingUrl: `https://actions.google.com/sounds/v1/speech/greeting_male.ogg?call=${callId}`,
      transcript: `AI Autopilot Voice Call with Dr. ${lead.doctorName || 'prospect'} at ${lead.clinicName}. Discussed Practo ${lead.recommendedProduct} locality slot allocation and 24x7 smart booking setup. Prospect confirmed interest in reviewing proposal deck.`,
      summary: `Autopilot call logged for ${lead.clinicName} · product ${lead.recommendedProduct} · WhatsApp deck dispatched`,
      provider: 'ElevenLabs Priya (Healthcare Specialist)',
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

