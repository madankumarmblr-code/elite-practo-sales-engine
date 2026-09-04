import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import db from '../db/db.js';
import { ROLES, ALL_PERMISSIONS, permissionsForRole, assignableRoles, isSuperAdmin } from '../auth/roles.js';
import { authRequired, requirePermission } from '../auth/middleware.js';
import { issueAuthToken } from '../auth/token.js';
import { logEvent, listEvents } from '../services/logger.js';
import { persistDurableDbNow, durableStoreConfigured } from '../services/dbSnapshot.js';

const now = () => new Date().toISOString();

function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    username: row.username || '',
    role: row.role,
    roleLabel: ROLES[row.role]?.label || row.role,
    level: ROLES[row.role]?.level || 0,
    permissions: JSON.parse(row.permissions || '[]'),
    active: !!row.active,
    status: row.status || (row.active ? 'active' : 'suspended'),
    territory: (() => { try { const t = JSON.parse(row.territory || '[]'); return Array.isArray(t) && t.length > 0 ? t : ['Bangalore']; } catch { return [row.territory || 'Bangalore']; } })(),
    monthlyQuota: row.monthly_quota != null ? row.monthly_quota : 50,
    dailyCallLimit: row.daily_call_limit != null ? row.daily_call_limit : 100,
    canExport: row.can_export != null ? row.can_export === 1 : true,
    canTriggerAutopilot: row.can_trigger_autopilot != null ? row.can_trigger_autopilot === 1 : true,
    canApproveProposals: row.can_approve_proposals != null ? row.can_approve_proposals === 1 : false,
    phone: row.phone || '',
    isSuperAdmin: row.role === 'superadmin',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function findUserByLogin(login) {
  const value = String(login || '').trim().toLowerCase();
  if (!value) return null;
  return (
    db.prepare('SELECT * FROM users WHERE lower(email) = ? AND active = 1').get(value) ||
    db.prepare('SELECT * FROM users WHERE lower(username) = ? AND active = 1').get(value)
  );
}

