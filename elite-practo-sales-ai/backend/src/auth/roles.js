/**
 * Enterprise Roles and Granular Permission Matrix for Elite Practo Sales AI.
 */
export const ALL_PERMISSIONS = [
  // CRM & Leads
  { id: 'leads:read', label: 'View CRM Leads', group: 'CRM & Leads', desc: 'Browse and search doctor and clinic records' },
  { id: 'leads:write', label: 'Create & Edit Leads', group: 'CRM & Leads', desc: 'Add new leads, update stages, edit notes and clinic info' },
  { id: 'leads:delete', label: 'Delete Leads', group: 'CRM & Leads', desc: 'Remove individual or bulk leads from CRM' },
  { id: 'export:read', label: 'Export Leads (CSV/JSON)', group: 'CRM & Leads', desc: 'Download filtered CRM leads to CSV or JSON files' },
  { id: 'leads:import', label: 'Custom CSV Upload & Push', group: 'CRM & Leads', desc: 'Import external lead lists, map columns and selectively push' },

  // Lead Scraper & Discovery
  { id: 'scraper:read', label: 'View Scraped Clinics', group: 'Discovery & Scraper', desc: 'Inspect clinics scraped from Practo and Google Maps' },
  { id: 'scraper:run', label: 'Execute Lead Scraper', group: 'Discovery & Scraper', desc: 'Run live web search scrapes for doctors across Indian cities' },
  { id: 'scraper:assign', label: 'Assign Clinics to CRM', group: 'Discovery & Scraper', desc: 'Push scraped healthcare providers directly into sales pipeline' },

  // Voice AI & Telephony
  { id: 'voice:call', label: 'Trigger AI Voice Dialing', group: 'Voice AI Studio', desc: 'Initiate outbound voice calls via Sarvam / Indus Samvaad bots' },
  { id: 'voice:read', label: 'View Call Logs & Transcripts', group: 'Voice AI Studio', desc: 'Inspect call records, dual sentiment scores, and doctor objections' },
  { id: 'voice:listen', label: 'Playback Call Recordings', group: 'Voice AI Studio', desc: 'Stream and audit voice recordings of doctor conversations' },

  // Autopilot Automation
  { id: 'autopilot:read', label: 'View Autopilot Queue', group: 'Autopilot AI', desc: 'Monitor autonomous outreach progress, queues, and stages' },
  { id: 'autopilot:trigger', label: 'Launch Autopilot Campaigns', group: 'Autopilot AI', desc: 'Push leads into automatic multi-channel sales sequences' },
  { id: 'autopilot:configure', label: 'Configure Campaign Modes', group: 'Autopilot AI', desc: 'Adjust retry policies, sentiment thresholds, and bot scripts' },

  // Multi-Channel Outreach
  { id: 'whatsapp:send', label: 'Meta WhatsApp Outreach', group: 'Outreach Channels', desc: 'Dispatch verified WhatsApp templates and follow-ups' },
  { id: 'email:send', label: 'Email Outreach & Pitches', group: 'Outreach Channels', desc: 'Generate and send hyper-personalized doctor emails' },

  // Commercial & Proposals
  { id: 'proposals:read', label: 'View Commercial Proposals', group: 'Commercial & Pricing', desc: 'Inspect Practo Prime & Reach commercial contracts and inventory' },
  { id: 'proposals:create', label: 'Draft Commercial Proposals', group: 'Commercial & Pricing', desc: 'Generate tailored pricing quotes and PDF proposals' },
  { id: 'proposals:approve', label: 'Approve Discounts & Contracts', group: 'Commercial & Pricing', desc: 'Grant special pricing waivers and sign off contracts' },

  // Analytics & Reporting
  { id: 'dashboard:read', label: 'View Executive Dashboard', group: 'Analytics & Reports', desc: 'View sales velocity, conversion rates, and revenue metrics' },
  { id: 'reports:read', label: 'View Analytics Reports', group: 'Analytics & Reports', desc: 'Access comprehensive pipeline and conversion reports' },
  { id: 'reports:write', label: 'Custom Reports & Analytics', group: 'Analytics & Reports', desc: 'Configure custom reporting dimensions and exports' },

  // Governance & Administration
  { id: 'users:read', label: 'View Team Members', group: 'User Management', desc: 'View employee accounts, quotas, and territory allocations' },
  { id: 'users:write', label: 'Create & Edit Users', group: 'User Management', desc: 'Add new staff, assign roles, and adjust granular permissions' },
  { id: 'users:delete', label: 'Delete or Suspend Users', group: 'User Management', desc: 'Deactivate or permanently remove employee accounts' },
  { id: 'settings:read', label: 'View System Settings', group: 'System & Security', desc: 'Inspect platform configurations and server health' },
  { id: 'settings:write', label: 'Modify System Settings', group: 'System & Security', desc: 'Update organization branding, defaults, and parameters' },
  { id: 'api_integrations:read', label: 'View API Integrations', group: 'System & Security', desc: 'Check connectivity for Sarvam, Meta, Nvidia, and DB' },
  { id: 'api_integrations:write', label: 'Manage API Keys & Webhooks', group: 'System & Security', desc: 'Update production secrets and telephony endpoints' },
  { id: 'audit:read', label: 'Compliance Audit Trail', group: 'System & Security', desc: 'Inspect tamper-evident audit logs and security events' },
];

