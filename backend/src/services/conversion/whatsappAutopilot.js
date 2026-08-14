/**
 * WhatsApp AI Autopilot — pitch generation + stateful inbound replies.
 * Always preserves city_location and speciality in system memory / conversation state.
 */
import { nanoid } from 'nanoid';
import db from '../../db/db.js';
import { logEvent } from '../logger.js';
import { assertContextFields, getProduct, normalizeProductId } from './products.js';
import { generateCommercialProposalSuite } from './proposalEngine.js';

const now = () => new Date().toISOString();

function hasOpenAiKey() {
  if (process.env.OPENAI_API_KEY) return true;
  try {
    const rows = db
      .prepare(
        `SELECT secrets FROM api_integrations
         WHERE channel = 'ai' AND enabled = 1 AND provider LIKE '%openai%'`
      )
      .all();
    for (const row of rows) {
      const secrets = JSON.parse(row.secrets || '{}');
      if (secrets.apiKey || secrets.api_key || secrets.OPENAI_API_KEY) return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

function loadConversation(conversionLeadId) {
  const row = db
    .prepare('SELECT * FROM conversion_leads WHERE id = ?')
    .get(conversionLeadId);
  if (!row) return null;
  let state = {};
  try {
    state = JSON.parse(row.conversation_state || '{}');
  } catch {
    state = {};
  }
  return { row, state };
}

function saveConversation(conversionLeadId, state, extra = {}) {
  const ts = now();
  db.prepare(
    `UPDATE conversion_leads
     SET conversation_state = ?, updated_at = ?,
         status = COALESCE(?, status),
         last_pitch = COALESCE(?, last_pitch)
     WHERE id = ?`
  ).run(
    JSON.stringify(state),
    ts,
    extra.status || null,
    extra.last_pitch || null,
    conversionLeadId
  );
}

function recordMessage(conversionLeadId, direction, body, meta = {}) {
  const id = nanoid();
  db.prepare(
    `INSERT INTO whatsapp_messages (id, conversion_lead_id, direction, body, meta, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, conversionLeadId, direction, body, JSON.stringify(meta), now());
  return id;
}

/**
 * Build system memory that MUST travel with every AI turn.
 */
export function buildSystemMemory(lead) {
  const { city_location, speciality } = assertContextFields(lead);
  const product = getProduct(lead.product_id);
  return {
    city_location,
    speciality,
    product_id: product?.id || normalizeProductId(lead.product_id),
    product_label: product?.label || lead.product_id,
    doctor_name: lead.doctor_name,
    clinic_name: lead.clinic_name,
    rule: 'Never drop city_location or speciality. Never offer Basic/Standard/Gold/Enterprise tiers — only Commercial Proposal Suite.',
  };
}

/**
 * Personalized outbound WhatsApp pitch.
 */
export function generatePitchMessage(lead) {
  const memory = buildSystemMemory(lead);
  const product = getProduct(memory.product_id);
  const doctor = lead.doctor_name || 'Doctor';
  const clinic = lead.clinic_name || 'your clinic';

  const text = `Hi ${doctor}, this is Practo Enterprise.

We help *${specialityLabel(memory.speciality)}* practices in *${memory.city_location}* grow with *${product.label}*:
${product.pitchFocus.map((f) => `• ${f}`).join('\n')}

For ${clinic}, we prepare a single *Commercial Proposal Suite* (no multi-tier packages) tailored to ${memory.speciality} in ${memory.city_location}.

Reply *YES* for the suite overview, or ask any question about ${product.short}.`;

  return { text, memory, aiUsed: hasOpenAiKey() };
}

function specialityLabel(s) {
  return String(s || '').trim();
}

function wantsProposal(inbound) {
  const t = String(inbound || '').toLowerCase();
  return (
    /\b(yes|yeah|yep|sure|ok|okay|interested|proposal|pricing|price|quote|commercial|suite|send)\b/.test(
      t
    ) || /\bhow much\b/.test(t)
  );
}

/**
 * Autopilot reply — keeps city_location + speciality in every answer.
 */
export function generateAutopilotReply(lead, inboundText, state = {}) {
  const memory = buildSystemMemory(lead);
  const product = getProduct(memory.product_id);
  const inbound = String(inboundText || '').trim();
  const nextState = {
    ...state,
    city_location: memory.city_location,
    speciality: memory.speciality,
    product_id: memory.product_id,
    turns: Number(state.turns || 0) + 1,
    last_inbound_at: now(),
  };

  if (wantsProposal(inbound)) {
    const proposal = generateCommercialProposalSuite(lead);
    nextState.stage = 'PROPOSAL_SENT';
    nextState.last_proposal_at = now();
    const text = `Great — here is your *${proposal.proposal.package_name}* for *${product.label}*.

📍 City: *${memory.city_location}*
🩺 Speciality: *${memory.speciality}*
🏥 Clinic: ${lead.clinic_name || '—'}
👤 ${lead.doctor_name || '—'}

${proposal.proposal.description}

Included:
${proposal.proposal.included_features
  .slice(0, 5)
  .map((f) => `• ${f}`)
  .join('\n')}

Pricing: ${proposal.proposal.pricing.suite_total} (${proposal.proposal.pricing.billing_cycle}, ${proposal.proposal.pricing.currency})

This is the *only* offer package we share — no Basic/Standard/Gold tiers.
Shall I book a 15-min commercial walkthrough for ${memory.city_location}?`;

    return {
      text,
      memory,
      state: nextState,
      proposal,
      action: 'proposal_suite',
      aiUsed: hasOpenAiKey(),
    };
  }

  nextState.stage = state.stage || 'ENGAGED';
  const text = `Thanks for the note.

For *${memory.speciality}* in *${memory.city_location}*, *${product.label}* focuses on:
${product.pitchFocus.map((f) => `• ${f}`).join('\n')}

Happy to answer specifics for ${lead.clinic_name || 'your practice'}. When you are ready, reply *PROPOSAL* and I will send the *Commercial Proposal Suite* only (no other packages).`;

  return {
    text,
    memory,
    state: nextState,
    proposal: null,
    action: 'clarify',
    aiUsed: hasOpenAiKey(),
  };
}

/**
 * Persist outbound pitch for a conversion lead and optionally mark status.
 */
export function sendInitialPitch(conversionLeadId, { simulate = true } = {}) {
  const loaded = loadConversation(conversionLeadId);
  if (!loaded) {
    const err = new Error('Conversion lead not found');
    err.status = 404;
    throw err;
  }
  const lead = rowToLead(loaded.row);
  const pitch = generatePitchMessage(lead);
  const state = {
    ...loaded.state,
    city_location: pitch.memory.city_location,
    speciality: pitch.memory.speciality,
    product_id: pitch.memory.product_id,
    stage: 'PITCH_SENT',
    last_pitch_at: now(),
  };
  saveConversation(conversionLeadId, state, {
    status: 'PITCHED',
    last_pitch: pitch.text,
  });
  recordMessage(conversionLeadId, 'outbound', pitch.text, {
    kind: 'initial_pitch',
    simulate,
    memory: pitch.memory,
  });

  logEvent({
    type: 'info',
    category: 'whatsapp_autopilot',
    message: `Pitch queued for ${lead.lead_id || conversionLeadId}`,
    detail: `${pitch.memory.product_id} · ${pitch.memory.city_location} · ${pitch.memory.speciality}`,
    meta: { conversionLeadId, simulate },
  });

  return {
    conversion_lead_id: conversionLeadId,
    delivery: simulate ? 'simulated' : 'queued',
    message: pitch.text,
    memory: pitch.memory,
    status: 'PITCHED',
  };
}

/**
 * Handle inbound WhatsApp webhook payload.
 */
export function handleInboundWhatsApp({
  phone,
  text,
  lead_id,
  conversion_lead_id,
  city_location,
  speciality,
} = {}) {
  let row = null;
  if (conversion_lead_id) {
    row = db.prepare('SELECT * FROM conversion_leads WHERE id = ?').get(conversion_lead_id);
  }
  if (!row && lead_id) {
    row = db
      .prepare('SELECT * FROM conversion_leads WHERE external_lead_id = ?')
      .get(String(lead_id));
  }
  if (!row && phone) {
    row = db
      .prepare(
        `SELECT * FROM conversion_leads
         WHERE phone = ? OR phone = ?
         ORDER BY updated_at DESC LIMIT 1`
      )
      .get(String(phone), String(phone).replace(/\s+/g, ''));
  }
  if (!row) {
    const err = new Error(
      'No conversion lead matched for inbound WhatsApp — provide lead_id, conversion_lead_id, or known phone'
    );
    err.status = 404;
    throw err;
  }

  // Preserve context: inbound may restate city/speciality but never wipe stored values
  const lead = rowToLead(row);
  if (city_location && !lead.city_location) lead.city_location = city_location;
  if (speciality && !lead.speciality) lead.speciality = speciality;

  recordMessage(row.id, 'inbound', String(text || ''), { phone });
  let state = {};
  try {
    state = JSON.parse(row.conversation_state || '{}');
  } catch {
    state = {};
  }

  const reply = generateAutopilotReply(lead, text, state);
  saveConversation(row.id, reply.state, {
    status: reply.action === 'proposal_suite' ? 'PROPOSAL' : 'ENGAGED',
  });
  recordMessage(row.id, 'outbound', reply.text, {
    kind: 'autopilot_reply',
    action: reply.action,
    memory: reply.memory,
  });

  return {
    conversion_lead_id: row.id,
    lead_id: row.external_lead_id,
    reply: reply.text,
    action: reply.action,
    memory: reply.memory,
    proposal: reply.proposal,
    status: reply.action === 'proposal_suite' ? 'PROPOSAL' : 'ENGAGED',
  };
}

export function rowToLead(row) {
  return {
    id: row.id,
    lead_id: row.external_lead_id,
    external_lead_id: row.external_lead_id,
    doctor_name: row.doctor_name,
    clinic_name: row.clinic_name,
    email: row.email,
    phone: row.phone,
    city_location: row.city_location,
    speciality: row.speciality,
    product_id: row.product_id,
    status: row.status,
  };
}

export default {
  buildSystemMemory,
  generatePitchMessage,
  generateAutopilotReply,
  sendInitialPitch,
  handleInboundWhatsApp,
};
