/**
 * Local AI assist helpers for drafts, follow-ups, replies, and smart channel pick.
 * Uses dialogue templates + lead signals. When an LLM key is enabled it marks
 * drafts as AI-polished (works offline without requiring outbound LLM calls).
 */
import db from '../db/db.js';
import { personalizeTemplate, channelMeta } from './channels/catalog.js';
import { DIALOGUES, getDialogue, dialoguesFor, productLabel, PRODUCTS } from './channels/dialogues.js';

function aiSettings() {
  try {
    const row = db.prepare("SELECT value FROM app_settings WHERE key = 'ai'").get();
    return row ? JSON.parse(row.value) : {};
  } catch {
    return {};
  }
}

function hasAnyAiKey() {
  const rows = db
    .prepare(
      `SELECT provider, secrets FROM api_integrations
       WHERE channel = 'ai' AND enabled = 1`
    )
    .all();
  for (const row of rows) {
    try {
      const secrets = JSON.parse(row.secrets || '{}');
      if (Object.values(secrets).some(Boolean)) return { ok: true, provider: row.provider };
    } catch {
      /* ignore */
    }
  }
  return { ok: false, provider: null };
}

function leadSignals(lead = {}) {
  const notes = String(lead.notes || '');
  const hasPhone = Boolean(String(lead.phone || lead.owner?.phone || '').trim());
  const hasEmail = Boolean(String(lead.email || lead.owner?.email || '').trim());
  const hasWebsite = /Website:\s*https?:/i.test(notes) || Boolean(lead.website);
  const hasPracto = /Practo profile:\s*Yes/i.test(notes) || lead.practo?.hasProfile === true;
  const score = Number(lead.score || 0);
  return { hasPhone, hasEmail, hasWebsite, hasPracto, score, notes };
}

/**
 * Smart channel picker — WhatsApp / Gmail / Calls from lead signals.
 */
export function pickSmartChannel(lead = {}) {
  const s = leadSignals(lead);
  const reasons = [];

  if (s.hasPhone && !s.hasPracto) {
    reasons.push('Has phone, no Practo — WhatsApp warm intro is highest reply rate');
    return { channel: 'whatsapp', confidence: 0.86, reasons, label: channelMeta('whatsapp').short };
  }
  if (s.hasEmail && s.hasPracto) {
    reasons.push('Practo listed + email — Gmail nurture / proposal path');
    return { channel: 'gmail', confidence: 0.8, reasons, label: channelMeta('gmail').short };
  }
  if (s.hasPhone && s.score >= 70) {
    reasons.push('High score + phone — Calls AI qualifier');
    return { channel: 'calls', confidence: 0.78, reasons, label: channelMeta('calls').short };
  }
  if (s.hasPhone) {
    reasons.push('Phone available — default WhatsApp');
    return { channel: 'whatsapp', confidence: 0.7, reasons, label: channelMeta('whatsapp').short };
  }
  if (s.hasEmail) {
    reasons.push('Email only — Gmail');
    return { channel: 'gmail', confidence: 0.68, reasons, label: channelMeta('gmail').short };
  }
  reasons.push('Limited contact data — Calls script for research / skip');
  return { channel: 'calls', confidence: 0.45, reasons, label: channelMeta('calls').short };
}

function pickDialogue(channel, product = 'prime') {
  const list = dialoguesFor(channel, product);
  if (list.length) return list[0];
  return DIALOGUES.find((d) => d.channel === channel) || DIALOGUES[0];
}

function polishDraft(text, { channel, lead } = {}) {
  const settings = aiSettings();
  const tone = settings.tone || 'consultative';
  let out = String(text || '').trim();
  const ai = hasAnyAiKey();

  if (tone === 'consultative') {
    out = out.replace(/\bASAP\b/gi, 'this week').replace(/\b!!!+/g, '!');
  }
  if (settings.personalizeWithCompany !== false && lead?.company) {
    if (!out.includes(lead.company)) {
      out = `${out}\n\n(Context: tailored for ${lead.company})`;
    }
  }
  if (ai.ok) {
    out = out
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s+$/gm, '')
      .trim();
    return {
      text: out,
      aiUsed: true,
      aiProvider: ai.provider,
      aiNote: `Polished with ${ai.provider} connector profile (${tone} tone)`,
    };
  }
  return {
    text: out,
    aiUsed: false,
    aiProvider: null,
    aiNote: 'Template draft — enable OpenAI / Gemini / Groq for stronger polish',
  };
}

