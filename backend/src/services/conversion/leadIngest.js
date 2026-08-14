/**
 * Lead ingest for the Practo conversion pipeline.
 * Preserves city_location + speciality and maps into CRM leads + conversion_leads.
 */
import { nanoid } from 'nanoid';
import db from '../../db/db.js';
import { logEvent } from '../logger.js';
import { assertContextFields, getProduct, normalizeProductId } from './products.js';
import { sendInitialPitch } from './whatsappAutopilot.js';

const now = () => new Date().toISOString();

const ALLOWED_STATUS = new Set(['NEW', 'PITCHED', 'ENGAGED', 'PROPOSAL', 'WON', 'LOST']);

export function validateIngestPayload(body = {}) {
  const { city_location, speciality } = assertContextFields(body);
  const product_id = normalizeProductId(body.product_id);
  if (!product_id || !getProduct(product_id)) {
    const err = new Error(
      'product_id is required and must be PRACTO_RAY | PRACTO_PRIME | PRACTO_REACH'
    );
    err.status = 400;
    throw err;
  }

  const phone = String(body.phone || '').trim();
  const doctor_name = String(body.doctor_name || body.name || '').trim();
  const clinic_name = String(body.clinic_name || body.company || '').trim();
  if (!doctor_name && !clinic_name) {
    const err = new Error('doctor_name or clinic_name is required');
    err.status = 400;
    throw err;
  }
  if (!phone && !String(body.email || '').trim()) {
    const err = new Error('phone or email is required for outreach');
    err.status = 400;
    throw err;
  }

  const status = String(body.status || 'NEW').trim().toUpperCase() || 'NEW';
  if (!ALLOWED_STATUS.has(status)) {
    // still accept unknown as NEW-like custom status string capped
  }

  return {
    lead_id: String(body.lead_id || '').trim() || `PRAC-${nanoid(8).toUpperCase()}`,
    doctor_name: doctor_name || clinic_name,
    clinic_name: clinic_name || doctor_name,
    email: String(body.email || '').trim() || null,
    phone: phone || null,
    city_location,
    speciality,
    product_id,
    status: status || 'NEW',
  };
}

function upsertCrmLead(payload) {
  const existing =
    (payload.email &&
      db.prepare('SELECT * FROM leads WHERE lower(email) = ?').get(payload.email.toLowerCase())) ||
    (payload.phone &&
      db.prepare('SELECT * FROM leads WHERE phone = ?').get(payload.phone));

  const notes = [
    `Specialty: ${payload.speciality}`,
    `Location: ${payload.city_location}`,
    `Product: ${payload.product_id}`,
    `External lead_id: ${payload.lead_id}`,
    'Source: conversion_ingest',
  ].join('\n');

  const ts = now();
  if (existing) {
    db.prepare(
      `UPDATE leads
       SET name = ?, company = ?, email = COALESCE(?, email), phone = COALESCE(?, phone),
           notes = ?, source = 'conversion_ingest', stage = CASE WHEN stage = 'won' THEN stage ELSE 'new' END,
           preferred_channel = 'whatsapp', updated_at = ?
       WHERE id = ?`
    ).run(
      payload.doctor_name,
      payload.clinic_name,
      payload.email,
      payload.phone,
      notes,
      ts,
      existing.id
    );
    return existing.id;
  }

  const id = nanoid();
  db.prepare(
    `INSERT INTO leads (
      id, name, email, phone, company, title, source, stage, score, value, status,
      assigned_to, notes, preferred_channel, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'conversion_ingest', 'new', 55, 0, 'open', 'Unassigned', ?, 'whatsapp', ?, ?)`
  ).run(
    id,
    payload.doctor_name,
    payload.email,
    payload.phone,
    payload.clinic_name,
    payload.speciality,
    notes,
    ts,
    ts
  );
  return id;
}

/**
 * Ingest a lead, optionally fire WhatsApp AI autopilot pitch.
 */
export function ingestLead(body = {}, { autoPitch = true, simulateWhatsApp = true } = {}) {
  const payload = validateIngestPayload(body);
  const ts = now();

  const existingConv = db
    .prepare('SELECT * FROM conversion_leads WHERE external_lead_id = ?')
    .get(payload.lead_id);

  let conversionId;
  let crmLeadId;

  if (existingConv) {
    conversionId = existingConv.id;
    crmLeadId = existingConv.crm_lead_id || upsertCrmLead(payload);
    db.prepare(
      `UPDATE conversion_leads
       SET doctor_name = ?, clinic_name = ?, email = ?, phone = ?,
           city_location = ?, speciality = ?, product_id = ?, status = ?,
           crm_lead_id = ?, updated_at = ?
       WHERE id = ?`
    ).run(
      payload.doctor_name,
      payload.clinic_name,
      payload.email,
      payload.phone,
      payload.city_location,
      payload.speciality,
      payload.product_id,
      payload.status,
      crmLeadId,
      ts,
      conversionId
    );
  } else {
    conversionId = nanoid();
    crmLeadId = upsertCrmLead(payload);
    db.prepare(
      `INSERT INTO conversion_leads (
        id, external_lead_id, crm_lead_id, doctor_name, clinic_name, email, phone,
        city_location, speciality, product_id, status, conversation_state, last_pitch,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', '', ?, ?)`
    ).run(
      conversionId,
      payload.lead_id,
      crmLeadId,
      payload.doctor_name,
      payload.clinic_name,
      payload.email,
      payload.phone,
      payload.city_location,
      payload.speciality,
      payload.product_id,
      payload.status,
      ts,
      ts
    );
  }

  db.prepare(
    `INSERT INTO activities (id, lead_id, type, channel, title, detail, status, created_at)
     VALUES (?, ?, 'system', 'webhook', ?, ?, 'completed', ?)`
  ).run(
    nanoid(),
    crmLeadId,
    `Lead ingested · ${payload.product_id}`,
    `${payload.clinic_name} · ${payload.speciality} · ${payload.city_location}`,
    ts
  );

  let pitch = null;
  if (autoPitch) {
    pitch = sendInitialPitch(conversionId, { simulate: simulateWhatsApp });
  }

  logEvent({
    type: 'info',
    category: 'lead_ingest',
    message: `Ingested ${payload.lead_id}`,
    detail: `${payload.product_id} · ${payload.city_location} · ${payload.speciality}`,
    meta: { conversionId, crmLeadId, autoPitch },
  });

  return {
    status: 'ACCEPTED',
    lead_id: payload.lead_id,
    conversion_lead_id: conversionId,
    crm_lead_id: crmLeadId,
    city_location: payload.city_location,
    speciality: payload.speciality,
    product_id: payload.product_id,
    autopilot: pitch,
  };
}

export function getConversionLeadByExternalId(leadId) {
  return db.prepare('SELECT * FROM conversion_leads WHERE external_lead_id = ?').get(String(leadId));
}

export function getConversionLeadById(id) {
  return db.prepare('SELECT * FROM conversion_leads WHERE id = ?').get(String(id));
}

export default { ingestLead, validateIngestPayload };
