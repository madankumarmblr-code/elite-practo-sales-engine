import crypto from 'crypto';

const SESSION_DAYS = 7;

function getSecret() {
  return (
    process.env.AUTH_TOKEN_SECRET ||
    process.env.JWT_SECRET ||
    // Demo fallback — set AUTH_TOKEN_SECRET in production for durable signing
    'practo-sales-demo-auth-secret-change-me'
  );
}

function b64urlJson(value) {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * Signed bearer token that any serverless isolate can verify
 * without sharing the SQLite sessions table (critical on Vercel /tmp).
 */
export function issueAuthToken(user, { days = SESSION_DAYS } = {}) {
  const payload = {
    v: 1,
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username || '',
    role: user.role,
    permissions: Array.isArray(user.permissions)
      ? user.permissions
      : JSON.parse(user.permissions || '[]'),
    exp: Math.floor(Date.now() / 1000) + days * 86400,
  };
  const body = b64urlJson(payload);
  const sig = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  return {
    token: `${body}.${sig}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    payload,
  };
}

export function verifyAuthToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const idx = token.lastIndexOf('.');
  const body = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  if (!body || !sig) return null;

  const expected = crypto.createHmac('sha256', getSecret()).update(body).digest('base64url');
  if (!timingSafeEqualStr(sig, expected)) return null;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload || payload.v !== 1 || !payload.id || !payload.email) return null;
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return {
    id: payload.id,
    name: payload.name || '',
    email: payload.email,
    username: payload.username || '',
    role: payload.role,
    permissions: Array.isArray(payload.permissions) ? payload.permissions : [],
  };
}
