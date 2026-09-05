import db from '../db/db.js';
import { hasPermission } from './roles.js';
import { verifyAuthToken } from './token.js';

function userFromRow(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username || '',
    role: user.role,
    permissions: JSON.parse(user.permissions || '[]'),
  };
}

/**
 * Resolve the caller from a bearer token.
 * Prefers signed tokens (work across Vercel isolates).
 * Falls back to legacy SQLite sessions for local tokens.
 */
export function getUserFromToken(token) {
  if (!token) return null;

  const signed = verifyAuthToken(token);
  if (signed) {
    const row =
      db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(signed.id) ||
      db.prepare('SELECT * FROM users WHERE lower(email) = ? AND active = 1').get(String(signed.email).toLowerCase()) ||
      db.prepare('SELECT * FROM users WHERE lower(username) = ? AND active = 1').get(String(signed.username || '').toLowerCase());
    if (row) return userFromRow(row);
    // Fresh serverless DB (re-seeded) — trust signed claims
    return signed;
  }

  const session = db.prepare('SELECT * FROM sessions WHERE token = ?').get(token);
  if (!session) return null;
  if (new Date(session.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(session.user_id);
  if (!user) return null;
  return userFromRow(user);
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ')
    ? header.slice(7)
    : (req.headers['x-auth-token'] || req.query?.token || req.query?.auth_token);
  const user = getUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  req.user = user;
  req.token = token;
  next();
}

export function requirePermission(...perms) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    const ok = perms.some((p) => hasPermission(req.user, p));
    if (!ok) {
      return res.status(403).json({ error: 'Insufficient permissions', required: perms });
    }
    next();
  };
}
