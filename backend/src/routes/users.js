import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import db from '../db/db.js';
import { authRequired, requirePermission } from '../auth/middleware.js';
import { ALL_PERMISSIONS, ROLES, assignableRoles, permissionsForRole } from '../auth/roles.js';
import { recordAuditLog } from '../services/auditLogger.js';
import { logEvent } from '../services/logger.js';
import { persistDurableDbNow } from '../services/dbSnapshot.js';

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
    department: u.department || 'Enterprise Sales',
    phone: u.phone || '',
    status: u.status || (u.active ? 'active' : 'suspended'),
    active: u.active === 1,
    territory: parsedTerritory,
    monthlyQuota: u.monthly_quota != null ? Number(u.monthly_quota) : 50,
    dailyCallLimit: u.daily_call_limit != null ? Number(u.daily_call_limit) : 100,
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
   * Get roles, descriptions and granular permission catalog
   */
  app.get('/api/users/roles-permissions', authRequired, (req, res) => {
    res.json({
      roles: ROLES,
      assignableRoles: assignableRoles(),
      permissions: ALL_PERMISSIONS,
    });
  });

  /**
   * List all users with quotas, territory, and permissions
   */
  app.get('/api/users', authRequired, requirePermission('users:read', 'settings:read'), (req, res) => {
    const rows = db.prepare('SELECT * FROM users ORDER BY created_at ASC').all();
    res.json(rows.map(formatUser));
  });

  /**
   * Get single user by ID
   */
  app.get('/api/users/:id', authRequired, requirePermission('users:read', 'settings:read'), (req, res) => {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'User not found' });
    res.json(formatUser(row));
  });

  /**
   * Create new enterprise user with granular permissions & quotas
   */
  app.post('/api/users', authRequired, requirePermission('users:write', 'settings:write'), async (req, res) => {
    const {
      name,
      email,
      username,
      password,
      role = 'sales_agent',
      department = 'Enterprise Sales',
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

    const emailNorm = String(email).trim().toLowerCase();
    const usernameNorm = String(username || emailNorm).trim().toLowerCase();

    const existing = db.prepare('SELECT id FROM users WHERE lower(email) = ? OR lower(username) = ?').get(emailNorm, usernameNorm);
    if (existing) {
      return res.status(409).json({ error: 'User with this email or username already exists' });
    }

    const id = nanoid();
    const ts = now();
    const passwordHash = await bcrypt.hash(password, 10);

    const finalPermissions = Array.isArray(permissions) && permissions.length > 0
      ? permissions
      : permissionsForRole(role);

    db.prepare(`
      INSERT INTO users (
        id, name, email, username, password_hash, role, permissions, active,
        territory, monthly_quota, daily_call_limit, can_export, can_trigger_autopilot, can_approve_proposals,
        status, phone, department, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
    `).run(
      id,
      name.trim(),
      emailNorm,
      usernameNorm,
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
      department,
      ts,
      ts
    );

    recordAuditLog({
      req,
      action: 'user.create',
      entityType: 'user',
      entityId: id,
      details: `Created ${role} user: ${name} (${emailNorm}) with ${finalPermissions.length} permissions`,
      newState: { name, email: emailNorm, role, department, territory, permissions: finalPermissions },
    });

    logEvent({
      type: 'info',
      category: 'auth',
      message: `User created: ${name} (${role})`,
      userId: req.user.id,
    });

    await persistDurableDbNow({ force: true });

    const created = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.status(201).json(formatUser(created));
  });

  /**
   * Update user details, permissions, role, and quotas (supports PUT and PATCH)
   */
  const handleUpdateUser = async (req, res) => {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const {
      name,
      email,
      username,
      role,
      department,
      phone,
      territory,
      monthlyQuota,
      dailyCallLimit,
      canExport,
      canTriggerAutopilot,
      canApproveProposals,
      permissions,
      status,
      password,
    } = req.body || {};

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name.trim()); }
    if (email !== undefined) {
      const emailNorm = String(email).trim().toLowerCase();
      const conflict = db.prepare('SELECT id FROM users WHERE lower(email) = ? AND id != ?').get(emailNorm, req.params.id);
      if (conflict) return res.status(409).json({ error: 'Email is already used by another account' });
      updates.push('email = ?');
      params.push(emailNorm);
    }
    if (username !== undefined) {
      const usernameNorm = String(username).trim().toLowerCase();
      const conflict = db.prepare('SELECT id FROM users WHERE lower(username) = ? AND id != ?').get(usernameNorm, req.params.id);
      if (conflict) return res.status(409).json({ error: 'Username is already used by another account' });
      updates.push('username = ?');
      params.push(usernameNorm);
    }
    if (role !== undefined) { updates.push('role = ?'); params.push(role); }
    if (department !== undefined) { updates.push('department = ?'); params.push(department); }
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

    if (permissions !== undefined) {
      updates.push('permissions = ?');
      params.push(JSON.stringify(Array.isArray(permissions) ? permissions : []));
    } else if (role !== undefined && role !== user.role) {
      // If role changed and no explicit permissions were passed, apply role defaults
      updates.push('permissions = ?');
      params.push(JSON.stringify(permissionsForRole(role)));
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      updates.push('password_hash = ?');
      params.push(passwordHash);
    }

    if (updates.length === 0) {
      return res.json(formatUser(user));
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
      newState: req.body,
    });

    await persistDurableDbNow({ force: true });

    const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    res.json(formatUser(updated));
  };

  app.patch('/api/users/:id', authRequired, requirePermission('users:write', 'settings:write'), handleUpdateUser);
  app.put('/api/users/:id', authRequired, requirePermission('users:write', 'settings:write'), handleUpdateUser);

  /**
   * Admin Reset Password for a user
   */
  app.post('/api/users/:id/reset-password', authRequired, requirePermission('users:write', 'settings:write'), async (req, res) => {
    const { newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const ts = now();
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(passwordHash, ts, user.id);

    recordAuditLog({
      req,
      action: 'user.reset_password',
      entityType: 'user',
      entityId: user.id,
      details: `Password reset for user: ${user.name} (${user.email})`,
    });

    await persistDurableDbNow({ force: true });

    res.json({ ok: true, message: `Password successfully updated for ${user.name}` });
  });

  /**
   * Delete user account
   */
  app.delete('/api/users/:id', authRequired, requirePermission('users:delete', 'settings:write'), async (req, res) => {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ error: 'You cannot delete your own user account' });
    }

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Protect root superadmin account
    if (user.id === 'user_superadmin' || user.username === 'superadmin') {
      return res.status(403).json({ error: 'The primary system Super Admin account cannot be deleted' });
    }

    // Clean up sessions
    try {
      db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.params.id);
    } catch {}

    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);

    recordAuditLog({
      req,
      action: 'user.delete',
      entityType: 'user',
      entityId: req.params.id,
      details: `Deleted user: ${user.name} (${user.email})`,
      oldState: formatUser(user),
    });

    await persistDurableDbNow({ force: true });

    res.json({ ok: true, message: `User ${user.name} removed.` });
  });
}
