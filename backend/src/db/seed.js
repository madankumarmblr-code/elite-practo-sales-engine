import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import db from './db.js';
import { permissionsForRole } from '../auth/roles.js';

const now = () => new Date().toISOString();

/** Minimal connectors still used by Lead Generator (Maps / Practo.com). */
const CORE_INTEGRATIONS = [
  {
    provider: 'google_maps',
    label: 'Google Maps / Places',
    category: 'Discovery',
    channel: 'discovery',
    notes: 'Optional Places enrichment for Lead Generator',
    config: {},
    secrets: { apiKey: '' },
    is_default: 1,
  },
  {
    provider: 'practo',
    label: 'Practo.com',
    category: 'Discovery',
    channel: 'discovery',
    notes: 'Public Practo.com listing discovery (no partner API key)',
    config: { mode: 'website' },
    secrets: {},
    is_default: 1,
  },
];

function ensureCoreIntegrations() {
  const ts = now();
  const insert = db.prepare(`
    INSERT INTO api_integrations (
      id, provider, label, category, enabled, status, config, secrets, last_tested_at, notes, updated_at, channel, is_default
    ) VALUES (?, ?, ?, ?, 0, 'ready', ?, ?, NULL, ?, ?, ?, ?)
  `);
  const updateMeta = db.prepare(`
    UPDATE api_integrations
    SET label = ?, category = ?, channel = ?, is_default = ?, notes = COALESCE(NULLIF(notes, ''), ?), updated_at = ?
    WHERE provider = ?
  `);

  for (const p of CORE_INTEGRATIONS) {
    const existing = db.prepare('SELECT id FROM api_integrations WHERE provider = ?').get(p.provider);
    if (existing) {
      updateMeta.run(p.label, p.category, p.channel, p.is_default ? 1 : 0, p.notes, ts, p.provider);
      continue;
    }
    insert.run(
      nanoid(),
      p.provider,
      p.label,
      p.category,
      JSON.stringify(p.config || {}),
      JSON.stringify(p.secrets || {}),
      p.notes,
      ts,
      p.channel,
      p.is_default ? 1 : 0
    );
  }
}

function hydrateEnvSecrets() {
  const force = process.env.INTEGRATION_SECRETS_FORCE === '1';
  const map = [
    { provider: 'google_maps', secret: 'apiKey', env: 'GOOGLE_MAPS_API_KEY' },
  ];

  const byProvider = new Map();
  for (const row of map) {
    const value = String(process.env[row.env] || '').trim();
    if (!value) continue;
    if (!byProvider.has(row.provider)) byProvider.set(row.provider, {});
    byProvider.get(row.provider)[row.secret] = value;
  }

  try {
    const raw = process.env.INTEGRATION_SECRETS_JSON;
    if (raw) {
      const parsed = JSON.parse(raw);
      for (const [provider, secrets] of Object.entries(parsed || {})) {
        if (!secrets || typeof secrets !== 'object') continue;
        if (!byProvider.has(provider)) byProvider.set(provider, {});
        Object.assign(byProvider.get(provider), secrets);
      }
    }
  } catch (err) {
    console.warn('INTEGRATION_SECRETS_JSON parse failed:', err.message);
  }

  const update = db.prepare(
    'UPDATE api_integrations SET secrets = ?, enabled = CASE WHEN ? = 1 THEN 1 ELSE enabled END, updated_at = ? WHERE provider = ?'
  );
  const ts = now();
  let applied = 0;
  for (const [provider, incoming] of byProvider.entries()) {
    const row = db.prepare('SELECT secrets FROM api_integrations WHERE provider = ?').get(provider);
    if (!row) continue;
    let current = {};
    try {
      current = JSON.parse(row.secrets || '{}');
    } catch {
      current = {};
    }
    let changed = false;
    const next = { ...current };
    for (const [k, v] of Object.entries(incoming)) {
      if (!v) continue;
      if (force || !String(current[k] || '').trim()) {
        if (next[k] !== v) {
          next[k] = v;
          changed = true;
        }
      }
    }
    if (!changed) continue;
    const enable = Object.values(next).some(Boolean) ? 1 : 0;
    update.run(JSON.stringify(next), enable, ts, provider);
    applied += 1;
  }
  if (applied) {
    console.log(`Hydrated ${applied} integration(s) from environment secrets`);
  }
}