export function registerAuthRoutes(app) {
  app.get('/api/auth/roles', authRequired, requirePermission('users:read', 'system:health'), (_req, res) => {
    res.json({ roles: assignableRoles(), allRoles: Object.entries(ROLES).map(([id, r]) => ({ id, label: r.label, level: r.level, description: r.description, permissions: r.permissions.filter((p) => p !== '*') })), permissions: ALL_PERMISSIONS });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, username, password, login } = req.body || {};
    const identifier = login || username || email;
    if (!identifier || !password) return res.status(400).json({ error: 'User ID / email and password are required' });

    const user = findUserByLogin(identifier);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      logEvent({ type: 'warn', category: 'auth', message: 'Failed login attempt', detail: String(identifier) });
      return res.status(401).json({ error: 'Invalid user ID or password' });
    }

    const issued = issueAuthToken(user);
    try {
      db.prepare('INSERT OR REPLACE INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(issued.token, user.id, now(), issued.expiresAt);
    } catch { /* ignore */ }

    logEvent({ type: 'info', category: 'auth', message: 'User logged in', detail: user.email, userId: user.id, meta: { role: user.role } });
    res.json({ token: issued.token, expiresAt: issued.expiresAt, user: publicUser(user) });
  });

  app.post('/api/auth/logout', authRequired, (req, res) => {
    try { db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token); } catch { /* ignore */ }
    logEvent({ type: 'info', category: 'auth', message: 'User logged out', detail: req.user.email, userId: req.user.id });
    res.json({ ok: true });
  });

  app.get('/api/auth/me', authRequired, (req, res) => {
    const row = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) ||
      db.prepare('SELECT * FROM users WHERE lower(email) = ?').get(String(req.user.email || '').toLowerCase());
    if (row) return res.json(publicUser(row));
    // Signed-token fallback for fresh serverless isolates
    res.json({ id: req.user.id, name: req.user.name, email: req.user.email, username: req.user.username || '', role: req.user.role, roleLabel: ROLES[req.user.role]?.label || req.user.role, level: ROLES[req.user.role]?.level || 0, permissions: req.user.permissions || [], active: true, isSuperAdmin: req.user.role === 'superadmin', createdAt: null, updatedAt: null });
  });

  // ── User CRUD ──────────────────────────────────────────────────────────────
  app.get('/api/users', authRequired, requirePermission('users:read'), (_req, res) => {
    const rows = db.prepare("SELECT * FROM users ORDER BY CASE role WHEN 'superadmin' THEN 0 ELSE 1 END, name").all().map(publicUser);
    res.json(rows);
  });

  app.post('/api/users', authRequired, requirePermission('users:write'), async (req, res) => {
    if (!isSuperAdmin(req.user)) return res.status(403).json({ error: 'Only Super Admin can create users' });
    const { name, email, username, password, role = 'agent', permissions, active = true } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email, and password are required' });
    if (role === 'superadmin') return res.status(400).json({ error: 'Cannot create another Super Admin via API' });
    if (!ROLES[role]) return res.status(400).json({ error: 'Invalid role' });

    const emailNorm = String(email).toLowerCase().trim();
    const usernameNorm = String(username || emailNorm.split('@')[0]).toLowerCase().trim().replace(/[^a-z0-9._-]/g, '');
    if (!usernameNorm) return res.status(400).json({ error: 'username is required' });
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(emailNorm)) return res.status(409).json({ error: 'Email already exists' });
    if (db.prepare('SELECT id FROM users WHERE lower(username) = ?').get(usernameNorm)) return res.status(409).json({ error: 'Username already exists' });

    const perms = Array.isArray(permissions) && permissions.length ? permissions : permissionsForRole(role);
    const id = nanoid();
    const ts = now();
    db.prepare('INSERT INTO users (id, name, email, username, password_hash, role, permissions, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, name, emailNorm, usernameNorm, bcrypt.hashSync(password, 10), role, JSON.stringify(perms), active ? 1 : 0, ts, ts);

    logEvent({ type: 'info', category: 'users', message: 'User created', detail: `${usernameNorm} (${role})`, userId: req.user.id, meta: { createdUserId: id } });
    await persistDurableDbNow();
    res.status(201).json(publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id)));
  });

  app.put('/api/users/:id', authRequired, requirePermission('users:write'), async (req, res) => {
    if (!isSuperAdmin(req.user)) return res.status(403).json({ error: 'Only Super Admin can update users' });
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found' });

    const b = req.body || {};
    if (existing.role === 'superadmin' && b.role && b.role !== 'superadmin') return res.status(400).json({ error: 'Cannot change Super Admin role' });

    const role = existing.role === 'superadmin' ? 'superadmin' : b.role || existing.role;
    if (!ROLES[role]) return res.status(400).json({ error: 'Invalid role' });

    let perms;
    if (role === 'superadmin') perms = permissionsForRole('superadmin');
    else if (Array.isArray(b.permissions)) perms = b.permissions;
    else if (b.role && b.role !== existing.role) perms = permissionsForRole(role);
    else perms = JSON.parse(existing.permissions || '[]');

    const emailNorm = String(b.email || existing.email).toLowerCase().trim();
    const usernameNorm = String(b.username != null ? b.username : existing.username || '').toLowerCase().trim().replace(/[^a-z0-9._-]/g, '');

    if (db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(emailNorm, existing.id)) return res.status(409).json({ error: 'Email already exists' });
    if (usernameNorm && db.prepare('SELECT id FROM users WHERE lower(username) = ? AND id != ?').get(usernameNorm, existing.id)) return res.status(409).json({ error: 'Username already exists' });

    db.prepare('UPDATE users SET name=?, email=?, username=?, role=?, permissions=?, active=?, updated_at=? WHERE id=?').run(b.name ?? existing.name, emailNorm, usernameNorm || existing.username, role, JSON.stringify(perms), b.active !== undefined ? (b.active ? 1 : 0) : existing.active, now(), existing.id);
    if (b.password) db.prepare('UPDATE users SET password_hash=?, updated_at=? WHERE id=?').run(bcrypt.hashSync(b.password, 10), now(), existing.id);

    logEvent({ type: 'info', category: 'users', message: 'User updated', detail: emailNorm, userId: req.user.id });
    await persistDurableDbNow();
    res.json(publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(existing.id)));
  });

  app.delete('/api/users/:id', authRequired, requirePermission('users:write'), async (req, res) => {
    if (!isSuperAdmin(req.user)) return res.status(403).json({ error: 'Only Super Admin can delete users' });
    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ error: 'User not found' });
    if (existing.role === 'superadmin') return res.status(400).json({ error: 'Cannot delete Super Admin' });
    if (existing.id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(existing.id);
    db.prepare('DELETE FROM users WHERE id = ?').run(existing.id);
    logEvent({ type: 'warn', category: 'users', message: 'User deleted', detail: existing.email, userId: req.user.id });
    await persistDurableDbNow();
    res.json({ ok: true });
  });

  // ── System ─────────────────────────────────────────────────────────────────
  app.get('/api/system/events', authRequired, requirePermission('system:logs'), (req, res) => {
    const limit = Number(req.query.limit) || 100;
    const category = req.query.category ? String(req.query.category) : undefined;
    const type = req.query.type ? String(req.query.type) : undefined;
    res.json(listEvents({ limit, category, type }));
  });

  app.get('/api/system/health', authRequired, requirePermission('system:health'), (req, res) => {
    let dbProbe = { ok: false };
    const probeStarted = Date.now();
    try {
      const row = db.prepare('SELECT 1 AS ok').get();
      dbProbe = { ok: row?.ok === 1, latencyMs: Date.now() - probeStarted, driver: 'better-sqlite3', writable: true };
    } catch (err) {
      dbProbe = { ok: false, latencyMs: Date.now() - probeStarted, error: err.message, writable: false };
    }

    const counts = {
      users: db.prepare('SELECT COUNT(*) as c FROM users').get().c,
      sessions: db.prepare('SELECT COUNT(*) as c FROM sessions').get().c,
      leads: db.prepare('SELECT COUNT(*) as c FROM leads').get().c,
      activities: db.prepare('SELECT COUNT(*) as c FROM activities').get().c,
      integrations: db.prepare('SELECT COUNT(*) as c FROM api_integrations').get().c,
      events: db.prepare('SELECT COUNT(*) as c FROM system_events').get().c,
    };

    const checks = [
      { name: 'db_select_1', ok: dbProbe.ok, detail: dbProbe.ok ? `SELECT 1 in ${dbProbe.latencyMs}ms` : dbProbe.error },
      { name: 'users_table', ok: counts.users >= 1, detail: `${counts.users} user(s)` },
      { name: 'superadmin_present', ok: !!db.prepare("SELECT id FROM users WHERE role = 'superadmin' AND active = 1").get(), detail: 'Super Admin active' },
      { name: 'api_integrations_ready', ok: counts.integrations > 0, detail: `${counts.integrations} connectors` },
    ];

    const ok = checks.every((c) => c.ok);
    res.json({ ok, time: new Date().toISOString(), counts, checks, db: { driver: 'better-sqlite3', file: 'elite-sales.db', probe: dbProbe, connected: dbProbe.ok }, api: { ok: true, service: 'elite-practo-sales-api' } });
  });
}