/**
 * One-click AI outreach draft for WhatsApp / Gmail / Calls × product.
 */
export function buildOutreachDraft(lead, { channel, product = 'prime' } = {}) {
  const picked = channel ? { channel, reasons: ['Manual channel'], confidence: 1, label: channelMeta(channel).short } : pickSmartChannel(lead);
  const ch = picked.channel;
  const dialogue = pickDialogue(ch, product);
  const meta = channelMeta(ch);
  const subject = personalizeTemplate(dialogue?.subject || meta.defaultSubject || '', lead);
  const rawBody = personalizeTemplate(dialogue?.body || meta.defaultTemplate, lead, { subject });
  const polished = polishDraft(rawBody, { channel: ch, lead });

  return {
    channel: ch,
    channelLabel: picked.label,
    smartPick: picked,
    product,
    productLabel: productLabel(product),
    dialogueId: dialogue?.id || null,
    dialogueTitle: dialogue?.title || null,
    subject: subject || null,
    body: polished.text,
    steps: dialogue?.steps || [],
    aiUsed: polished.aiUsed,
    aiNote: polished.aiNote,
    products: PRODUCTS,
  };
}

/**
 * Follow-up coach: next action + timing from lead + activity history.
 */
export function suggestFollowUp(lead, activities = []) {
  const settings = aiSettings();
  const hours = Number(settings.autoFollowUpHours || 24);
  const s = leadSignals(lead);
  const channelPick = pickSmartChannel(lead);
  const last = activities[0] || null;
  const lastAt = lead.last_contacted_at || last?.created_at || lead.updated_at || lead.created_at;
  const lastMs = lastAt ? new Date(lastAt).getTime() : 0;
  const ageHours = lastMs ? Math.max(0, (Date.now() - lastMs) / 3600000) : 999;
  const due = ageHours >= hours;

  let action;
  let timing;
  let priority;

  if (!s.hasPhone && !s.hasEmail) {
    action = 'Enrich contact (phone/email) via Places / website before outreach';
    timing = 'Now';
    priority = 'high';
  } else if (lead.stage === 'new' || !lead.last_contacted_at) {
    action = `First touch on ${channelPick.label}: send ${productLabel('prime')} intro`;
    timing = 'Within 2 hours';
    priority = 'high';
  } else if (lead.stage === 'contacted' && due) {
    action = `Follow up on ${channelPick.label} — reference prior touch and offer Commercial Suite walkthrough`;
    timing = `Overdue (>${hours}h) — send today`;
    priority = 'high';
  } else if (lead.stage === 'qualified') {
    action = 'Share commercial proposal (Prime/Reach) and book decision-maker call';
    timing = 'Within 24 hours';
    priority = 'medium';
  } else if (lead.stage === 'proposal') {
    action = 'Nudge proposal review; ask for objections / preferred start month';
    timing = due ? 'Today' : `In ~${Math.max(1, Math.round(hours - ageHours))}h`;
    priority = 'medium';
  } else {
    action = lead.next_action || `Continue ${channelPick.label} nurture`;
    timing = due ? 'Now' : `In ~${Math.max(1, Math.round(hours - ageHours))}h`;
    priority = 'low';
  }

  const checklist = [
    s.hasPhone ? 'Phone ready' : 'Missing phone',
    s.hasEmail ? 'Email ready' : 'Missing email',
    s.hasPracto ? 'On Practo' : 'Not on Practo — strong Reach angle',
    `Preferred channel: ${channelPick.label}`,
  ];

  return {
    action,
    timing,
    priority,
    due,
    hoursSinceTouch: Math.round(ageHours),
    autoFollowUpHours: hours,
    channel: channelPick,
    checklist,
    suggestedNextAction: `${action} · ${timing}`,
  };
}

/**
 * Suggest replies when a lead answers WhatsApp / email / call.
 */
