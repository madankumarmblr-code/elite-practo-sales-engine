import { nanoid } from 'nanoid';
import db from '../db/db.js';
import { authRequired, requirePermission } from '../auth/middleware.js';
import { reachInventoryService } from '../services/reachInventoryService.js';
import { logEvent } from '../services/logger.js';
import { recordAuditLog } from '../services/auditLogger.js';

const now = () => new Date().toISOString();

export function registerProposalRoutes(app) {
  // ── Inventory Cascading Lookups ───────────────────────────────────────────
  app.get('/api/inventory/cities', authRequired, requirePermission('leads:read'), (_req, res) => {
    res.json(reachInventoryService.getCities());
  });

  app.get('/api/inventory/zones', authRequired, requirePermission('leads:read'), (req, res) => {
    const { city } = req.query;
    res.json(reachInventoryService.getZones(city));
  });

  app.get('/api/inventory/specialities', authRequired, requirePermission('leads:read'), (req, res) => {
    const { city, zone } = req.query;
    res.json(reachInventoryService.getSpecialities(city, zone));
  });

  app.get('/api/inventory/check', authRequired, requirePermission('leads:read'), (req, res) => {
    const { city, zone, speciality } = req.query;
    const slots = reachInventoryService.checkInventory({ city, zone, speciality });
    res.json(slots);
  });

  app.get('/api/inventory/search', authRequired, requirePermission('leads:read'), (req, res) => {
    const { city, zone, speciality, position, availableOnly, limit } = req.query;
    const results = reachInventoryService.searchInventory({
      city,
      zone,
      speciality,
      position,
      availableOnly: availableOnly === 'true' || availableOnly === '1',
      limit: Number(limit) || 100,
    });
    res.json(results);
  });

  app.get('/api/inventory/stats', authRequired, requirePermission('leads:read'), (_req, res) => {
    res.json(reachInventoryService.getStats());
  });

  app.get('/api/inventory/newly-opened', authRequired, requirePermission('leads:read'), (req, res) => {
    const { city, zone, speciality, limit } = req.query;
    const newlyOpened = reachInventoryService.getNewlyOpenedSlots({
      city,
      zone,
      speciality,
      limit: Number(limit) || 50,
    });
    res.json(newlyOpened);
  });

  // ── Commercial Proposals ──────────────────────────────────────────────────
  app.post('/api/proposals', authRequired, requirePermission('pitch:write'), async (req, res) => {
    const {
      leadId = null,
      clientName = 'Doctor',
      clinicName = 'Clinic',
      city = 'Bangalore',
      docType = 'proposal',
      termMonths = 3,
      primeConfig = {},
      reachCampaigns = [],
      discountType = 'amount',
      discountVal = 0,
      subtotal = 0,
      gstAmount = 0,
      netAmount = 0,
      senderName = req.user.name || 'Practo Representative',
      senderPhone = '+918071579481',
    } = req.body || {};

    const id = `prop_${nanoid(10)}`;
    const ts = now();

    db.prepare(`
      INSERT INTO commercial_proposals (
        id, lead_id, client_name, clinic_name, city, doc_type, term_months,
        prime_config, reach_campaigns, discount_type, discount_val, subtotal,
        gst_amount, net_amount, sender_name, sender_phone, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, leadId, clientName, clinicName, city, docType, Number(termMonths) || 3,
      JSON.stringify(primeConfig), JSON.stringify(reachCampaigns), discountType,
      Number(discountVal) || 0, Number(subtotal) || 0, Number(gstAmount) || 0,
      Number(netAmount) || 0, senderName, senderPhone, ts
    );

    recordAuditLog({
      req,
      action: 'proposal.create',
      entityType: 'commercial_proposal',
      entityId: id,
      details: `Created ${docType.toUpperCase()} for ${clinicName} (₹${netAmount})`,
    });

    logEvent({
      type: 'info',
      category: 'proposals',
      message: `Commercial Proposal generated for ${clinicName}`,
      meta: { id, clinicName, netAmount },
    });

    res.status(201).json({ id, ok: true, createdAt: ts });
  });

  app.get('/api/proposals', authRequired, requirePermission('pitch:read'), (_req, res) => {
    const rows = db.prepare('SELECT * FROM commercial_proposals ORDER BY created_at DESC LIMIT 50').all();
    res.json(rows.map((r) => ({
      ...r,
      prime_config: (() => { try { return JSON.parse(r.prime_config); } catch { return {}; } })(),
      reach_campaigns: (() => { try { return JSON.parse(r.reach_campaigns); } catch { return []; } })(),
    })));
  });

  // ── WhatsApp Proposal Summary Generator ───────────────────────────────────
  app.post('/api/proposals/whatsapp-summary', authRequired, requirePermission('pitch:read'), (req, res) => {
    const { clientName, clinicName, items = [], netAmount, senderName = 'Practo Team' } = req.body || {};

    const itemsText = items.map((it) => `• ${it.name}: ₹${Number(it.amount).toLocaleString('en-IN')}`).join('\n');
    const message = `*Practo Official Commercial Proposal*\n\nDear ${clientName || 'Doctor'},\n\nHere is the customized commercial proposal summary for *${clinicName || 'your clinic'}*:\n\n*Services & Campaigns Included:*\n${itemsText || '• Practo Growth Partnership'}\n\n*Final Total Investment (incl. 18% GST):* ₹${Number(netAmount || 0).toLocaleString('en-IN')}\n\nThis commercial quote is valid for 15 days from issue. Please let me know if you would like to proceed with clinic verification.\n\nBest Regards,\n*${senderName}*\nPracto Enterprise Team\n📞 +91 80715 79481`;

    const waLink = `https://wa.me/?text=${encodeURIComponent(message)}`;
    res.json({ message, waLink });
  });
}
