import express from 'express';
import { store } from '../db/store.js';
import { analyzePractoLead } from '../services/aiPitchEngine.js';
import { checkPermission, PERMISSIONS, rbacMiddleware } from '../services/rbac.js';

export const leadsRouter = express.Router();

function maskLeadPII(lead) {
  return {
    ...lead,
    phone: lead.phone ? lead.phone.replace(/(\+?\d{2,4}\s?)(\d{2})\d{4}(\d{2})/, '$1$2****$3') : '***-***-****',
    email: lead.email ? lead.email.replace(/(.{2})(.*)(@.*)/, '$1****$3') : '***@***.com',
  };
}

leadsRouter.get('/', (req, res) => {
  const role = req.headers['x-user-role'] || 'superadmin';
  const canViewUnmasked = checkPermission(role, PERMISSIONS.VIEW_UNMASKED_PII);

  const { search, specialty, city, zone, locality, status, minScore } = req.query;
  let leads = store.getLeads();

  // Multi-field Keyword Search (Doctor name, Clinic, Specialty, City, Zone, Locality, EHR, Tags, Notes)
  if (search && search.trim() !== '') {
    const keywords = search.toLowerCase().trim().split(/\s+/);
    leads = leads.filter((l) => {
      const combinedText = `
        ${l.name || ''} 
        ${l.organization || ''} 
        ${l.specialty || ''} 
        ${l.city || ''} 
        ${l.zone || ''} 
        ${l.locality || ''} 
        ${l.assignedRep || ''} 
        ${(l.tags || []).join(' ')} 
        ${l.notes || ''} 
        ${l.customFields?.currentEHR || ''}
      `.toLowerCase();
      return keywords.every((kw) => combinedText.includes(kw));
    });
  }

  // City Filter
  if (city && city !== 'All') {
    leads = leads.filter((l) => l.city && l.city.toLowerCase() === city.toLowerCase());
  }

  // Zone Filter
  if (zone && zone !== 'All') {
    leads = leads.filter((l) => l.zone && l.zone.toLowerCase() === zone.toLowerCase());
  }

  // Locality Filter
  if (locality && locality !== 'All') {
    leads = leads.filter((l) => l.locality && l.locality.toLowerCase() === locality.toLowerCase());
  }

  // Specialty Filter
  if (specialty && specialty !== 'All' && specialty !== 'All Specialties') {
    leads = leads.filter((l) => l.specialty && l.specialty.toLowerCase().includes(specialty.toLowerCase().split(' ')[0]));
  }

  // Stage / Status Filter
  if (status && status !== 'All') {
    leads = leads.filter((l) => l.status === status || l.stage === status);
  }

  // Min AI Score Filter
  if (minScore) {
    const min = parseInt(minScore, 10);
    leads = leads.filter((l) => (l.score || 0) >= min);
  }

  // Check PII masking
  if (!canViewUnmasked) {
    leads = leads.map(maskLeadPII);
  }

  res.json({
    total: leads.length,
    leads,
  });
});

