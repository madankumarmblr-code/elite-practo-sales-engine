import { nanoid } from 'nanoid';
import db from '../db/db.js';
import { authRequired, requirePermission } from '../auth/middleware.js';
import { persistDurableDbNow } from '../services/dbSnapshot.js';
import { logEvent } from '../services/logger.js';
import { recordAuditLog } from '../services/auditLogger.js';

const now = () => new Date().toISOString();

function publicLead(row) {
  if (!row) return null;
  return {
    ...row,
    tags: (() => { try { return JSON.parse(row.tags || '[]'); } catch { return []; } })(),
  };
}

export function registerLeadsRoutes(app) {
  // ── List leads ─────────────────────────────────────────────────────────────
  app.get('/api/leads', authRequired, requirePermission('leads:read'), (req, res) => {
    const { stage, status, search, limit = 100, offset = 0, assignedTo, workflowStage, workflow_stage, productInterest, product_interest } = req.query;
    let query = 'SELECT * FROM leads WHERE 1=1';
    const params = [];

    if (stage) { query += ' AND stage = ?'; params.push(stage); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    const wf = workflowStage || workflow_stage;
    if (wf && wf !== 'all') { query += ' AND workflow_stage = ?'; params.push(wf); }
    const pi = productInterest || product_interest;
    if (pi) { query += ' AND product_interest = ?'; params.push(pi); }
    if (assignedTo) { query += ' AND lower(assigned_to) = ?'; params.push(String(assignedTo).toLowerCase()); }
    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR company LIKE ? OR clinic_name LIKE ? OR doctor_name LIKE ? OR city LIKE ? OR locality LIKE ?)';
      const t = `%${search}%`;
      params.push(t, t, t, t, t, t, t, t);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const total = db.prepare(countQuery).get(...params)?.total || 0;

    query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const leads = db.prepare(query).all(...params).map(publicLead);
    res.json({ leads, total, limit: Number(limit), offset: Number(offset) });
  });

  // ── Leads Export (CSV & JSON) ─────────────────────────────────────────────
  app.get('/api/leads/export', authRequired, requirePermission('leads:read'), (req, res) => {
    const { stage, workflowStage, productInterest, format = 'csv' } = req.query;
    let query = 'SELECT * FROM leads WHERE 1=1';
    const params = [];
    if (stage) { query += ' AND stage = ?'; params.push(stage); }
    if (workflowStage) { query += ' AND workflow_stage = ?'; params.push(workflowStage); }
    if (productInterest) { query += ' AND product_interest = ?'; params.push(productInterest); }
    query += ' ORDER BY created_at DESC';

    const rows = db.prepare(query).all(...params);

    if (String(format).toLowerCase() === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="practo_leads_${Date.now()}.json"`);
      return res.json({
        total: rows.length,
        exported_at: new Date().toISOString(),
        leads: rows.map(publicLead),
      });
    }

    const headers = [
      'ID', 'Name', 'Company', 'Phone', 'Email', 'City', 'Locality', 'Speciality',
      'Practo Status', 'Stage', 'Status', 'Temperature', 'Score', 'Product Interest',
      'Workflow Stage', 'Next Action', 'Last Contacted At', 'Created At'
    ];
    const csvLines = [headers.join(',')];

    for (const r of rows) {
      const line = [
        r.id,
        `"${(r.name || '').replace(/"/g, '""')}"`,
        `"${(r.company || '').replace(/"/g, '""')}"`,
        `"${r.phone || ''}"`,
        `"${r.email || ''}"`,
        `"${(r.city || '').replace(/"/g, '""')}"`,
        `"${(r.locality || '').replace(/"/g, '""')}"`,
        `"${(r.speciality || '').replace(/"/g, '""')}"`,
        r.on_practo ? 'On Practo' : 'Not On Practo',
        r.stage || 'new',
        r.status || 'open',
        r.temperature || '',
        r.score || 0,
        r.product_interest || 'prime',
        r.workflow_stage || 'manual',
        `"${(r.next_action || '').replace(/"/g, '""')}"`,
        r.last_contacted_at || '',
        r.created_at,
      ];
      csvLines.push(line.join(','));
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="practo_leads_${Date.now()}.csv"`);
    res.send(csvLines.join('\n'));
  });

  // ── Get single lead ────────────────────────────────────────────────────────
  app.get('/api/leads/:id', authRequired, requirePermission('leads:read'), (req, res) => {
    const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    const activities = db.prepare('SELECT * FROM activities WHERE lead_id = ? ORDER BY created_at DESC LIMIT 50').all(lead.id);
    res.json({ ...publicLead(lead), activities });
  });

  // ── Create lead ────────────────────────────────────────────────────────────
  app.post('/api/leads', authRequired, requirePermission('leads:write'), async (req, res) => {
    const b = req.body || {};
    const name = b.name || b.doctorName || b.doctor_name || b.ownerName || b.owner_name || ('Dr. ' + (b.company || b.clinicName || b.clinic_name || 'Doctor'));
    if (!name && !b.phone) return res.status(400).json({ error: 'Lead name or phone is required' });

    const id = nanoid();
    const ts = now();
    const clinicName = b.company || b.clinicName || b.clinic_name || '';
    const docName = b.doctorName || b.doctor_name || name;
    const phone = b.phone || b.ownerPhone || b.owner_phone || '';
    const email = b.email || b.ownerEmail || b.owner_email || '';
    const title = b.title || b.speciality || 'General Physician';
    const city = b.city || 'Bangalore';
    const locality = b.locality || 'Indiranagar';
    const speciality = b.speciality || b.title || 'General Physician';
    const source = b.source || 'manual';
    const stage = b.stage || 'new';
    const status = b.status || (stage === 'contacted' ? 'contacted' : 'open');
    const score = Number(b.score || 0);
    const value = Number(b.value || 0);
    const assignedTo = b.assignedTo || b.assigned_to || 'Unassigned';
    const notes = b.notes || '';
    const tags = Array.isArray(b.tags) ? b.tags : [];
    const temperature = b.temperature || '';
    const preferredChannel = b.preferredChannel || b.preferred_channel || 'call';
    const productInterest = b.product_interest || b.productInterest || 'prime';
    const workflowStage = b.workflow_stage || b.workflowStage || 'manual';
    const ownerName = b.owner_name || b.ownerName || docName;
    const ownerPhone = b.owner_phone || b.ownerPhone || phone;
    const ownerEmail = b.owner_email || b.ownerEmail || email;
    const receptionPhone = b.reception_phone || b.receptionPhone || phone;
    const address = b.address || '';
    const nextAction = b.nextAction || b.next_action || '';

    db.prepare(`
      INSERT INTO leads (
        id, name, email, phone, company, title, source, stage, score, value,
        status, assigned_to, notes, tags, temperature, preferred_channel,
        city, locality, speciality, on_practo, practo_rating, practo_reviews, practo_url,
        owner_name, owner_phone, owner_email, marketing_name, marketing_phone, marketing_email,
        reception_phone, product_interest, workflow_stage, clinic_name, doctor_name, address,
        next_action, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, 0, 0, 0, '',
        ?, ?, ?, '', '', '',
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?
      )
    `).run(
      id, name, email, phone, clinicName, title, source, stage, score, value,
      status, assignedTo, notes, JSON.stringify(tags), temperature, preferredChannel,
      city, locality, speciality,
      ownerName, ownerPhone, ownerEmail,
      receptionPhone, productInterest, workflowStage, clinicName, docName, address,
      nextAction, ts, ts
    );

    recordAuditLog({ req, action: 'lead.create', entityType: 'lead', entityId: id, details: `Created lead: ${name}`, newState: { name, email, phone, clinicName, source, stage, productInterest, workflowStage } });
    logEvent({ type: 'info', category: 'leads', message: `Lead created: ${name}`, userId: req.user.id });
    await persistDurableDbNow();
    res.status(201).json(publicLead(db.prepare('SELECT * FROM leads WHERE id = ?').get(id)));
  });

  // ── Update lead ────────────────────────────────────────────────────────────
  app.put('/api/leads/:id', authRequired, requirePermission('leads:write'), async (req, res) => {
    const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Lead not found' });

    const b = req.body || {};
    const ts = now();
    db.prepare(`
      UPDATE leads SET
        name=?, email=?, phone=?, company=?, title=?, source=?, stage=?, score=?, value=?, status=?,
        assigned_to=?, notes=?, tags=?, temperature=?, preferred_channel=?, next_action=?,
        city=?, locality=?, speciality=?, product_interest=?, workflow_stage=?,
        owner_name=?, owner_phone=?, owner_email=?, reception_phone=?,
        clinic_name=?, doctor_name=?, address=?, last_contacted_at=COALESCE(?, last_contacted_at),
        updated_at=?
      WHERE id=?
    `).run(
      b.name ?? existing.name,
      b.email ?? existing.email,
      b.phone ?? existing.phone,
      b.company ?? b.clinic_name ?? existing.company,
      b.title ?? b.speciality ?? existing.title,
      b.source ?? existing.source,
      b.stage ?? existing.stage,
      b.score != null ? Number(b.score) : existing.score,
      b.value != null ? Number(b.value) : existing.value,
      b.status ?? existing.status,
      b.assignedTo ?? b.assigned_to ?? existing.assigned_to,
      b.notes ?? existing.notes,
      Array.isArray(b.tags) ? JSON.stringify(b.tags) : existing.tags,
      b.temperature ?? existing.temperature,
      b.preferredChannel ?? b.preferred_channel ?? existing.preferred_channel,
      b.nextAction ?? b.next_action ?? existing.next_action,
      b.city ?? existing.city,
      b.locality ?? existing.locality,
      b.speciality ?? existing.speciality,
      b.product_interest ?? b.productInterest ?? existing.product_interest,
      b.workflow_stage ?? b.workflowStage ?? existing.workflow_stage,
      b.owner_name ?? b.ownerName ?? existing.owner_name,
      b.owner_phone ?? b.ownerPhone ?? existing.owner_phone,
      b.owner_email ?? b.ownerEmail ?? existing.owner_email,
      b.reception_phone ?? b.receptionPhone ?? existing.reception_phone,
      b.clinic_name ?? b.company ?? existing.clinic_name,
      b.doctor_name ?? b.name ?? existing.doctor_name,
      b.address ?? existing.address,
      b.last_contacted_at ?? b.lastContactedAt ?? null,
      ts, existing.id
    );

    if (b.stage && b.stage !== existing.stage) {
      db.prepare('INSERT INTO activities (id, lead_id, type, title, detail, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(nanoid(), existing.id, 'stage_change', `Stage updated to ${b.stage}`, `${existing.stage} → ${b.stage}`, ts);
    }

    recordAuditLog({ req, action: 'lead.update', entityType: 'lead', entityId: existing.id, details: `Updated lead: ${existing.name}`, oldState: existing, newState: b });
    await persistDurableDbNow();
    res.json(publicLead(db.prepare('SELECT * FROM leads WHERE id = ?').get(existing.id)));
  });

  // ── Delete lead ────────────────────────────────────────────────────────────
  app.delete('/api/leads/:id', authRequired, requirePermission('leads:write'), async (req, res) => {
    const existing = db.prepare('SELECT * FROM leads WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Lead not found' });
    db.prepare('DELETE FROM leads WHERE id = ?').run(req.params.id);
    recordAuditLog({ req, action: 'lead.delete', entityType: 'lead', entityId: existing.id, details: `Deleted lead: ${existing.name}`, oldState: existing });
    await persistDurableDbNow();
    res.json({ ok: true });
  });

  // ── Bulk import leads ──────────────────────────────────────────────────────
  app.post('/api/leads/bulk-import', authRequired, requirePermission('leads:write'), async (req, res) => {
    const { leads = [], target = 'crm', pushToAutopilot = false, defaultProduct = 'prime' } = req.body || {};
    if (!Array.isArray(leads) || !leads.length) return res.status(400).json({ error: 'leads array required' });

    const shouldPushAutopilot = pushToAutopilot === true || target === 'autopilot' || target === 'both';
    const ts = now();
    const insertStmt = db.prepare(`
      INSERT INTO leads (
        id, name, email, phone, company, title, source, stage, score, value,
        status, assigned_to, notes, tags, temperature, preferred_channel,
        city, locality, speciality, product_interest, workflow_stage,
        clinic_name, doctor_name, owner_name, owner_phone, reception_phone,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        'open', 'Unassigned', ?, '[]', '', '',
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?
      )
    `);

    let imported = 0;
    const insertedLeads = [];
    const tx = db.transaction(() => {
      for (const lead of leads) {
        const leadName = lead.name || lead.doctorName || lead.doctor_name || ('Dr. ' + (lead.company || lead.clinicName || 'Doctor'));
        if (!leadName && !lead.phone) continue;
        const clinicName = lead.company || lead.clinicName || lead.clinic_name || '';
        const docName = lead.doctorName || lead.doctor_name || leadName;
        const phone = lead.phone || '';
        const city = lead.city || 'Bangalore';
        const locality = lead.locality || '';
        const speciality = lead.speciality || lead.title || 'General Physician';
        const productInterest = lead.product_interest || lead.productInterest || defaultProduct || 'prime';
        const workflowStage = shouldPushAutopilot ? 'autopilot' : (lead.workflow_stage || lead.workflowStage || 'manual');
        const id = nanoid();

        insertStmt.run(
          id, leadName, lead.email || '', phone, clinicName, speciality,
          lead.source || 'import', lead.stage || 'new', Number(lead.score || 0), Number(lead.value || 0),
          lead.notes || '',
          city, locality, speciality, productInterest, workflowStage,
          clinicName, docName, docName, phone, phone,
          ts, ts
        );
        insertedLeads.push({
          id,
          name: leadName,
          company: clinicName,
          phone,
          email: lead.email || '',
          city,
          locality,
          speciality,
          product: productInterest,
        });
        imported++;
      }
    });
    tx();

    let enqueued = 0;
    if (shouldPushAutopilot && insertedLeads.length > 0) {
      try {
        const { autopilotService } = await import('../services/autopilotService.js');
        for (const item of insertedLeads) {
          if (!item.phone) continue;
          try {
            await autopilotService.enqueueLead({
              leadId: item.id,
              clinicName: item.company || item.name,
              city: item.city,
              locality: item.locality,
              speciality: item.speciality,
              phone: item.phone,
              email: item.email,
              ownerName: item.name,
              product: item.product,
              autoStart: true,
            });
            enqueued++;
          } catch (enqueueErr) {
            console.warn(`[BulkImportAutopilot] Error enqueuing lead ${item.id}:`, enqueueErr.message);
          }
        }
      } catch (svcErr) {
        console.warn('[BulkImportAutopilot] Could not import autopilotService:', svcErr.message);
      }
    }

    logEvent({ type: 'info', category: 'leads', message: `Bulk imported ${imported} leads (enqueued ${enqueued} to autopilot)`, userId: req.user.id });
    await persistDurableDbNow();
    res.json({ ok: true, imported, enqueued, total: leads.length });
  });

  // ── Lead activities ────────────────────────────────────────────────────────
  app.post('/api/leads/:id/activities', authRequired, requirePermission('leads:write'), async (req, res) => {
    const lead = db.prepare('SELECT id FROM leads WHERE id = ?').get(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    const { type = 'note', title, detail = '', channel = '' } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title is required' });
    const ts = now();
    const id = nanoid();
    db.prepare('INSERT INTO activities (id, lead_id, type, channel, title, detail, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(id, lead.id, type, channel, title, detail, 'completed', ts);
    if (req.body.nextAction) {
      db.prepare('UPDATE leads SET next_action=?, updated_at=? WHERE id=?').run(req.body.nextAction, ts, lead.id);
    }
    await persistDurableDbNow();
    res.status(201).json({ id, leadId: lead.id, type, title, detail, createdAt: ts });
  });

  // ── Batch Actions (Push to Autopilot / Assign Manual / Stage Change) ───────
  app.post('/api/leads/batch-action', authRequired, requirePermission('leads:write'), async (req, res) => {
    const { leadIds = [], action, product = 'prime', stage = 'contacted' } = req.body || {};
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ error: 'leadIds array required' });
    }

    const { autopilotService } = await import('../services/autopilotService.js');
    const ts = now();
    let processed = 0;

    if (action === 'push_autopilot') {
      for (const id of leadIds) {
        const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
        if (!lead || !lead.phone) continue;
        try {
          await autopilotService.enqueueLead({
            leadId: lead.id,
            clinicName: lead.company || lead.clinic_name || lead.name,
            city: lead.city || '',
            locality: lead.locality || '',
            speciality: lead.speciality || lead.title || '',
            phone: lead.phone,
            email: lead.email,
            ownerName: lead.owner_name || lead.doctor_name || lead.name,
            marketingName: lead.marketing_name || '',
            product,
            autoStart: true,
          });
          db.prepare("UPDATE leads SET workflow_stage = 'autopilot', product_interest = ?, updated_at = ? WHERE id = ?").run(product, ts, lead.id);
          processed++;
        } catch (e) {
          console.warn(`[BatchAutopilot] Error on lead ${id}:`, e.message);
        }
      }
    } else if (action === 'assign_manual') {
      const stmt = db.prepare("UPDATE leads SET workflow_stage = 'manual', updated_at = ? WHERE id = ?");
      for (const id of leadIds) { stmt.run(ts, id); processed++; }
    } else if (action === 'change_stage') {
      const stmt = db.prepare("UPDATE leads SET stage = ?, updated_at = ? WHERE id = ?");
      for (const id of leadIds) { stmt.run(stage, ts, id); processed++; }
    } else if (action === 'delete') {
      const stmt = db.prepare('DELETE FROM leads WHERE id = ?');
      for (const id of leadIds) { stmt.run(id); processed++; }
    } else {
      return res.status(400).json({ error: `Unknown batch action: ${action}` });
    }

    recordAuditLog({
      req,
      action: `leads.batch_${action}`,
      entityType: 'leads',
      details: `Batch action "${action}" on ${processed} leads [Product: ${product}]`,
    });

    await persistDurableDbNow();
    res.json({ ok: true, action, processed, total: leadIds.length });
  });
}
