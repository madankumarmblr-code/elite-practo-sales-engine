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
  const practoStatus =
    lead.practoProfileStatus ||
    (lead.practo?.hasProfile
      ? lead.practo?.isPrime
        ? 'Prime'
        : 'Non-Prime'
      : 'Unclaimed');

  let recommendedProduct = 'REACH';
  if (reviewCount >= 200 || googleRating >= 4.5) recommendedProduct = 'PRIME';
  if (
    practoStatus === 'Ray User' ||
    practoStatus === 'Reach Active' ||
    (lead.practo?.hasProfile && recommendedProduct === 'PRIME')
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

  return { recommendedProduct, pitchHook, leadScore, practoProfileStatus: practoStatus };
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
    practoUrl: item.practo?.url || '',
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
  return MOCK_LEADS.map((l) =>
    queuedIds.has(l.id) ? { ...l, status: l.status === 'NEW' ? 'AUTOPILOT_QUEUED' : l.status } : l
  );
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
  try {
    leadCount = db.prepare('SELECT COUNT(*) AS c FROM leads').get()?.c || 0;
  } catch {
    leadCount = 0;
  }

  const jobs = queue.jobs || [];
  return {
    ok: true,
    service: 'practopulse',
    env: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    uptimeSec: Math.floor((Date.now() - STARTED_AT) / 1000),
    time: new Date().toISOString(),
    memory: {
      rssMb: Math.round(mem.rss / 1024 / 1024),
      heapMb: Math.round(mem.heapUsed / 1024 / 1024),
    },
    database: { ok: true, leadsStored: leadCount },
    components: [
      { id: 'api', label: 'API server', status: 'online' },
      { id: 'discovery', label: 'Lead discovery', status: 'online' },
      { id: 'pulse', label: 'PractoPulse engine', status: 'online' },
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
    autopilot: {
      level: settings.AUTOPILOT_LEVEL || 'assist',
      queued: jobs.filter((j) => j.status === 'queued').length,
      running: jobs.filter((j) => j.status === 'running').length,
      done: jobs.filter((j) => j.status === 'done' || j.status === 'pushed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
      total: jobs.length,
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

  const queue = getAutopilotQueue();
  const jobs = [...(queue.jobs || [])];
  const created = [];
  const ts = new Date().toISOString();

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
    if ((settings.AUTOPILOT_AUTO_DEMO || channels.demo) && autopilotLevel === 'full') {
      steps.push({ id: 'demo', status: 'queued', detail: 'Hold calendar slot' });
    }

    job.steps = steps;
    job.status = autopilotLevel === 'assist' ? 'pushed' : 'running';
    created.push(job);
    jobs.unshift(job);
  }

  // Cap queue size
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

  // Advance simulated steps for sequence/full
  if (autopilotLevel !== 'assist') {
    for (const job of created) {
      job.steps = job.steps.map((s) =>
        s.status === 'queued' ? { ...s, status: 'done', detail: `${s.detail} · simulated` } : s
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
    message: `Pushed ${created.length} lead(s) to AI Autopilot (${autopilotLevel})`,
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
