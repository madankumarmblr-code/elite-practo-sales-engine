import db from '../db/db.js';
import { requirePermission } from '../auth/middleware.js';
import { persistDurableDbNow, durableStoreConfigured } from '../services/dbSnapshot.js';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { ROLES, permissionsForRole } from '../auth/roles.js';

const now = () => new Date().toISOString();

/**
 * Re-apply Settings / Lead Settings / API Integration credentials / users that
 * the browser kept while Vercel /tmp SQLite was reset.
 */
export function registerWorkspaceRoutes(app) {
  app.post(
    '/api/workspace/rehydrate',
    requirePermission(
      'settings:write',
      'lead_settings:write',
      'api_integrations:write',
      'users:write'
    ),
    async (req, res) => {
      const body = req.body || {};
      const applied = {
        settings: false,
        leadSettings: false,
        integrations: 0,
        users: 0,
        durableStore: durableStoreConfigured(),
      };

      const tx = db.transaction(() => {
        if (body.settings && typeof body.settings === 'object') {
          const upsert = db.prepare(
            'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)'
          );
          for (const [key, value] of Object.entries(body.settings)) {
            upsert.run(key, typeof value === 'string' ? value : JSON.stringify(value));
          }
          applied.settings = true;
        }

        if (body.leadSettings && typeof body.leadSettings === 'object') {
          const upsert = db.prepare(
            'INSERT OR REPLACE INTO lead_settings (key, value) VALUES (?, ?)'
          );
          for (const [key, value] of Object.entries(body.leadSettings)) {
            upsert.run(key, typeof value === 'string' ? value : JSON.stringify(value));
          }
          applied.leadSettings = true;
        }

        const integrations = body.integrations;
        if (integrations && typeof integrations === 'object') {
          const select = db.prepare('SELECT * FROM api_integrations WHERE provider = ?');
          const update = db.prepare(`
            UPDATE api_integrations
            SET enabled=?, status=?, config=?, secrets=?, notes=?, is_default=?, updated_at=?
            WHERE id=?
          `);
          const clearDefaults = db.prepare(
            'UPDATE api_integrations SET is_default = 0, updated_at = ? WHERE channel = ? AND id != ?'
          );

          for (const [provider, patch] of Object.entries(integrations)) {
            if (!patch || typeof patch !== 'object') continue;
            const existing = select.get(provider);
            if (!existing) continue;

            let currentSecrets = {};
            let currentConfig = {};
            try {
              currentSecrets = JSON.parse(existing.secrets || '{}');
            } catch {
              currentSecrets = {};
            }
            try {
              currentConfig = JSON.parse(existing.config || '{}');
            } catch {
              currentConfig = {};
            }

            const nextSecrets = { ...currentSecrets };
            if (patch.secrets && typeof patch.secrets === 'object') {
              for (const [k, v] of Object.entries(patch.secrets)) {
                if (v && v !== '••••••••') nextSecrets[k] = v;
              }
            }

            const nextConfig =
              patch.config && typeof patch.config === 'object'
                ? { ...currentConfig, ...patch.config }
                : currentConfig;

            const nextEnabled =
              patch.enabled !== undefined ? (patch.enabled ? 1 : 0) : existing.enabled;
            let nextStatus = patch.status ?? existing.status;
            const hasSecrets = Object.values(nextSecrets).some(Boolean);
            if (!hasSecrets && (nextStatus === 'connected' || nextStatus === 'error')) {
              nextStatus = 'ready';
            } else if (hasSecrets && nextStatus === 'ready' && patch.status === 'connected') {
              nextStatus = 'connected';
            }

            const nextDefault =
              patch.is_default !== undefined
                ? patch.is_default
                  ? 1
                  : 0
                : existing.is_default || 0;
            if (nextDefault && existing.channel) {
              clearDefaults.run(now(), existing.channel, existing.id);
            }

            update.run(
              nextEnabled,
              nextStatus,
              JSON.stringify(nextConfig),
              JSON.stringify(nextSecrets),
              patch.notes !== undefined ? patch.notes : existing.notes,
              nextDefault,
              now(),
              existing.id
            );
            applied.integrations += 1;
          }
        }

        // Restore Super Admin–created users after /tmp wipe
        if (Array.isArray(body.users)) {
          const byEmail = db.prepare('SELECT * FROM users WHERE lower(email) = ?');
          const byUsername = db.prepare('SELECT * FROM users WHERE lower(username) = ?');
          const insert = db.prepare(`
            INSERT INTO users (id, name, email, username, password_hash, role, permissions, active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          const update = db.prepare(`
            UPDATE users
            SET name=?, email=?, username=?, role=?, permissions=?, active=?, updated_at=?
            WHERE id=?
          `);
          const updatePassword = db.prepare(
            'UPDATE users SET password_hash=?, updated_at=? WHERE id=?'
          );

          for (const raw of body.users) {
            if (!raw || typeof raw !== 'object') continue;
            const email = String(raw.email || '')
              .toLowerCase()
              .trim();
            const username = String(raw.username || email.split('@')[0] || '')
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9._-]/g, '');
            if (!email || !username) continue;
            if (raw.role === 'superadmin' || username === 'superadmin') continue;

            const role = ROLES[raw.role] ? raw.role : 'agent';
            const perms =
              Array.isArray(raw.permissions) && raw.permissions.length
                ? raw.permissions.filter((p) => p && p !== '*')
                : permissionsForRole(role);
            const active = raw.active === false ? 0 : 1;
            const name = String(raw.name || username).trim() || username;
            const ts = now();

            const existing = byEmail.get(email) || byUsername.get(username) || null;

            if (existing) {
              if (existing.role === 'superadmin') continue;
              update.run(
                name,
                email,
                username,
                role,
                JSON.stringify(perms),
                active,
                ts,
                existing.id
              );
              if (raw.password && String(raw.password).trim()) {
                updatePassword.run(bcrypt.hashSync(String(raw.password), 10), ts, existing.id);
              }
              applied.users += 1;
            } else {
              if (!raw.password || !String(raw.password).trim()) {
                // Cannot create a login without a password — skip until next save with password
                continue;
              }
              insert.run(
                nanoid(),
                name,
                email,
                username,
                bcrypt.hashSync(String(raw.password), 10),
                role,
                JSON.stringify(perms),
                active,
                ts,
                ts
              );
              applied.users += 1;
            }
          }
        }
      });

      tx();
      await persistDurableDbNow();
      res.json({ ok: true, applied });
    }
  );
}
