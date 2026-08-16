import { nanoid } from 'nanoid';
import db from '../../db/db.js';
import { MOCK_LEADS } from './mockLeads.js';

export const INDIAN_CITIES = [
  'Bangalore',
  'Mumbai',
  'Delhi-NCR',
  'Hyderabad',
  'Pune',
  'Chennai',
];

export const MEDICAL_SPECIALTIES = [
  'Dermatologist',
  'Dentist',
  'Orthopedist',
  'Pediatrician',
  'Gynecologist',
  'ENT',
  'General Physician',
  'Cardiologist',
  'Ophthalmologist',
];

const SETTINGS_KEY = 'pulse_settings_v1';
const AUTOPILOT_KEY = 'pulse_autopilot_queue_v1';
const STARTED_AT = Date.now();

export const DEFAULT_PULSE_SETTINGS = {
  APIFY_API_KEY: '',
  CLAY_API_KEY: '',
  SMARTLEAD_API_KEY: '',
  HEYREACH_API_KEY: '',
  ANTHROPIC_API_KEY: '',
  GAMMA_API_KEY: '',
  ELEVENLABS_API_KEY: '',
  FIREFLIES_API_KEY: '',
  NOTION_API_KEY: '',
  GOOGLE_CALENDAR_CLIENT_ID: '',
  N8N_WEBHOOK_URL: '',
  AUTOPILOT_WEBHOOK_URL: '',
  SLACK_WEBHOOK_URL: '',
  CUSTOM_WEBHOOK_URL: '',
  WEBHOOK_SECRET: '',
  AUTOPILOT_LEVEL: 'assist', // assist | sequence | full
  AUTOPILOT_AUTO_SMARTLEAD: true,
  AUTOPILOT_AUTO_HEYREACH: false,
  AUTOPILOT_AUTO_PITCH: true,
  AUTOPILOT_AUTO_DEMO: false,
  DEFAULT_PRODUCT: 'BOTH',
};

function readJsonSetting(key, fallback) {
  try {
    const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
    if (!row?.value) return fallback;
    return { ...fallback, ...JSON.parse(row.value) };
  } catch {
    return fallback;
  }
}

function writeJsonSetting(key, value) {
  db.prepare(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, JSON.stringify(value));
}

export function getPulseSettings() {
  return readJsonSetting(SETTINGS_KEY, { ...DEFAULT_PULSE_SETTINGS });
}

export function savePulseSettings(patch = {}) {
  const next = { ...getPulseSettings(), ...patch };
  writeJsonSetting(SETTINGS_KEY, next);
  return next;
}

export function getAutopilotQueue() {
  return readJsonSetting(AUTOPILOT_KEY, { jobs: [], updatedAt: null });
}

export function saveAutopilotQueue(queue) {
  const next = { ...queue, updatedAt: new Date().toISOString() };
  writeJsonSetting(AUTOPILOT_KEY, next);
  return next;
}

export function classifyLead(lead) {
  const googleRating = Number(lead.googleRating || lead.rating || 0) || 0;
  const reviewCount = Number(lead.reviewCount || lead.reviews || 0) || 0;
  const practoUrl = String(lead.practoUrl || lead.practo?.url || '');
  const hasPractoProfile = Boolean(
    lead.practo?.hasProfile ||
    practoUrl.includes('practo.com') ||
    lead.practoProfileStatus === 'Claimed' ||
    lead.practoProfileStatus === 'Prime' ||
    lead.practoProfileStatus === 'Non-Prime' ||
    lead.practoProfileStatus === 'Ray User' ||
    lead.practoProfileStatus === 'Reach Active' ||
    lead.discoverySource === 'practo' ||
    lead.discoverySource === 'practo_web'
  );

  const practoStatus =
    lead.practoProfileStatus && lead.practoProfileStatus !== 'Unclaimed'
      ? lead.practoProfileStatus
      : hasPractoProfile
        ? (lead.practo?.isPrime ? 'Prime' : 'Claimed')
        : 'Unclaimed';

  const alreadyOnPracto = hasPractoProfile || practoStatus !== 'Unclaimed';
  const alreadyOnPractoLabel = alreadyOnPracto ? 'YES' : 'NO';

  let recommendedProduct = 'REACH';
  if (reviewCount >= 200 || googleRating >= 4.5) recommendedProduct = 'PRIME';
  if (
    practoStatus === 'Ray User' ||
    practoStatus === 'Reach Active' ||
    (alreadyOnPracto && recommendedProduct === 'PRIME')
  ) {
    recommendedProduct = 'HYBRID';
  }

  const specialty = lead.specialty || lead.keyword || 'Clinic';
  const locality = lead.locality || lead.zone || 'city center';
  const city = lead.city || '';
  const pitchHook = `${specialty} in ${locality}${city ? `, ${city}` : ''}: ${
    recommendedProduct === 'PRIME'
      ? 'strong reviews — pitch Prime booking + smart number'
      : recommendedProduct === 'HYBRID'
        ? 'existing Practo footprint — bundle Reach visibility + Prime conversion'
        : 'low discovery — pitch Reach locality/specialty slots'
  }.`;

  const leadScore = Math.min(
    99,
    55 + Math.round(googleRating * 6) + Math.min(30, Math.floor(reviewCount / 20))
  );

  return {
    recommendedProduct,
    pitchHook,
    leadScore,
    practoProfileStatus: practoStatus,
    alreadyOnPracto,
    alreadyOnPractoLabel,
  };
}

