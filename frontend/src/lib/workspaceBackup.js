/**
 * Browser-side workspace backup.
 *
 * On Vercel, SQLite under /tmp is ephemeral. Until Blob durable storage is
 * configured, we keep Settings / Lead Settings / API Integration credentials
 * and Super Admin users in localStorage and rehydrate after each cold start.
 */
const BACKUP_KEY = 'practo_workspace_backup_v1';

export function readWorkspaceBackup() {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function writeWorkspaceBackup(patch) {
  try {
    const current = readWorkspaceBackup() || {};
    const next = {
      ...current,
      ...patch,
      integrations: {
        ...(current.integrations || {}),
        ...(patch.integrations || {}),
      },
      users: patch.users !== undefined ? patch.users : current.users,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(BACKUP_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

export function backupAppSettings(settings) {
  if (!settings || typeof settings !== 'object') return;
  writeWorkspaceBackup({ settings });
}

export function backupLeadSettings(leadSettings) {
  if (!leadSettings || typeof leadSettings !== 'object') return;
  writeWorkspaceBackup({ leadSettings });
}

/** Store one integration by provider (IDs change after /tmp resets). */
export function backupIntegration(provider, payload) {
  if (!provider || !payload) return;
  const current = readWorkspaceBackup();
  const prev = current?.integrations?.[provider] || {};

  // Merge secrets — blank fields mean "unchanged", not "clear backup"
  const secrets = { ...(prev.secrets || {}) };
  for (const [k, v] of Object.entries(payload.secrets || {})) {
    if (String(v || '').trim() && v !== '••••••••') secrets[k] = String(v).trim();
  }

  writeWorkspaceBackup({
    integrations: {
      [provider]: {
        enabled: payload.enabled !== undefined ? !!payload.enabled : !!prev.enabled,
        status: payload.status || prev.status || undefined,
        notes: payload.notes !== undefined ? payload.notes : prev.notes,
        is_default:
          payload.is_default !== undefined ? payload.is_default : prev.is_default,
        config:
          payload.config && typeof payload.config === 'object'
            ? { ...(prev.config || {}), ...payload.config }
            : prev.config || {},
        secrets,
      },
    },
  });
}

function userKey(u) {
  return String(u?.username || u?.email || '')
    .toLowerCase()
    .trim();
}

/**
 * Upsert Super Admin users into the browser backup.
 * Pass `password` when creating/editing so rehydrate can recreate logins
 * after a serverless DB wipe.
 */
export function backupUser(user, password) {
  if (!user || !userKey(user)) return;
  if (user.role === 'superadmin' || user.username === 'superadmin') {
    // Super Admin is always seeded — don't store password in the browser
    return;
  }
  const current = readWorkspaceBackup();
  const list = Array.isArray(current?.users) ? [...current.users] : [];
  const key = userKey(user);
  const idx = list.findIndex((u) => userKey(u) === key);
  const prev = idx >= 0 ? list[idx] : {};
  const next = {
    name: user.name || prev.name || '',
    email: String(user.email || prev.email || '').toLowerCase().trim(),
    username: String(user.username || prev.username || '').toLowerCase().trim(),
    role: user.role || prev.role || 'agent',
    active: user.active !== undefined ? !!user.active : prev.active !== false,
    permissions: Array.isArray(user.permissions)
      ? user.permissions.filter((p) => p && p !== '*')
      : prev.permissions || [],
    password:
      password && String(password).trim()
        ? String(password)
        : prev.password || undefined,
  };
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  writeWorkspaceBackup({ users: list });
}

/** Refresh backup metadata from the server list without dropping known passwords. */
export function syncUsersBackup(serverUsers) {
  if (!Array.isArray(serverUsers)) return;
  const current = readWorkspaceBackup();
  const prevByKey = new Map(
    (Array.isArray(current?.users) ? current.users : []).map((u) => [userKey(u), u])
  );
  const next = [];
  for (const user of serverUsers) {
    if (!userKey(user) || user.role === 'superadmin' || user.username === 'superadmin') continue;
    const prev = prevByKey.get(userKey(user)) || {};
    next.push({
      name: user.name || prev.name || '',
      email: String(user.email || '').toLowerCase().trim(),
      username: String(user.username || '').toLowerCase().trim(),
      role: user.role || prev.role || 'agent',
      active: user.active !== undefined ? !!user.active : true,
      permissions: Array.isArray(user.permissions)
        ? user.permissions.filter((p) => p && p !== '*')
        : prev.permissions || [],
      password: prev.password || undefined,
    });
    prevByKey.delete(userKey(user));
  }
  // Keep backed-up users missing from a wiped server so rehydrate can restore them
  for (const leftover of prevByKey.values()) {
    if (leftover?.password || leftover?.email) next.push(leftover);
  }
  writeWorkspaceBackup({ users: next });
}

export function removeUserBackup(usernameOrEmail) {
  const key = String(usernameOrEmail || '')
    .toLowerCase()
    .trim();
  if (!key) return;
  const current = readWorkspaceBackup();
  const list = (Array.isArray(current?.users) ? current.users : []).filter(
    (u) => userKey(u) !== key
  );
  writeWorkspaceBackup({ users: list });
}