/** Remove synthetic / demo inventory leads left from older builds. */
function purgeSyntheticLeads() {
  try {
    const del = db.prepare(`
      DELETE FROM leads
      WHERE lower(coalesce(source, '')) LIKE '%sheet + locality%'
         OR lower(coalesce(source, '')) LIKE '%locality reference%'
         OR lower(coalesce(notes, '')) LIKE '%discovery source: sheet_locality%'
         OR lower(coalesce(notes, '')) LIKE '%zone locality expansion:%'
    `);
    const info = del.run();
    if (info.changes) {
      console.log(`Purged ${info.changes} synthetic/demo lead(s)`);
    }
  } catch (err) {
    console.warn('Synthetic lead purge skipped:', err.message);
  }
}

/**
 * Bootstrap — Super Admin + discovery connectors for Lead Generator / Commercial Suite.
 */
export function bootstrap() {
  const stageCount = db.prepare('SELECT COUNT(*) as c FROM pipeline_stages').get().c;
  if (stageCount === 0) {
    const stages = [
      { name: 'New', slug: 'new', color: '#5B8DEF', position: 0 },
      { name: 'Contacted', slug: 'contacted', color: '#1DB8A0', position: 1 },
      { name: 'Qualified', slug: 'qualified', color: '#E8A838', position: 2 },
      { name: 'Proposal', slug: 'proposal', color: '#C45C26', position: 3 },
      { name: 'Won', slug: 'won', color: '#2F9E44', position: 4 },
      { name: 'Lost', slug: 'lost', color: '#868E96', position: 5 },
    ];
    const insert = db.prepare(
      'INSERT INTO pipeline_stages (id, name, slug, color, position) VALUES (?, ?, ?, ?, ?)'
    );
    for (const s of stages) insert.run(nanoid(), s.name, s.slug, s.color, s.position);
  }

  ensureCoreIntegrations();
  hydrateEnvSecrets();
  purgeSyntheticLeads();

  const ts = now();
  const demoPassword = 'SuperAdmin@123';
  const passwordHash = bcrypt.hashSync(demoPassword, 10);
  const superAdmin =
    db.prepare("SELECT * FROM users WHERE role = 'superadmin' LIMIT 1").get() ||
    db.prepare("SELECT * FROM users WHERE lower(username) = 'superadmin' LIMIT 1").get();

  if (!superAdmin) {
    const id = 'user_superadmin';
    db.prepare(`
      INSERT INTO users (id, name, email, username, password_hash, role, permissions, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'superadmin', ?, 1, ?, ?)
    `).run(
      id,
      'Super Admin',
      'superadmin@practo.sales',
      'superadmin',
      passwordHash,
      JSON.stringify(permissionsForRole('superadmin')),
      ts,
      ts
    );
    console.log('Created Super Admin user');
  } else {
    db.prepare(`
      UPDATE users
      SET role = 'superadmin',
          username = 'superadmin',
          email = 'superadmin@practo.sales',
          password_hash = ?,
          permissions = ?,
          active = 1,
          updated_at = ?
      WHERE id = ?
    `).run(passwordHash, JSON.stringify(permissionsForRole('superadmin')), ts, superAdmin.id);
  }

  console.log('Super Admin ready');
  console.log('  User ID:  superadmin');
  console.log('  Email:    superadmin@practo.sales');
  console.log(`  Password: ${demoPassword}`);
  console.log('Bootstrap complete — Lead Generator + Commercial Suite');
}

bootstrap();