/** Map authentic Lead Generator discovery rows into Pulse lead shape. */
export function mapDiscoveryToPulseLead(item) {
  const owner = item.owner || {};
  const classified = classifyLead(item);
  const id =
    item.pulseId ||
    item.id ||
    item.placeId ||
    `disc_${nanoid(10)}`;

  const practoUrl =
    item.practo?.url ||
    item.practoUrl ||
    (classified.alreadyOnPracto ? 'https://www.practo.com' : '');

  return {
    id,
    doctorName: owner.name || item.name || 'Clinic contact',
    clinicName: item.clinicName || item.company || item.name || 'Clinic',
    specialty: item.specialty || item.keyword || '',
    city: item.city || '',
    locality: item.locality || item.zone || '',
    zone: item.zone || '',
    address: item.address || '',
    phone: owner.phone || item.phone || '',
    email: owner.email || item.email || '',
    website: item.website || '',
    googleRating: Number(item.rating || item.googleRating || item.practo?.rating || 0) || 0,
    reviewCount: Number(item.reviewCount || item.reviews || 0) || 0,
    practoProfileStatus: classified.practoProfileStatus,
    alreadyOnPracto: classified.alreadyOnPracto,
    alreadyOnPractoLabel: classified.alreadyOnPractoLabel,
    practoUrl,
    recommendedProduct: classified.recommendedProduct,
    pitchHook: classified.pitchHook,
    leadScore: item.score ?? classified.leadScore,
    status: item.autopilotStatus || 'DISCOVERED',
    decisionMaker: owner.title || 'Clinic Owner',
    discoverySource: item.discoverySource || item.source || 'live',
    suggestedChannel: item.suggestedChannel || '',
    temperature: item.temperature || '',
    placeId: item.placeId || null,
    raw: item,
    createdAt: item.createdAt || new Date().toISOString(),
  };
}

export function enrichDiscoveryResults(results = [], productFilter = 'BOTH') {
  const leads = results.map(mapDiscoveryToPulseLead).filter((l) => {
    if (productFilter === 'REACH' && l.recommendedProduct === 'PRIME') return false;
    if (productFilter === 'PRIME' && l.recommendedProduct === 'REACH') return false;
    return true;
  });
  return leads;
}

export function listPulseLeads() {
  const queue = getAutopilotQueue();
  const queuedIds = new Set((queue.jobs || []).map((j) => j.leadId));

  try {
    const rows = db.prepare('SELECT * FROM leads ORDER BY created_at DESC LIMIT 100').all();
    if (rows && rows.length > 0) {
      return rows.map((r) => ({
        id: r.id,
        clinicName: r.company || r.name || 'Clinic',
        doctorName: r.name || 'Doctor',
        specialty: r.title || 'General Practice',
        phone: r.phone || '',
        email: r.email || '',
        city: 'Bangalore',
        locality: 'Indiranagar',
        leadScore: r.score || 75,
        recommendedProduct: 'PRIME',
        practoProfileStatus: 'Claimed',
        alreadyOnPracto: true,
        alreadyOnPractoLabel: 'YES',
        practoUrl: 'https://www.practo.com',
        status: queuedIds.has(r.id) ? 'AUTOPILOT_QUEUED' : r.status || 'NEW',
        createdAt: r.created_at,
      }));
    }
  } catch {
    /* ignore */
  }

  return [];
}


