import express from 'express';
import { ROLES, ROLE_PERMISSIONS } from '../services/rbac.js';

export const usersRouter = express.Router();

// Persistent In-Memory User & Sales Team Directory
export const TEAM_USERS = [
  {
    id: 'usr-admin',
    name: 'Super Admin',
    userId: 'admin',
    email: 'admin@practo.com',
    password: 'admin123',
    role: 'superadmin',
    title: 'Chief Revenue Officer / SuperAdmin',
    city: 'All Territories',
    phone: '+91 98800 12345',
    status: 'Active',
    createdAt: '2026-01-01',
    permissions: [
      'lead_scraping',
      'crm_pipeline_edit',
      'ai_pilot_trigger',
      'proposal_create',
      'discount_approval',
      'slot_booking',
      'amoga_sync',
      'user_management',
      'audit_export',
    ],
  },
  {
    id: 'usr-mgr-1',
    name: 'Rajesh Sharma',
    userId: 'rajesh',
    email: 'rajesh.sharma@practo.com',
    password: 'practo123',
    role: 'sales_manager',
    title: 'Regional Sales Manager (South)',
    city: 'Bangalore / Chennai / Hyderabad',
    phone: '+91 98450 67890',
    status: 'Active',
    createdAt: '2026-01-15',
    permissions: [
      'lead_scraping',
      'crm_pipeline_edit',
      'ai_pilot_trigger',
      'proposal_create',
      'discount_approval',
      'slot_booking',
      'amoga_sync',
    ],
  },
  {
    id: 'usr-ae-1',
    name: 'Vikram Seth',
    userId: 'vikram',
    email: 'vikram.seth@practo.com',
    password: 'practo123',
    role: 'account_executive',
    title: 'Senior Account Executive',
    city: 'Bangalore Central',
    phone: '+91 99160 34567',
    status: 'Active',
    createdAt: '2026-02-01',
    permissions: [
      'lead_scraping',
      'crm_pipeline_edit',
      'proposal_create',
      'slot_booking',
    ],
  },
  {
    id: 'usr-sdr-1',
    name: 'Sneha Rao',
    userId: 'sneha',
    email: 'sneha.rao@practo.com',
    password: 'practo123',
    role: 'sdr',
    title: 'Sales Development Representative',
    city: 'Bangalore North',
    phone: '+91 98765 43210',
    status: 'Active',
    createdAt: '2026-02-10',
    permissions: [
      'lead_scraping',
      'crm_pipeline_edit',
      'ai_pilot_trigger',
    ],
  },
];

// GET /api/users - List all users & team members
usersRouter.get('/', (req, res) => {
  const safeUsers = TEAM_USERS.map(({ password, ...rest }) => rest);
  res.json({
    total: safeUsers.length,
    users: safeUsers,
    availableRoles: [
      { id: 'superadmin', label: 'Superadmin (Full Privileges)' },
      { id: 'sales_vp', label: 'Sales VP / Director' },
      { id: 'sales_manager', label: 'Sales Manager / Team Lead' },
      { id: 'account_executive', label: 'Account Executive' },
      { id: 'sdr', label: 'SDR / Telecaller' },
    ],
    allPermissions: [
      { id: 'lead_scraping', label: 'Lead Scraper & GMB Medical Search' },
      { id: 'crm_pipeline_edit', label: 'CRM Pipeline Stage & Deal Edit' },
      { id: 'ai_pilot_trigger', label: 'Auto-Pilot AI Calling & WhatsApp Pitches' },
      { id: 'proposal_create', label: 'Commercial Proposal & Proforma Suite' },
      { id: 'discount_approval', label: 'Special Reach Discount Overrides (>15%)' },
      { id: 'slot_booking', label: 'Lock & Book Premium Inventory Slots' },
      { id: 'amoga_sync', label: 'Bi-Directional Practo Amoga CRM Sync' },
      { id: 'user_management', label: 'User & Team Permission Management' },
    ],
  });
});

// POST /api/users - Create new sales team member / user
usersRouter.post('/', (req, res) => {
  const { name, userId, email, password, role, title, city, phone, permissions } = req.body;

  if (!name || !userId || !password) {
    return res.status(400).json({ error: 'Name, User ID, and Password are required.' });
  }

  // Check unique userId and email
  const existing = TEAM_USERS.find(
    (u) => u.userId.toLowerCase() === userId.toLowerCase() || (email && u.email.toLowerCase() === email.toLowerCase())
  );

  if (existing) {
    return res.status(409).json({ error: `User with ID '${userId}' or email already exists.` });
  }

  const defaultRolePerms = {
    superadmin: ['lead_scraping', 'crm_pipeline_edit', 'ai_pilot_trigger', 'proposal_create', 'discount_approval', 'slot_booking', 'amoga_sync', 'user_management'],
    sales_vp: ['lead_scraping', 'crm_pipeline_edit', 'ai_pilot_trigger', 'proposal_create', 'discount_approval', 'slot_booking', 'amoga_sync'],
    sales_manager: ['lead_scraping', 'crm_pipeline_edit', 'ai_pilot_trigger', 'proposal_create', 'slot_booking', 'amoga_sync'],
    account_executive: ['lead_scraping', 'crm_pipeline_edit', 'proposal_create', 'slot_booking'],
    sdr: ['lead_scraping', 'crm_pipeline_edit', 'ai_pilot_trigger'],
  };

  const newUser = {
    id: `usr-${Date.now()}`,
    name: name.trim(),
    userId: userId.trim().toLowerCase(),
    email: email ? email.trim().toLowerCase() : `${userId.trim().toLowerCase()}@practo.com`,
    password: password.trim(),
    role: role || 'account_executive',
    title: title || (role === 'superadmin' ? 'Superadmin' : 'Sales Representative'),
    city: city || 'Bangalore',
    phone: phone || '+91 90000 00000',
    status: 'Active',
    createdAt: new Date().toISOString().split('T')[0],
    permissions: Array.isArray(permissions) && permissions.length > 0
      ? permissions
      : (defaultRolePerms[role] || defaultRolePerms.account_executive),
  };

  TEAM_USERS.push(newUser);

  const { password: _, ...safeUser } = newUser;
  res.status(201).json({
    message: 'User created successfully',
    user: safeUser,
  });
});

// PUT /api/users/:id - Update user details or permissions
usersRouter.put('/:id', (req, res) => {
  const { id } = req.params;
  const user = TEAM_USERS.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { name, title, role, city, phone, status, permissions, password } = req.body;

  if (name) user.name = name.trim();
  if (title) user.title = title.trim();
  if (role) user.role = role;
  if (city) user.city = city;
  if (phone) user.phone = phone;
  if (status) user.status = status;
  if (Array.isArray(permissions)) user.permissions = permissions;
  if (password && password.trim()) user.password = password.trim();

  const { password: _, ...safeUser } = user;
  res.json({
    message: 'User updated successfully',
    user: safeUser,
  });
});

// DELETE /api/users/:id - Remove user
usersRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  const idx = TEAM_USERS.findIndex((u) => u.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (TEAM_USERS[idx].userId === 'admin') {
    return res.status(403).json({ error: 'Default Superadmin cannot be deleted' });
  }

  const deleted = TEAM_USERS.splice(idx, 1)[0];
  res.json({ message: `User ${deleted.name} removed successfully` });
});
