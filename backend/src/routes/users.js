import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import db from '../db/db.js';
import { authRequired, requirePermission } from '../auth/middleware.js';
import { recordAuditLog } from '../services/auditLogger.js';
import { logEvent } from '../services/logger.js';

const now = () => new Date().toISOString();

function formatUser(u) {
  if (!u) return null;
  let parsedPermissions = [];
  let parsedTerritory = [];
  try { parsedPermissions = JSON.parse(u.permissions || '[]'); } catch { parsedPermissions = []; }
  try { parsedTerritory = JSON.parse(u.territory || '[]'); } catch { parsedTerritory = [u.territory || 'Bangalore']; }

  return {
    id: u.id,
    name: u.name,
    email: u.email,
    username: u.username || u.email,
    role: u.role,
    phone: u.phone || '',
    status: u.status || (u.active ? 'active' : 'suspended'),
    active: u.active === 1,
    territory: parsedTerritory,
    monthlyQuota: u.monthly_quota || 50,
    dailyCallLimit: u.daily_call_limit || 100,
    canExport: u.can_export === 1,
    canTriggerAutopilot: u.can_trigger_autopilot === 1,
    canApproveProposals: u.can_approve_proposals === 1,
    permissions: parsedPermissions,
    createdAt: u.created_at,
    updated_at: u.updated_at,
  };
}

export function registerUsersRoutes(app) {
  /**
   * List all users with extra settings and quotas
   */
  app.get('/api/users', authRequired, requirePermission('settings:read'), (req, res) => {
    const rows = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all();
    res.json(rows.map(formatUser));
  });

  /**
   * Get single user
   */
  app.get('/api/users/:id', authRequired, requirePermission('settings:read'), (req, res) => {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'User not found' });
    res.json(formatUser(row));
  });

  /**
   * Create new user with SuperAdmin / User Level settings
   */
  app.post('/api/users', authRequired, requirePermission('settings:write'), async (req, res) => {
    const {
      name,
      email,
      username,
      password,
      role = 'sales_agent',
      phone = '',
      territory = ['Bangalore'],
      monthlyQuota = 50,
      dailyCallLimit = 100,
      canExport = true,
      canTriggerAutopilot = true,
      canApproveProposals = false,
      permissions = [],
    } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username || email);
    if (existing) {
      return res.status(409).json({ error: 'User with this email or username already exists' });
    }

    const id = nanoid();
    const ts = now();
    const passwordHash = await bcrypt.hash(password, 10);
    const finalPermissions = Array.isArray(permissions) && permissions.length > 0
      ? permissions
      : role === 'superadmin'
        ? ['*']
        : role === 'sales_manager'
          ? ['leads:*', 'voice:*', 'whatsapp:*', 'pitch:*', 'dashboard:read', 'audit:read']
          : ['leads:read', 'leads:write', 'voice:call', 'pitch:read', 'dashboard:read'];

    db.prepare(`
      INSERT INTO users (
        id, name, email, username, password_hash, role, permissions, active,
        territory, monthly_quota, daily_call_limit, can_export, can_trigger_autopilot, can_approve_proposals,
        status, phone, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    `).run(
      id,
      name,
      email,
      username || email,
      passwordHash,
      role,
      JSON.stringify(finalPermissions),
      JSON.stringify(Array.isArray(territory) ? territory : [territory]),
      Number(monthlyQuota) || 50,
      Number(dailyCallLimit) || 100,
      canExport ? 1 : 0,
      canTriggerAutopilot ? 1 : 0,
      canApproveProposals ? 1 : 0,
      phone,
      ts,
      ts
    );

    recordAuditLog({
      req,
      action: 'user.create',
      entityType: 'user',
      entityId: id,
      details: `Created ${role} user: ${name} (${email})`,
    });

    logEvent({
      type: 'info',
      category: 'auth',
      message: `User created: ${name} (${role})`,
      userId: req.user.id,
    });

    const created = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.status(201).json(formatUser(created));
  });

  /**
   * Update user details and settings
   */
  app.patch('/api/users/:id', authRequired, requirePermission('settings:write'), async (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const {
      name,
      email,
      role,
      phone,
      territory,
      monthlyQuota,
      dailyCallLimit,
      canExport,
      canTriggerAutopilot,
      canApproveProposals,
      status,
      password,
    } = req.body || {};

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (role !== undefined) { updates.push('role = ?'); params.push(role); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (status !== undefined) {
      updates.push('status = ?', 'active = ?');
      params.push(status, status === 'active' ? 1 : 0);
    }
    if (territory !== undefined) {
      updates.push('territory = ?');
      params.push(JSON.stringify(Array.isArray(territory) ? territory : [territory]));
    }
    if (monthlyQuota !== undefined) { updates.push('monthly_quota = ?'); params.push(Number(monthlyQuota)); }
    if (dailyCallLimit !== undefined) { updates.push('daily_call_limit = ?'); params.push(Number(dailyCallLimit)); }
    if (canExport !== undefined) { updates.push('can_export = ?'); params.push(canExport ? 1 : 0); }
    if (canTriggerAutopilot !== undefined) { updates.push('can_trigger_autopilot = ?'); params.push(canTriggerAutopilot ? 1 : 0); }
    if (canApproveProposals !== undefined) { updates.push('can_approve_proposals = ?'); params.push(canApproveProposals ? 1 : 0); }
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      params.push(passwordHash);
    }

    updates.push('updated_at = ?');
    params.push(now());
    params.push(req.params.id);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

    recordAuditLog({
      req,
      action: 'user.update',
      entityType: 'user',
      entityId: req.params.id,
      details: `Updated settings for user: ${user.name}`,
    });

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    res.json(formatUser(updated));
  });

  /**
   * Delete user
   */
  app.delete('/api/users/:id', authRequired, requirePermission('settings:write'), (req, res) => {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ error: 'You cannot delete your own user account' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);

    recordAuditLog({
      req,
      action: 'user.delete',
      entityType: 'user',
      entityId: req.params.id,
      details: `Deleted user: ${user.name} (${user.email})`,
    });

    res.json({ ok: true, message: `User ${user.name} removed.` });
  });
}