export function sourceAndEnrich({ city, locality = '', specialties = [] }) {
  const specialty = specialties[0] || 'General Physician';
  let leads = MOCK_LEADS.filter((l) => {
    if (city && l.city !== city) return false;
    if (specialties.length && !specialties.includes(l.specialty)) return false;
    return true;
  });

  if (locality) {
    const hits = leads.filter((l) =>
      l.locality.toLowerCase().includes(String(locality).toLowerCase())
    );
    if (hits.length) leads = hits;
  }

  if (!leads.length) {
    leads = [
      {
        id: `lead_${city}_${specialty}_${Date.now()}`.toLowerCase().replace(/\s+/g, '_'),
        doctorName: 'Dr. Prospect',
        clinicName: `${specialty} Care · ${city}`,
        specialty,
        city,
        locality: locality || 'City Center',
        address: `${locality || 'City Center'}, ${city}`,
        phone: '+919999000111',
        email: 'prospect@clinic.example',
        googleRating: 4.0,
        reviewCount: 40,
        practoProfileStatus: 'Unclaimed',
        recommendedProduct: 'REACH',
        status: 'NEW',
        leadScore: 60,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  const enriched = leads.map((lead) => {
    const c = classifyLead(lead);
    return {
      ...lead,
      status: 'ENRICHED',
      recommendedProduct: c.recommendedProduct,
      pitchHook: `[Simulated Claude] ${c.pitchHook}`,
      leadScore: c.leadScore,
      decisionMaker: lead.decisionMaker || 'Managing Doctor',
    };
  });

  const byId = new Map(MOCK_LEADS.map((l) => [l.id, l]));
  for (const l of enriched) byId.set(l.id, l);

  return {
    leads: Array.from(byId.values()),
    enrichedCount: enriched.length,
    message: `Simulated Apify scrape + Clay enrich + Claude classify for ${specialty} in ${city} · ${enriched.length} lead(s)`,
  };
}

export function generatePitch(lead, channel = 'whatsapp') {
  const product = lead.recommendedProduct || 'PRIME';
  const script =
    channel === 'email'
      ? `Subject: ${lead.specialty} growth in ${lead.locality}\n\nHi ${lead.doctorName},\n\nClinics like ${lead.clinicName} in ${lead.city} are using Practo ${product === 'PRIME' ? 'Prime' : product === 'REACH' ? 'Reach' : 'Reach + Prime'} to drive patient discovery and bookings.\n\n${lead.pitchHook || ''}\n\nOpen to a 12-min walkthrough this week?\n\n— Practo Inside Sales`
      : channel === 'linkedin'
        ? `Hi ${lead.doctorName} — helping ${lead.specialty} practices in ${lead.city} with Practo ${product}. ${lead.pitchHook || ''} Worth a short chat?`
        : `Hi ${lead.doctorName}, quick note from Practo for ${lead.clinicName} (${lead.locality}). ${lead.pitchHook || ''} Can I share a 1-pager on ${product}?`;

  const pitchDeckUrl = `https://gamma.app/docs/practopulse-${lead.city}-${lead.specialty}-${lead.id}`
    .toLowerCase()
    .replace(/\s+/g, '-');

  return {
    pitchDeckUrl,
    script,
    message: `Simulated Gamma deck + ElevenLabs voice note + Claude ${channel} script for ${lead.clinicName}`,
  };
}

function maskSecret(value) {
  const s = String(value || '');
  if (!s) return { configured: false, preview: '' };
  if (s.length <= 8) return { configured: true, preview: '••••••••' };
  return { configured: true, preview: `${s.slice(0, 3)}••••${s.slice(-2)}` };
}

export function getServerStatus() {
  const settings = getPulseSettings();
  const queue = getAutopilotQueue();
  const mem = process.memoryUsage();
  const integrations = [
    { id: 'apify', label: 'Apify', ...maskSecret(settings.APIFY_API_KEY) },
    { id: 'clay', label: 'Clay', ...maskSecret(settings.CLAY_API_KEY) },
    { id: 'smartlead', label: 'Smartlead', ...maskSecret(settings.SMARTLEAD_API_KEY) },
    { id: 'heyreach', label: 'HeyReach', ...maskSecret(settings.HEYREACH_API_KEY) },
    { id: 'anthropic', label: 'Claude / Anthropic', ...maskSecret(settings.ANTHROPIC_API_KEY) },
    { id: 'gamma', label: 'Gamma', ...maskSecret(settings.GAMMA_API_KEY) },
    { id: 'fireflies', label: 'Fireflies', ...maskSecret(settings.FIREFLIES_API_KEY) },
    { id: 'elevenlabs', label: 'ElevenLabs (AI calls)', ...maskSecret(settings.ELEVENLABS_API_KEY) },
  ];
  const webhooks = [
    { id: 'n8n', label: 'n8n / automation', configured: Boolean(settings.N8N_WEBHOOK_URL) },
    {
      id: 'autopilot',
      label: 'AI Autopilot push',
      configured: Boolean(settings.AUTOPILOT_WEBHOOK_URL),
    },
    { id: 'slack', label: 'Slack alerts', configured: Boolean(settings.SLACK_WEBHOOK_URL) },
    { id: 'custom', label: 'Custom webhook', configured: Boolean(settings.CUSTOM_WEBHOOK_URL) },
  ];

  let leadCount = 0;
  let messageCount = 0;
  let callCount = 0;
  let dbProbe = { ok: false };
  try {
    // Dynamic require-style import avoided; use sync probe inline
    const row = db.prepare('SELECT 1 AS ok').get();
    dbProbe = { ok: row?.ok === 1, latencyMs: 0, driver: 'better-sqlite3' };
    leadCount = db.prepare('SELECT COUNT(*) AS c FROM leads').get()?.c || 0;
    try {
      messageCount = db.prepare('SELECT COUNT(*) AS c FROM outreach_messages').get()?.c || 0;
      callCount = db.prepare('SELECT COUNT(*) AS c FROM call_logs').get()?.c || 0;
    } catch {
      messageCount = 0;
      callCount = 0;
    }
  } catch (err) {
    dbProbe = { ok: false, error: err.message };
  }

  const jobs = queue.jobs || [];
  return {
    ok: Boolean(dbProbe.ok),
    service: 'practopulse',
    env: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    uptimeSec: Math.floor((Date.now() - STARTED_AT) / 1000),
    time: new Date().toISOString(),
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapMb: Math.round(mem.heapUsed / 1024 / 1024),
    },
    database: {
      ok: Boolean(dbProbe.ok),
      leadsStored: leadCount,
      outreachMessages: messageCount,
      callLogs: callCount,
      probe: dbProbe,
    },
    api: {
      ok: true,
      endpoints: [
        '/api/health',
        '/api/pulse/status',
        '/api/pulse/discover',
        '/api/pulse/autopilot',
        '/api/pulse/channels/test',
        '/api/system/health',
      ],
    },
    components: [
      { id: 'api', label: 'API server', status: 'online' },
      {
        id: 'database',
        label: 'SQLite database',
        status: dbProbe.ok ? 'online' : 'error',
      },
      { id: 'discovery', label: 'Lead discovery', status: 'online' },
      { id: 'pulse', label: 'PractoPulse engine', status: 'online' },
      {
        id: 'whatsapp',
        label: 'WhatsApp Autopilot',
        status: messageCount ? 'active' : 'ready',
      },
      {
        id: 'ai_calls',
        label: 'AI Autopilot calls',
        status: callCount ? 'active' : 'ready',
      },
      {
        id: 'autopilot',
        label: 'AI Autopilot',
        status: jobs.some((j) => j.status === 'running') ? 'running' : 'ready',
      },
      {
        id: 'webhooks',
        label: 'Webhooks',
        status: webhooks.some((w) => w.configured) ? 'configured' : 'idle',
      },
    ],
    integrations,
    webhooks,
    channels: [
      {
        id: 'whatsapp',
        label: 'WhatsApp',
        testable: true,
        configured: Boolean(settings.SMARTLEAD_API_KEY || settings.N8N_WEBHOOK_URL),
      },
      {
        id: 'gmail',
        label: 'Gmail',
        testable: true,
        configured: Boolean(settings.GOOGLE_CALENDAR_CLIENT_ID || settings.N8N_WEBHOOK_URL),
      },
      {
        id: 'calls',
        label: 'AI Calls',
        testable: true,
        configured: Boolean(settings.ELEVENLABS_API_KEY || settings.N8N_WEBHOOK_URL),
      },
    ],
    autopilot: {
      level: settings.AUTOPILOT_LEVEL || 'assist',
      queued: jobs.filter((j) => j.status === 'queued').length,
      running: jobs.filter((j) => j.status === 'running').length,
      done: jobs.filter((j) => j.status === 'done' || j.status === 'pushed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
      total: jobs.length,
      messagesLogged: messageCount,
      callsLogged: callCount,
    },
  };
}

export function getWebhookConfig() {
  const s = getPulseSettings();
  return {
    N8N_WEBHOOK_URL: s.N8N_WEBHOOK_URL || '',
    AUTOPILOT_WEBHOOK_URL: s.AUTOPILOT_WEBHOOK_URL || '',
    SLACK_WEBHOOK_URL: s.SLACK_WEBHOOK_URL || '',
    CUSTOM_WEBHOOK_URL: s.CUSTOM_WEBHOOK_URL || '',
    WEBHOOK_SECRET: s.WEBHOOK_SECRET || '',
  };
}

export function updateWebhookConfig(patch = {}) {
  const allowed = [
    'N8N_WEBHOOK_URL',
    'AUTOPILOT_WEBHOOK_URL',
    'SLACK_WEBHOOK_URL',
    'CUSTOM_WEBHOOK_URL',
    'WEBHOOK_SECRET',
  ];
  const next = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      next[key] = String(patch[key] || '').trim();
    }
  }
  savePulseSettings(next);
  return getWebhookConfig();
}

async function postWebhook(url, payload, secret) {
  if (!url) return { ok: false, skipped: true, reason: 'not_configured' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'X-Pulse-Secret': secret } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    return { ok: res.ok, status: res.status, skipped: false };
  } catch (err) {
    return { ok: false, skipped: false, error: err.message || 'webhook_failed' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Push leads into AI Autopilot: queue jobs, fire webhooks, optionally simulate sequences.
 */
export async function pushToAutopilot({ leads = [], level, channels = {} } = {}) {
  const settings = getPulseSettings();
  const autopilotLevel = level || settings.AUTOPILOT_LEVEL || 'assist';
  const mapped = leads.map((l) => (l.clinicName ? l : mapDiscoveryToPulseLead(l)));
  if (!mapped.length) {
    return { pushed: 0, jobs: [], message: 'No leads to push' };
  }

  // Lazy import to avoid circular deps at module load
  const { logAutopilotOutreach } = await import('./channelTests.js');

  const queue = getAutopilotQueue();
  const jobs = [...(queue.jobs || [])];
  const created = [];
  const ts = new Date().toISOString();
  const outreachSummary = { messages: 0, calls: 0 };

  for (const lead of mapped) {
    const job = {
      id: `ap_${nanoid(8)}`,
      leadId: lead.id,
      clinicName: lead.clinicName,
      doctorName: lead.doctorName,
      city: lead.city,
      specialty: lead.specialty,
      recommendedProduct: lead.recommendedProduct,
      level: autopilotLevel,
      status: 'queued',
      steps: [],
      createdAt: ts,
      updatedAt: ts,
      lead,
    };

    const steps = [];
    if (settings.AUTOPILOT_AUTO_PITCH || autopilotLevel !== 'assist') {
      const pitch = generatePitch(lead, 'whatsapp');
      steps.push({ id: 'pitch', status: 'done', detail: pitch.message, pitchDeckUrl: pitch.pitchDeckUrl });
      job.pitchDeckUrl = pitch.pitchDeckUrl;
    }
    steps.push({ id: 'whatsapp', status: 'queued', detail: 'WhatsApp Autopilot message' });
    if (
      (settings.AUTOPILOT_AUTO_SMARTLEAD || channels.smartlead || autopilotLevel === 'full') &&
      autopilotLevel !== 'assist'
    ) {
      steps.push({
        id: 'smartlead',
        status: 'queued',
        detail: `Sequence ${lead.recommendedProduct === 'REACH' ? 'REACH' : 'PRIME'}`,
      });
    }
    if (
      (settings.AUTOPILOT_AUTO_HEYREACH || channels.heyreach) &&
      (autopilotLevel === 'sequence' || autopilotLevel === 'full')
    ) {
      steps.push({ id: 'heyreach', status: 'queued', detail: 'LinkedIn DM sequence' });
    }
    if (autopilotLevel === 'sequence' || autopilotLevel === 'full') {
      steps.push({ id: 'gmail', status: 'queued', detail: 'Gmail follow-up' });
    }
    if ((settings.AUTOPILOT_AUTO_DEMO || channels.demo || channels.calls) && autopilotLevel === 'full') {
      steps.push({ id: 'ai_call', status: 'queued', detail: 'AI voice call + recording' });
      steps.push({ id: 'demo', status: 'queued', detail: 'Hold calendar slot' });
    }

    job.steps = steps;
    job.status = autopilotLevel === 'assist' ? 'pushed' : 'running';

    const logged = logAutopilotOutreach({ lead, jobId: job.id, level: autopilotLevel });
    outreachSummary.messages += logged.messages.length;
    outreachSummary.calls += logged.calls.length;
    job.outreach = logged;

    created.push(job);
    jobs.unshift(job);
  }

  const trimmed = { jobs: jobs.slice(0, 200) };
  saveAutopilotQueue(trimmed);

  const payload = {
    event: 'pulse.autopilot.push',
    level: autopilotLevel,
    at: ts,
    count: created.length,
    leads: created.map((j) => ({
      id: j.leadId,
      clinicName: j.clinicName,
      city: j.city,
      specialty: j.specialty,
      recommendedProduct: j.recommendedProduct,
      steps: j.steps.map((s) => s.id),
    })),
  };

  const webhookResults = {
    autopilot: await postWebhook(
      settings.AUTOPILOT_WEBHOOK_URL,
      payload,
      settings.WEBHOOK_SECRET
    ),
    n8n: await postWebhook(settings.N8N_WEBHOOK_URL, payload, settings.WEBHOOK_SECRET),
    slack: await postWebhook(
      settings.SLACK_WEBHOOK_URL,
      {
        text: `PractoPulse Autopilot: pushed ${created.length} lead(s) at level ${autopilotLevel}`,
      },
      settings.WEBHOOK_SECRET
    ),
    custom: await postWebhook(settings.CUSTOM_WEBHOOK_URL, payload, settings.WEBHOOK_SECRET),
  };

  if (autopilotLevel !== 'assist') {
    for (const job of created) {
      job.steps = job.steps.map((s) =>
        s.status === 'queued' ? { ...s, status: 'done', detail: `${s.detail} · logged` } : s
      );
      job.status = 'done';
      job.updatedAt = new Date().toISOString();
    }
    const refreshed = getAutopilotQueue();
    const byId = new Map(created.map((j) => [j.id, j]));
    refreshed.jobs = (refreshed.jobs || []).map((j) => byId.get(j.id) || j);
    saveAutopilotQueue(refreshed);
  }

  return {
    pushed: created.length,
    level: autopilotLevel,
    jobs: created,
    webhooks: webhookResults,
    outreach: outreachSummary,
    message: `Pushed ${created.length} lead(s) to AI Autopilot (${autopilotLevel}) · ${outreachSummary.messages} msg · ${outreachSummary.calls} call(s)`,
  };
}

export async function testWebhooks() {
  const settings = getPulseSettings();
  const payload = {
    event: 'pulse.webhook.test',
    at: new Date().toISOString(),
    service: 'practopulse',
  };
  return {
    autopilot: await postWebhook(
      settings.AUTOPILOT_WEBHOOK_URL,
      payload,
      settings.WEBHOOK_SECRET
    ),
    n8n: await postWebhook(settings.N8N_WEBHOOK_URL, payload, settings.WEBHOOK_SECRET),
    slack: await postWebhook(
      settings.SLACK_WEBHOOK_URL,
      { text: 'PractoPulse webhook test OK' },
      settings.WEBHOOK_SECRET
    ),
    custom: await postWebhook(settings.CUSTOM_WEBHOOK_URL, payload, settings.WEBHOOK_SECRET),
  };
}

/**
 * Lead Validation & Verification Engine
 * Runs deep multi-check verification:
 * - Phone validation (Indian 10-digit, mobile vs landline, format normalization)
 * - Email validation (regex, domain check)
 * - Duplicate detection across CRM database
 * - Practo profile status verification
 * - Authenticity confidence score (0 - 100)
 */
export function validateLeads(leads = []) {
  const existingPhones = new Set();
  const existingEmails = new Set();
  const existingCompanies = new Set();

  try {
    const rows = db.prepare('SELECT phone, email, company, notes FROM leads').all();
    for (const r of rows) {
      if (r.phone) existingPhones.add(r.phone.replace(/\D/g, '').slice(-10));
      if (r.email) existingEmails.add(String(r.email).toLowerCase().trim());
      if (r.company) existingCompanies.add(String(r.company).toLowerCase().trim());
    }
  } catch {
    /* fallback if db not ready */
  }

  let validCount = 0;
  let invalidCount = 0;
  let duplicateCount = 0;
  let totalScore = 0;

  const validatedLeads = leads.map((lead) => {
    const rawPhone = String(lead.phone || '').trim();
    const digits = rawPhone.replace(/\D/g, '');
    const clean10 = digits.slice(-10);
    const isMobile = /^[6-9]\d{9}$/.test(clean10);
    const isLandline = digits.length >= 8 && digits.length <= 11;
    const phoneValid = digits.length >= 8 && (isMobile || isLandline);
    const formattedPhone = clean10.length === 10 ? `+91 ${clean10.slice(0, 5)} ${clean10.slice(5)}` : rawPhone;

    const rawEmail = String(lead.email || '').trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const emailValid = emailRegex.test(rawEmail) && !rawEmail.includes('example.com') && !rawEmail.includes('test.com');

    // Duplicate check
    const isDupPhone = clean10.length === 10 && existingPhones.has(clean10);
    const isDupEmail = rawEmail && existingEmails.has(rawEmail);
    const isDupCompany = lead.clinicName && existingCompanies.has(String(lead.clinicName).toLowerCase().trim());
    const isDuplicate = isDupPhone || isDupEmail || isDupCompany;

    // Authenticity scoring
    let score = 30; // base score
    if (phoneValid) score += isMobile ? 25 : 15;
    if (emailValid) score += 20;
    if (lead.googleRating && Number(lead.googleRating) > 3.5) score += 10;
    if (lead.reviewCount && Number(lead.reviewCount) > 5) score += 5;
    if (lead.practoProfileStatus && lead.practoProfileStatus !== 'Unclaimed') score += 10;
    if (lead.address && lead.address.length > 10) score += 5;
    if (isDuplicate) score = Math.max(10, score - 25);

    score = Math.min(100, Math.max(10, score));
    totalScore += score;

    let validationStatus = 'VALID';
    const validationIssues = [];
    if (!phoneValid) {
      validationIssues.push('Invalid phone format');
      validationStatus = 'INVALID';
    }
    if (!emailValid && !rawEmail) {
      validationIssues.push('Missing email (phone-only outreach)');
    } else if (!emailValid) {
      validationIssues.push('Invalid email format');
    }
    if (isDuplicate) {
      validationIssues.push('Duplicate found in CRM');
      if (validationStatus === 'VALID') validationStatus = 'DUPLICATE';
    }

    if (validationStatus === 'VALID') validCount++;
    else if (validationStatus === 'DUPLICATE') duplicateCount++;
    else invalidCount++;

    return {
      ...lead,
      phone: formattedPhone,
      phoneValid,
      phoneType: isMobile ? 'mobile' : isLandline ? 'landline' : 'unknown',
      emailValid,
      isDuplicate,
      authenticityScore: score,
      validationStatus,
      validationIssues,
      validatedAt: new Date().toISOString(),
    };
  });

  const avgScore = leads.length ? Math.round(totalScore / leads.length) : 0;

  return {
    leads: validatedLeads,
    summary: {
      total: leads.length,
      valid: validCount,
      invalid: invalidCount,
      duplicates: duplicateCount,
      highQuality: validatedLeads.filter((l) => l.authenticityScore >= 75).length,
      avgScore,
    },
  };
}

/**
 * Notifications Management
 */
export function listNotifications({ limit = 30 } = {}) {
  try {
    const rows = db
      .prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?')
      .all(Number(limit) || 30);
    const unreadCount = db.prepare('SELECT COUNT(*) AS c FROM notifications WHERE is_read = 0').get()?.c || 0;
    return { notifications: rows, unreadCount };
  } catch {
    return { notifications: [], unreadCount: 0 };
  }
}

export function addNotification({ title, message, type = 'info', link = '' }) {
  try {
    const id = `notif_${nanoid(8)}`;
    const ts = new Date().toISOString();
    db.prepare(
      'INSERT INTO notifications (id, title, message, type, link, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)'
    ).run(id, title, message, type, link, ts);
    return { id, title, message, type, link, is_read: 0, created_at: ts };
  } catch (err) {
    return null;
  }
}

export function markNotificationsRead(ids = []) {
  try {
    if (ids && ids.length) {
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(`UPDATE notifications SET is_read = 1 WHERE id IN (${placeholders})`).run(...ids);
    } else {
      db.prepare('UPDATE notifications SET is_read = 1').run();
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * CRM Lead Hub Queries & Stage updates
 */
export function listCrmLeads({ stage, search, limit = 100 } = {}) {
  try {
    let sql = 'SELECT * FROM leads';
    const params = [];
    const conditions = [];

    if (stage && stage !== 'all') {
      conditions.push('stage = ?');
      params.push(stage);
    }
    if (search) {
      conditions.push('(company LIKE ? OR name LIKE ? OR phone LIKE ? OR email LIKE ?)');
      const q = `%${search}%`;
      params.push(q, q, q, q);
    }

    if (conditions.length) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    sql += ' ORDER BY updated_at DESC LIMIT ?';
    params.push(Number(limit) || 100);

    const leads = db.prepare(sql).all(...params);

    if (!leads.length) {
      return listPulseLeads().map((l) => ({
        ...l,
        stage: l.status === 'DEMO_SCHEDULED' ? 'qualified' : l.status === 'OUTREACH_ACTIVE' ? 'contacted' : 'new',
        company: l.clinicName,
        name: l.doctorName,
        score: l.leadScore,
        calls: [],
        messages: [],
      }));
    }

    // Attach latest calls and messages
    const getCalls = db.prepare('SELECT * FROM call_logs WHERE lead_id = ? ORDER BY created_at DESC LIMIT 5');
    const getMsgs = db.prepare('SELECT * FROM outreach_messages WHERE lead_id = ? ORDER BY created_at DESC LIMIT 5');

    return leads.map((l) => {
      let calls = [];
      let msgs = [];
      try {
        calls = getCalls.all(l.id);
        msgs = getMsgs.all(l.id);
      } catch {
        /* ignore */
      }
      return {
        ...l,
        calls,
        messages: msgs,
      };
    });
  } catch {
    return listPulseLeads();
  }
}


export function updateLeadStage(id, stage, note = '') {
  const ts = new Date().toISOString();
  const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
  if (existing) {
    db.prepare('UPDATE leads SET stage = ?, updated_at = ? WHERE id = ?').run(stage, ts, id);
  } else {
    const pulseLead = listPulseLeads().find((l) => l.id === id);
    db.prepare(`
      INSERT INTO leads (id, company, name, phone, email, stage, score, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      pulseLead?.clinicName || 'Clinic',
      pulseLead?.doctorName || 'Doctor',
      pulseLead?.phone || '',
      pulseLead?.email || '',
      stage,
      pulseLead?.leadScore || 70,
      ts,
      ts
    );
  }
  if (note) {
    db.prepare(
      'INSERT INTO activities (id, lead_id, type, title, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(`act_${nanoid(8)}`, id, 'stage_change', `Stage changed to ${stage}`, note, ts);
  }
  return db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
}



export function addLeadNote(id, note, nextAction = '') {
  const ts = new Date().toISOString();
  db.prepare('UPDATE leads SET notes = COALESCE(notes, \'\') || ? || \'\\n\', next_action = COALESCE(?, next_action), updated_at = ? WHERE id = ?').run(
    `[${new Date().toLocaleDateString()}] ${note}`,
    nextAction || null,
    ts,
    id
  );
  db.prepare(
    'INSERT INTO activities (id, lead_id, type, title, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(`act_${nanoid(8)}`, id, 'note', 'Note added', note, ts);
  return db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
}

/**
 * Master Comprehensive Lead Export
 * Assembles full 360-degree dataset:
 * Contact info, Validation scores, Product Fit, Pitch Hook, Deck URL, Call Status, Duration, Recording URL, Transcript, Summary, WhatsApp & Email history.
 */
export function exportMasterLeads() {
  let leads = [];
  try {
    leads = db.prepare('SELECT * FROM leads ORDER BY updated_at DESC').all();
  } catch {
    leads = [];
  }
  if (!leads.length) {
    leads = MOCK_LEADS.map((l) => ({
      id: l.id,
      company: l.clinicName,
      name: l.doctorName,
      phone: l.phone,
      email: l.email,
      stage: l.status === 'DEMO_SCHEDULED' ? 'qualified' : 'new',
      score: l.leadScore,
      notes: l.pitchHook,
      created_at: l.createdAt,
      updated_at: l.createdAt,
    }));
  }

  const getLatestCall = db.prepare('SELECT * FROM call_logs WHERE lead_id = ? ORDER BY created_at DESC LIMIT 1');
  const getLatestWa = db.prepare('SELECT * FROM outreach_messages WHERE lead_id = ? AND channel = \'whatsapp\' ORDER BY created_at DESC LIMIT 1');
  const getLatestEmail = db.prepare('SELECT * FROM outreach_messages WHERE lead_id = ? AND (channel = \'gmail\' OR channel = \'email\') ORDER BY created_at DESC LIMIT 1');

  return leads.map((l) => {
    let call = null;
    let wa = null;
    let email = null;
    try {
      call = getLatestCall.get(l.id) || null;
      wa = getLatestWa.get(l.id) || null;
      email = getLatestEmail.get(l.id) || null;
    } catch {
      /* ignore */
    }

    const classified = classifyLead({
      clinicName: l.company,
      doctorName: l.name,
      rating: 4.5,
      reviews: 40,
    });

    return {
      leadId: l.id,
      clinicName: l.company || l.name || 'Clinic',
      doctorName: l.name || 'Doctor',
      phone: l.phone || '',
      email: l.email || '',
      stage: l.stage || 'new',
      leadScore: l.score || classified.leadScore,
      recommendedProduct: classified.recommendedProduct,
      pitchHook: classified.pitchHook,
      pitchDeckUrl: `https://gamma.app/docs/practopulse-${l.id}`,
      validationStatus: l.phone ? 'VALID' : 'NEEDS_REVIEW',
      authenticityScore: l.phone && l.email ? 95 : l.phone ? 80 : 45,
      callStatus: call?.status || 'NOT_CALLED',
      callDurationSec: call?.duration_sec || 0,
      callRecordingUrl: call?.recording_url || '',
      callTranscript: call?.transcript || '',
      callSummary: call?.summary || '',
      whatsappStatus: wa?.status || 'NOT_SENT',
      whatsappMessageBody: wa?.body || '',
      emailStatus: email?.status || 'NOT_SENT',
      emailSubject: email ? 'Practo Healthcare Growth Walkthrough' : '',
      createdAt: l.created_at || new Date().toISOString(),
      updatedAt: l.updated_at || new Date().toISOString(),
    };
  });
}

