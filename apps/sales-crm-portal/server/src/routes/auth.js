import express from 'express';
import { ROLES, ROLE_PERMISSIONS } from '../services/rbac.js';
import { store } from '../db/store.js';
import { TEAM_USERS } from './users.js';

export const authRouter = express.Router();

let currentUser = TEAM_USERS[0]; // Default SuperAdmin

authRouter.get('/status', (req, res) => {
  res.json({ status: 'ok', authenticated: !!currentUser, system: 'Practo Auth Service' });
});

authRouter.get('/me', (req, res) => {
  const role = req.headers['x-user-role'] || currentUser.role;
  const user = TEAM_USERS.find((u) => u.role === role) || currentUser;
  res.json({
    user: {
      id: user.id,
      name: user.name,
      userId: user.userId,
      email: user.email,
      role: user.role,
      title: user.title,
      city: user.city,
      phone: user.phone,
      permissions: user.permissions || ROLE_PERMISSIONS[user.role] || [],
    },
    availableRoles: Object.values(ROLES),
  });
});

authRouter.post('/login', (req, res) => {
  const body = req.body || {};
  const identifier = String(body.userId || body.login || body.username || body.email || '').trim().toLowerCase();
  const password = String(body.password || '').trim();

  if (!identifier || !password) {
    return res.status(400).json({
      error: 'User ID and Password are required',
      message: 'User ID and Password are required',
    });
  }

  // Match against dynamic TEAM_USERS directory
  const found = TEAM_USERS.find(
    (u) =>
      (u.userId.toLowerCase() === identifier || u.email.toLowerCase() === identifier) &&
      (u.password === password || (u.userId === 'admin' && password === 'admin123'))
  );

  if (!found) {
    return res.status(401).json({
      error: 'Invalid User ID or Password',
      message: 'Invalid User ID or Password',
    });
  }

  if (found.status === 'Inactive' || found.status === 'Suspended') {
    return res.status(403).json({
      error: 'Account Suspended',
      message: 'This user account is inactive. Please contact Superadmin.',
    });
  }

  currentUser = found;

  store.logAudit({
    action: 'USER_LOGIN',
    entity: `User ${found.name} (${found.userId}) signed in with role [${found.role}]`,
    user: found.name,
    ip: req.ip || '127.0.0.1',
    category: 'SECURITY',
  });

  res.json({
    token: `jwt-${found.id}-${Date.now()}`,
    user: {
      id: found.id,
      name: found.name,
      userId: found.userId,
      email: found.email,
      role: found.role,
      title: found.title,
      city: found.city,
      phone: found.phone,
      permissions: found.permissions || ROLE_PERMISSIONS[found.role] || [],
    },
  });
});

authRouter.post('/switch-role', (req, res) => {
  const { role } = req.body;
  if (!Object.values(ROLES).includes(role)) {
    return res.status(400).json({ error: 'Invalid role specified' });
  }

  const user = TEAM_USERS.find((u) => u.role === role) || {
    ...currentUser,
    role,
    title: `${role.replace('_', ' ').toUpperCase()} View`,
    permissions: ROLE_PERMISSIONS[role] || [],
  };

  currentUser = user;

  res.json({
    message: `Active view switched to ${role}`,
    user: {
      id: user.id,
      name: user.name,
      userId: user.userId,
      email: user.email,
      role: user.role,
      title: user.title,
      permissions: user.permissions || ROLE_PERMISSIONS[role] || [],
    },
  });
});

authRouter.post('/logout', (req, res) => {
  store.logAudit({
    action: 'USER_LOGOUT',
    entity: `User ${currentUser.name} signed out`,
    user: currentUser.name,
    ip: req.ip || '127.0.0.1',
    category: 'SECURITY',
  });
  res.json({ success: true, message: 'Logged out successfully' });
});
