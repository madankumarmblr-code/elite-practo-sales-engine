import fs from 'fs';
import path from 'path';
import { initialSeed } from './seedData.js';
import { config } from '../config.js';

class Store {
  constructor() {
    this.data = JSON.parse(JSON.stringify(initialSeed));
    this.subscribers = new Set();
    this.initPersistence();
  }

  initPersistence() {
    try {
      const dir = path.dirname(config.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(config.dbPath)) {
        const raw = fs.readFileSync(config.dbPath, 'utf8');
        const parsed = JSON.parse(raw);
        // Merge with initial seed to ensure new schema fields exist
        this.data = {
          ...this.data,
          ...parsed,
          leads: parsed.leads || this.data.leads,
          deals: parsed.deals || this.data.deals,
          templates: parsed.templates || this.data.templates,
          workflows: parsed.workflows || this.data.workflows,
          team: parsed.team || this.data.team,
          integrations: parsed.integrations || this.data.integrations,
          auditLogs: parsed.auditLogs || this.data.auditLogs,
          reports: parsed.reports || this.data.reports || [],
          aiPilotJobs: parsed.aiPilotJobs || this.data.aiPilotJobs || [],
          privacySettings: parsed.privacySettings || this.data.privacySettings || {},
        };
      } else {
        this.persist();
      }
    } catch (err) {
      console.warn('Store persistence fallback to in-memory:', err.message);
    }
  }

  persist() {
    try {
      fs.writeFileSync(config.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error persisting database:', err.message);
    }
  }

  subscribe(listener) {
    this.subscribers.add(listener);
    return () => this.subscribers.delete(listener);
  }

  emit(event, payload) {
    this.subscribers.forEach((listener) => {
      try {
        listener(event, payload);
      } catch (err) {
        console.error('Subscriber error:', err);
      }
    });
  }

  // Leads
  getLeads(filterFn) {
    if (!filterFn) return this.data.leads;
    return this.data.leads.filter(filterFn);
  }

  getLeadById(id) {
    return this.data.leads.find((l) => l.id === id);
  }

  createLead(leadData) {
    this.data.leads.unshift(leadData);
    this.persist();
    this.emit('lead:created', leadData);
    return leadData;
  }

  updateLead(id, updates) {
    const index = this.data.leads.findIndex((l) => l.id === id);
    if (index === -1) return null;
    this.data.leads[index] = { ...this.data.leads[index], ...updates, updatedAt: new Date().toISOString() };
    this.persist();
    this.emit('lead:updated', this.data.leads[index]);
    return this.data.leads[index];
  }

  deleteLead(id) {
    const index = this.data.leads.findIndex((l) => l.id === id);
    if (index === -1) return false;
    const deleted = this.data.leads.splice(index, 1)[0];
    this.persist();
    this.emit('lead:deleted', deleted);
    return true;
  }

  // Deals
  getDeals(filterFn) {
    if (!filterFn) return this.data.deals;
    return this.data.deals.filter(filterFn);
  }

  getDealById(id) {
    return this.data.deals.find((d) => d.id === id);
  }

  createDeal(dealData) {
    this.data.deals.unshift(dealData);
    this.persist();
    this.emit('deal:created', dealData);
    return dealData;
  }

  updateDeal(id, updates) {
    const index = this.data.deals.findIndex((d) => d.id === id);
    if (index === -1) return null;
    this.data.deals[index] = { ...this.data.deals[index], ...updates, updatedAt: new Date().toISOString() };
    this.persist();
    this.emit('deal:updated', this.data.deals[index]);
    return this.data.deals[index];
  }

  deleteDeal(id) {
    const index = this.data.deals.findIndex((d) => d.id === id);
    if (index === -1) return false;
    const deleted = this.data.deals.splice(index, 1)[0];
    this.persist();
    this.emit('deal:deleted', deleted);
    return true;
  }

  // Reports
  getReports() {
    return this.data.reports || [];
  }

  createReport(report) {
    if (!this.data.reports) this.data.reports = [];
    this.data.reports.unshift(report);
    this.persist();
    return report;
  }

  // AI Pilot Jobs
  getAiPilotJobs() {
    return this.data.aiPilotJobs || [];
  }

  createAiPilotJob(job) {
    if (!this.data.aiPilotJobs) this.data.aiPilotJobs = [];
    this.data.aiPilotJobs.unshift(job);
    this.persist();
    this.emit('aipilot:job_started', job);
    return job;
  }

  // Audit Logs
  getAuditLogs(limit = 100) {
    return (this.data.auditLogs || []).slice(0, limit);
  }

  logAudit(entry) {
    if (!this.data.auditLogs) this.data.auditLogs = [];
    const record = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    };
    this.data.auditLogs.unshift(record);
    if (this.data.auditLogs.length > 500) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 500);
    }
    this.persist();
    this.emit('audit:logged', record);
    return record;
  }

  // Reset to initial seed
  resetData() {
    this.data = JSON.parse(JSON.stringify(initialSeed));
    this.persist();
    this.emit('store:reset', {});
    return true;
  }
}

export const store = new Store();
