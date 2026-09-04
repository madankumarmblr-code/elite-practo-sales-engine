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
    const { stage, status, search, limit = 100, offset = 0, assignedTo } = req.query;
    let query = 'SELECT * FROM leads WHERE 1=1';
    const params = [];

    if (stage) { query += ' AND stage = ?'; params.push(stage); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (assignedTo) { query += ' AND lower(assigned_to) = ?'; params.push(String(assignedTo).toLowerCase()); }
    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR company LIKE ?)';
      const t = `%${search}%`;
      params.push(t, t, t, t);
    }

    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const total = db.prepare(countQuery).get(...params)?.total || 0;

    query += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(Number(limit), Number(offset));

    const leads = db.prepare(query).all(...params).map(publicLead);
    res.json({ leads, total, limit: Number(limit), offset: Number(offset) });
  });

  // ── CSV Export (Declared BEFORE :id to avoid route collision) ─────────────
  app.get('/api/leads/export', authRequired, requirePermission('leads:read'), (req, res) => {
    const { stage, workflowStage, productInterest } = req.query;
    let query = 'SELECT * FROM leads WHERE 1=1';
    const params = [];
    if (stage) { query += ' AND stage = ?'; params.push(stage); }
    if (workflowStage) { query += ' AND workflow_stage = ?'; params.push(workflowStage); }
    if (productInterest) { query += ' AND product_interest = ?'; params.push(productInterest); }
    query += ' ORDER BY created_at DESC';

    const rows = db.prepare(query).all(...params);

    const headers = ['ID', 'Name', 'Company', 'Phone', 'Email', 'City', 'Locality', 'Speciality', 'Practo Status', 'Stage', 'Score', 'Product Interest', 'Workflow Stage', 'Created At'];
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
        r.stage,
        r.score || 0,
        r.product_interest || 'prime',
        r.workflow_stage || 'manual',
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
    const { name, email, phone, company, title, source = 'manual', stage = 'new', score = 0, value = 0, notes = '', assignedTo, tags, temperature = '', preferredChannel = '' } = req.body || {};
    if (!name) return res.status(400).json({ error: 'Lead name is required' });

    const id = nanoid();
    const ts = now();
    db.prepare(`
      INSERT INTO leads (id, name, email, phone, company, title, source, stage, score, value, status, assigned_to, notes, tags, temperature, preferred_channel, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, email || '', phone || '', company || '', title || '', source, stage, Number(score), Number(value), assignedTo || 'Unassigned', notes, JSON.stringify(Array.isArray(tags) ? tags : []), temperature, preferredChannel, ts, ts);

    recordAuditLog({ req, action: 'lead.create', entityType: 'lead', entityId: id, details: `Created lead: ${name}`, newState: { name, email, phone, company, source, stage } });
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
      UPDATE leads SET name=?, email=?, phone=?, company=?, title=?, source=?, stage=?, score=?, value=?, status=?, assigned_to=?, notes=?, tags=?, temperature=?, preferred_channel=?, next_action=?, updated_at=? WHERE id=?
    `).run(
      b.name ?? existing.name, b.email ?? existing.email, b.phone ?? existing.phone,
      b.company ?? existing.company, b.title ?? existing.title, b.source ?? existing.source,
      b.stage ?? existing.stage, b.score != null ? Number(b.score) : existing.score,
      b.value != null ? Number(b.value) : existing.value,
      b.status ?? existing.status, b.assignedTo ?? existing.assigned_to,
      b.notes ?? existing.notes,
      Array.isArray(b.tags) ? JSON.stringify(b.tags) : existing.tags,
      b.temperature ?? existing.temperature,
      b.preferredChannel ?? existing.preferred_channel,
      b.nextAction ?? existing.next_action,
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
    const { leads = [] } = req.body || {};
    if (!Array.isArray(leads) || !leads.length) return res.status(400).json({ error: 'leads array required' });

    const ts = now();
    const insertStmt = db.prepare(`
      INSERT INTO leads (id, name, email, phone, company, title, source, stage, score, value, status, assigned_to, notes, tags, temperature, preferred_channel, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', 'Unassigned', ?, '[]', '', '', ?, ?)
    `);

    let imported = 0;
    const tx = db.transaction(() => {
      for (const lead of leads) {
        if (!lead.name) continue;
        insertStmt.run(nanoid(), lead.name, lead.email || '', lead.phone || '', lead.company || '', lead.title || '', lead.source || 'import', lead.stage || 'new', Number(lead.score || 0), Number(lead.value || 0), lead.notes || '', ts, ts);
        imported++;
      }
    });
    tx();

    logEvent({ type: 'info', category: 'leads', message: `Bulk imported ${imported} leads`, userId: req.user.id });
    await persistDurableDbNow();
    res.json({ ok: true, imported, total: leads.length });
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
            clinicName: lead.company || lead.name,
            city: lead.city || '',
            locality: lead.locality || '',
            speciality: lead.speciality || lead.title || '',
            phone: lead.phone,
            email: lead.email,
            ownerName: lead.owner_name || lead.name,
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

    res.json({ ok: true, action, processed, total: leadIds.length });
  });
}