export const ROLES = {
  superadmin: {
    label: 'Super Admin',
    level: 1000,
    badge: 'badge-purple',
    description: 'Unrestricted full platform access across all modules, team security, and API configurations',
    permissions: ['*', ...ALL_PERMISSIONS.map((p) => p.id)],
  },
  admin: {
    label: 'Administrator',
    level: 500,
    badge: 'badge-purple',
    description: 'Full operational control over CRM, campaigns, calling, scraper, and team settings',
    permissions: ALL_PERMISSIONS.filter((p) => !p.id.startsWith('users:delete') && p.id !== 'api_integrations:write').map((p) => p.id),
  },
  sales_manager: {
    label: 'Sales Manager',
    level: 100,
    badge: 'badge-blue',
    description: 'Team oversight, lead distribution, Autopilot campaigns, call monitoring & proposal sign-offs',
    permissions: [
      'dashboard:read', 'reports:read', 'reports:write',
      'leads:read', 'leads:write', 'export:read', 'leads:import',
      'scraper:read', 'scraper:run', 'scraper:assign',
      'voice:call', 'voice:read', 'voice:listen',
      'autopilot:read', 'autopilot:trigger',
      'whatsapp:send', 'email:send',
      'proposals:read', 'proposals:create', 'proposals:approve',
      'users:read', 'audit:read', 'settings:read',
    ],
  },
  sales_agent: {
    label: 'Sales Representative',
    level: 50,
    badge: 'badge-teal',
    description: 'Daily CRM workflow, doctor discovery, AI call triggering, WhatsApp outreach, and proposal generation',
    permissions: [
      'dashboard:read',
      'leads:read', 'leads:write', 'export:read',
      'scraper:read', 'scraper:assign',
      'voice:call', 'voice:read',
      'autopilot:read',
      'whatsapp:send', 'email:send',
      'proposals:read', 'proposals:create',
    ],
  },
  ops_specialist: {
    label: 'Operations Specialist',
    level: 60,
    badge: 'badge-yellow',
    description: 'Market research, clinic web scraping, lead cleaning, and bulk CSV uploads',
    permissions: [
      'dashboard:read',
      'leads:read', 'leads:write', 'export:read', 'leads:import',
      'scraper:read', 'scraper:run', 'scraper:assign',
      'reports:read',
    ],
  },
  auditor: {
    label: 'Compliance Auditor',
    level: 30,
    badge: 'badge-gray',
    description: 'Read-only access to audit trails, call recordings, compliance logs, and performance metrics',
    permissions: [
      'dashboard:read', 'reports:read',
      'leads:read', 'voice:read', 'voice:listen',
      'proposals:read', 'audit:read', 'settings:read',
    ],
  },
  viewer: {
    label: 'Read-Only Viewer',
    level: 10,
    badge: 'badge-gray',
    description: 'Read-only visibility for executive stakeholders and guests',
    permissions: [
      'dashboard:read', 'leads:read', 'reports:read',
    ],
  },
};

// Aliases for backwards compatibility
ROLES.agent = ROLES.sales_agent;
ROLES.manager = ROLES.sales_manager;

export function permissionsForRole(role) {
  const list = ROLES[role]?.permissions || ROLES.sales_agent.permissions;
  return [...new Set(list)];
}

export function hasPermission(user, permission) {
  if (!user) return false;
  if (user.role === 'superadmin') return true;

  const perms = Array.isArray(user.permissions)
    ? user.permissions
    : JSON.parse(user.permissions || '[]');

  if (perms.includes('*')) return true;
  if (perms.includes(permission)) return true;

  // Support category wildcards, e.g. "leads:*" matching "leads:read", "leads:write", etc.
  const [category] = permission.split(':');
  if (category && perms.includes(`${category}:*`)) return true;

  return false;
}

export function isSuperAdmin(user) {
  if (!user) return false;
  return user.role === 'superadmin' || hasPermission(user, '*');
}

export function assignableRoles() {
  return Object.entries(ROLES)
    .filter(([id, r]) => id !== 'superadmin' && id !== 'agent' && id !== 'manager')
    .map(([id, r]) => ({
      id,
      label: r.label,
      level: r.level,
      badge: r.badge,
      description: r.description,
      permissions: r.permissions,
    }));
}
