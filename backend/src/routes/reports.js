import {
  getCrmAnalytics,
  executeReportQuery,
  saveCustomReport,
  listSavedReports,
} from '../services/customReports.js';
import { authRequired, requirePermission } from '../auth/middleware.js';
import { recordAuditLog } from '../services/auditLogger.js';

export function registerReportRoutes(app) {
  // Real-time CRM Analytics Endpoint for Command Center
  app.get('/api/reports/analytics', authRequired, requirePermission('dashboard:read', 'reports:read'), (_req, res) => {
    try {
      const data = getCrmAnalytics();
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      res.json(data);
    } catch (err) {
      console.error('Analytics error:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch analytics' });
    }
  });

  // Execute Dynamic Custom Report Query
  app.post('/api/reports/query', authRequired, requirePermission('reports:read'), (req, res) => {
    try {
      const filters = req.body || {};
      const result = executeReportQuery(filters);
      res.json(result);
    } catch (err) {
      console.error('Report query error:', err);
      res.status(500).json({ error: err.message || 'Failed to execute query' });
    }
  });

  // Save Custom Report Template
  app.post('/api/reports/save', authRequired, requirePermission('reports:write'), (req, res) => {
    try {
      const { name, description, filters, metrics, chartType } = req.body || {};
      if (!name) return res.status(400).json({ error: 'name is required' });

      const report = saveCustomReport({
        name,
        description,
        userId: req.user.id,
        filters,
        metrics,
        chartType,
      });

      recordAuditLog({
        req,
        action: 'REPORT_SAVED',
        entityType: 'report',
        entityId: report.id,
        details: `Saved custom report template "${name}"`,
      });

      res.status(201).json({ ok: true, report, message: 'Custom report template saved' });
    } catch (err) {
      console.error('Save report error:', err);
      res.status(500).json({ error: err.message || 'Failed to save report' });
    }
  });

  // List Saved Custom Report Templates
  app.get('/api/reports/saved', authRequired, requirePermission('reports:read'), (_req, res) => {
    try {
      const reports = listSavedReports();
      res.json({ reports, count: reports.length });
    } catch (err) {
      res.status(500).json({ error: err.message || 'Failed to list saved reports' });
    }
  });

  // Dynamic Export Endpoint (CSV or JSON)
  app.post('/api/reports/export', authRequired, requirePermission('export:read', 'reports:read'), (req, res) => {
    try {
      const { filters, format = 'csv' } = req.body || {};
      const queryResult = executeReportQuery(filters || {});

      // Flatten all leads from groups
      const allLeads = [];
      queryResult.groups.forEach((g) => {
        (g.leads || []).forEach((l) => {
          allLeads.push({
            id: l.id,
            clinic_name: l.company || l.name,
            contact_person: l.name,
            stage: l.stage,
            score: l.score,
            deal_value: l.value,
            assigned_to: l.assignedTo,
            created_at: l.createdAt,
          });
        });
      });

      recordAuditLog({
        req,
        action: 'DATA_EXPORTED',
        entityType: 'report',
        details: `Exported ${allLeads.length} report rows in ${format.toUpperCase()} format`,
        complianceTag: 'HIPAA/DPDP',
      });

      if (format === 'json') {
        return res.json({ leads: allLeads, total: allLeads.length });
      }

      // Format as CSV
      if (!allLeads.length) {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        return res.send('id,clinic_name,contact_person,stage,score,deal_value,assigned_to,created_at\n');
      }

      const headers = Object.keys(allLeads[0]);
      const escape = (val) => {
        const str = val == null ? '' : String(val);
        if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
        return str;
      };

      const csvContent = [
        headers.join(','),
        ...allLeads.map((row) => headers.map((h) => escape(row[h])).join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="practo_custom_report_${Date.now()}.csv"`);
      res.send(csvContent);
    } catch (err) {
      console.error('Export error:', err);
      res.status(500).json({ error: err.message || 'Export failed' });
    }
  });
}
