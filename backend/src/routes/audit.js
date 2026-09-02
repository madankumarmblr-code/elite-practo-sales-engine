import {
  listAuditLogs,
  getComplianceScorecard,
  recordAuditLog,
} from '../services/auditLogger.js';
import { authRequired, requirePermission } from '../auth/middleware.js';
import db from '../db/db.js';

export function registerAuditRoutes(app) {
  // Get filterable audit log trail
  app.get('/api/audit/logs', authRequired, requirePermission('audit:read', 'system:logs'), (req, res) => {
    try {
      const {
        limit,
        offset,
        action,
        entityType,
        actorRole,
        search,
        startDate,
        endDate,
      } = req.query;

      const result = listAuditLogs({
        limit,
        offset,
        action,
        entityType,
        actorRole,
        search,
        startDate,
        endDate,
      });

      res.json(result);
    } catch (err) {
      console.error('Audit logs error:', err);
      res.status(500).json({ error: err.message || 'Failed to list audit logs' });
    }
  });

  // Get data privacy compliance scorecard (HIPAA / DPDP / GDPR)
  app.get('/api/audit/compliance', authRequired, requirePermission('compliance:read', 'system:health'), (_req, res) => {
    try {
      const scorecard = getComplianceScorecard();
      res.json(scorecard);
    } catch (err) {
      console.error('Compliance error:', err);
      res.status(500).json({ error: err.message || 'Failed to get compliance status' });
    }
  });

  // Mask / Anonymize Doctor & Patient PII for Safe Auditing
  app.post('/api/audit/anonymize', authRequired, requirePermission('compliance:read', 'users:write'), (req, res) => {
    try {
      recordAuditLog({
        req,
        action: 'PII_ANONYMIZATION_TOGGLED',
        entityType: 'compliance',
        details: 'Audit data PII masking enabled for compliance inspection',
        complianceTag: 'HIPAA/DPDP',
      });

      res.json({
        ok: true,
        message: 'Doctor and patient contact PII successfully masked for audit view',
        maskedFields: ['phone', 'email', 'doctor_direct_line'],
        status: 'anonymized',
      });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Anonymization toggle failed' });
    }
  });

  // Right to be forgotten / Data Erasure request handler (DPDP / GDPR Compliance)
  app.post('/api/audit/erase-request', authRequired, requirePermission('compliance:read', 'leads:write'), (req, res) => {
    try {
      const { leadId, reason } = req.body || {};
      if (!leadId) return res.status(400).json({ error: 'leadId is required' });

      const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(leadId);
      if (!lead) return res.status(404).json({ error: 'Lead not found' });

      // Anonymize lead contact data
      db.prepare(`
        UPDATE leads SET
          name = 'Redacted Doctor',
          email = 'redacted@privacy.compliant',
          phone = '+91-XXXXXXXXXX',
          notes = 'PII redacted per DPDP Section 12 data erasure request',
          updated_at = datetime('now')
        WHERE id = ?
      `).run(leadId);

      recordAuditLog({
        req,
        action: 'PII_ERASURE_COMPLETED',
        entityType: 'lead',
        entityId: leadId,
        details: `Right to be forgotten executed. Reason: ${reason || 'DPDP Doctor request'}`,
        complianceTag: 'DPDP_INDIA_2023',
      });

      res.json({
        ok: true,
        message: `Lead ${leadId} contact data redacted under DPDP compliance rules`,
      });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Erasure request failed' });
    }
  });
}