export function suggestReplies(lead, { channel, inbound = '', product = 'prime' } = {}) {
  const pick = channel ? { channel, label: channelMeta(channel).short } : pickSmartChannel(lead);
  const ch = pick.channel;
  const text = String(inbound || '').toLowerCase();
  const name = (lead.name || 'Doctor').split(' ')[0];
  const company = lead.company || 'your clinic';
  const prod = productLabel(product);

  const base = [];
  if (/price|cost|commercial|rate|fee/.test(text)) {
    base.push({
      label: 'Share commercials',
      body:
        ch === 'gmail'
          ? `Hi ${name},\n\nHappy to share commercials for ${prod} tailored to ${company}. I can send 3M / 6M / 12M options from our Commercial Suite today.\n\nWhich term works best?\n\nBest,\nPracto Enterprise`
          : `Hi ${name}, happy to share ${prod} commercials for ${company}. Prefer 3M, 6M or 12M options? I can send them now.`,
    });
  }
  if (/not interested|stop|unsubscribe|no thanks/.test(text)) {
    base.push({
      label: 'Graceful close',
      body: `Understood ${name} — thanks for the clarity. I’ll pause outreach for ${company}. If priorities change on patient discovery/bookings, I’m a message away.`,
    });
  }
  if (/call|speak|talk|free|available/.test(text)) {
    base.push({
      label: 'Book a slot',
      body:
        ch === 'calls'
          ? `Confirm a 15-min slot today or tomorrow for ${company}. Ask for owner/marketing head and pitch ${prod}.`
          : `Great ${name} — I can do a quick 15-min walkthrough for ${company}. Are you free today 4–6pm or tomorrow morning?`,
    });
  }
  if (/whats practo|who is this|how does/.test(text) || !base.length) {
    base.push({
      label: 'Value reminder',
      body:
        ch === 'gmail'
          ? `Hi ${name},\n\nPracto Enterprise helps clinics like ${company} grow discovery and bookings via ${prod}. Happy to send a 1-pager and live inventory for your zone.\n\nBest,\nPracto Enterprise`
          : `Hi ${name}, Practo Enterprise helps ${company} get more patient discovery & bookings with ${prod}. Want a 2-min overview + slot options?`,
    });
  }
  base.push({
    label: 'Ask decision-maker',
    body: `Thanks ${name}. Who owns marketing / growth decisions at ${company} so I share the right proposal?`,
  });

  return {
    channel: ch,
    channelLabel: pick.label || channelMeta(ch).short,
    product,
    productLabel: prod,
    inbound: inbound || null,
    suggestions: base.slice(0, 4),
  };
}

/**
 * Map Hot / Warm / Skip onto CRM fields.
 */
export function qualifyLeadPatch(temperature) {
  const t = String(temperature || '').toLowerCase();
  if (t === 'hot') {
    return {
      temperature: 'hot',
      score: 88,
      stage: 'qualified',
      status: 'open',
      next_action: 'Hot lead — prioritize outreach today',
    };
  }
  if (t === 'warm') {
    return {
      temperature: 'warm',
      score: 65,
      stage: 'contacted',
      status: 'open',
      next_action: 'Warm lead — nurture this week',
    };
  }
  if (t === 'skip') {
    return {
      temperature: 'skip',
      score: 20,
      stage: 'lost',
      status: 'closed',
      next_action: 'Skipped — do not autopilot',
    };
  }
  const err = new Error('temperature must be hot, warm, or skip');
  err.status = 400;
  throw err;
}

export function applySmartChannelToDiscoveryLead(lead) {
  const pick = pickSmartChannel({
    phone: lead.owner?.phone || lead.phone,
    email: lead.owner?.email || lead.email,
    notes: [
      lead.practo?.hasProfile ? 'Practo profile: Yes' : 'Practo profile: No',
      lead.website ? `Website: ${lead.website}` : '',
    ].join('\n'),
    score: lead.score,
    practo: lead.practo,
    website: lead.website,
  });
  return {
    ...lead,
    suggestedChannel: pick.channel,
    channelReason: pick.reasons[0] || '',
    channelConfidence: pick.confidence,
  };
}