leadsRouter.get('/:id', (req, res) => {
  const role = req.headers['x-user-role'] || 'superadmin';
  const canViewUnmasked = checkPermission(role, PERMISSIONS.VIEW_UNMASKED_PII);

  const lead = store.getLeadById(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const analysis = analyzePractoLead(lead);
  const result = {
    ...lead,
    aiAnalysis: analysis,
  };

  res.json(canViewUnmasked ? result : maskLeadPII(result));
});

leadsRouter.post('/', rbacMiddleware(PERMISSIONS.EDIT_LEADS), (req, res) => {
  const { name, organization, specialty, city, zone, locality, email, phone, patientVolumeMonthly, assignedRep } = req.body;
  if (!name || !organization) {
    return res.status(400).json({ error: 'Doctor Name and Clinic Organization are required' });
  }

  const newLead = {
    id: `lead-${Date.now()}`,
    name,
    organization,
    specialty: specialty || 'Cardiology',
    category: req.body.category || 'Clinic',
    city: city || 'Mumbai',
    zone: zone || 'Powai',
    locality: locality || 'Main Clinic Hub',
    state: req.body.state || 'State',
    email: email || '',
    phone: phone || '',
    website: req.body.website || '',
    patientVolumeMonthly: parseInt(patientVolumeMonthly || '1200', 10),
    annualRevenueEstimate: parseInt(patientVolumeMonthly || '1200', 10) * 800 * 12,
    assignedRep: assignedRep || 'Priya Sharma',
    status: 'New Lead',
    stage: 'New Lead',
    score: 88,
    scoreBreakdown: { fit: 90, intent: 85, engagement: 88 },
    tags: ['Inbound Registered', specialty || 'General', city || 'Metro'],
    lastContacted: new Date().toISOString(),
    notes: req.body.notes || 'Registered lead with geographic mapping.',
    customFields: req.body.customFields || { currentEHR: 'Practo Pro' },
    timeline: [
      {
        id: `act-${Date.now()}`,
        type: 'lead_created',
        title: 'Practo Lead Created',
        description: `Created in ${locality || zone || city} by ${req.headers['x-user-name'] || 'User'}.`,
        timestamp: new Date().toISOString(),
        user: req.headers['x-user-name'] || 'User',
      },
    ],
    createdAt: new Date().toISOString(),
  };

  store.createLead(newLead);
  store.logAudit({
    action: 'LEAD_CREATED',
    entity: `Lead: ${newLead.name} (${newLead.organization} - ${newLead.city}/${newLead.zone})`,
    user: req.headers['x-user-name'] || 'User',
    ip: req.ip || '127.0.0.1',
    category: 'LEADS',
  });

  res.status(201).json(newLead);
});

leadsRouter.put('/:id', rbacMiddleware(PERMISSIONS.EDIT_LEADS), (req, res) => {
  const updated = store.updateLead(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Lead not found' });

  store.logAudit({
    action: 'LEAD_UPDATED',
    entity: `Lead: ${updated.name} (ID: ${updated.id})`,
    user: req.headers['x-user-name'] || 'User',
    ip: req.ip || '127.0.0.1',
    category: 'LEADS',
  });

  res.json(updated);
});

leadsRouter.delete('/:id', rbacMiddleware(PERMISSIONS.DELETE_LEADS), (req, res) => {
  const lead = store.getLeadById(req.params.id);
  const deleted = store.deleteLead(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Lead not found' });

  store.logAudit({
    action: 'LEAD_DELETED',
    entity: `Deleted Lead: ${lead?.name} (${lead?.organization})`,
    user: req.headers['x-user-name'] || 'SuperAdmin',
    ip: req.ip || '127.0.0.1',
    category: 'ADMIN',
  });

  res.json({ message: 'Lead deleted successfully' });
});

// GDPR Right to Be Forgotten / Anonymize PII
leadsRouter.post('/:id/anonymize', rbacMiddleware(PERMISSIONS.MANAGE_PRIVACY), (req, res) => {
  const lead = store.getLeadById(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  const anonymized = store.updateLead(req.params.id, {
    name: 'Anonymized Practitioner',
    email: `anonymized-${lead.id}@gdpr-erased.invalid`,
    phone: '+91 00000 00000',
    website: 'https://anonymized.invalid',
    notes: '[PII Data Permanently Anonymized per GDPR/DPDP Request]',
    anonymizedAt: new Date().toISOString(),
  });

  store.logAudit({
    action: 'PRIVACY_DATA_ANONYMIZED',
    entity: `Lead ${lead.id} anonymized for GDPR/DPDP Right to Be Forgotten`,
    user: req.headers['x-user-name'] || 'Auditor',
    ip: req.ip || '127.0.0.1',
    category: 'COMPLIANCE',
  });

  res.json({ message: 'Lead PII successfully anonymized', lead: anonymized });
});

// Export Leads to CSV with City, Zone, Locality, Specialty
leadsRouter.get('/export/csv', rbacMiddleware(PERMISSIONS.EXPORT_LEADS), (req, res) => {
  const leads = store.getLeads();
  const headers = ['ID', 'Name', 'Organization', 'Specialty', 'City', 'Zone', 'Locality', 'Phone', 'Email', 'Status', 'Score', 'AssignedRep'];
  const rows = leads.map((l) => [
    l.id,
    `"${(l.name || '').replace(/"/g, '""')}"`,
    `"${(l.organization || '').replace(/"/g, '""')}"`,
    `"${(l.specialty || '').replace(/"/g, '""')}"`,
    `"${(l.city || '').replace(/"/g, '""')}"`,
    `"${(l.zone || '').replace(/"/g, '""')}"`,
    `"${(l.locality || '').replace(/"/g, '""')}"`,
    `"${l.phone || ''}"`,
    `"${l.email || ''}"`,
    `"${l.status || l.stage || ''}"`,
    l.score || 0,
    `"${l.assignedRep || ''}"`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  store.logAudit({
    action: 'DATA_EXPORT_CSV',
    entity: `Exported ${leads.length} leads to CSV`,
    user: req.headers['x-user-name'] || 'User',
    ip: req.ip || '127.0.0.1',
    category: 'SECURITY',
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="practo_leads_export.csv"');
  res.send(csv);
});
