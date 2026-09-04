import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import db from './db.js';
import { permissionsForRole } from '../auth/roles.js';

const now = () => new Date().toISOString();

const CORE_INTEGRATIONS = [
  {
    provider: 'sarvam_voice',
    label: 'Sarvam Voice Agents',
    category: 'Voice AI',
    channel: 'voice_ai',
    notes: 'Indus Samvaad Voice Agents for outbound healthcare campaigns',
    config: {
      orgId: '01a050ff-9cdc-7d60-8c27-eaf6731df818',
      workspaceId: '01a050ff-9ce4-74ef-980d-b167c2e3489c',
      appId: process.env.SARVAM_AGENT_APP_ID || '',
      appVersion: 1,
      connectionId: process.env.SARVAM_CONNECTION_ID || '',
      agentPhoneNumber: process.env.SARVAM_AGENT_PHONE_NUMBER || '',
      webhookUrl: process.env.SARVAM_WEBHOOK_URL || '',
    },
    secrets: { apiKey: process.env.SARVAM_VOICE_API_KEY || '' },
    is_default: 1,
  },
  {
    provider: 'meta_whatsapp',
    label: 'Meta WhatsApp Cloud API',
    category: 'Messaging',
    channel: 'whatsapp',
    notes: 'Official Meta WhatsApp Business Cloud API for doctor outreach',
    config: {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      wabaId: process.env.WHATSAPP_WABA_ID || '',
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'elite_wa_verify_token_2026',
    },
    secrets: { accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '', appSecret: '' },
    is_default: 1,
  },
  {
    provider: 'meta_llama',
    label: 'Meta Llama AI',
    category: 'AI Intelligence',
    channel: 'ai',
    notes: 'Meta Llama API for AI sales pitch generation and smart channel selection',
    config: {},
    secrets: { apiKey: process.env.META_LLAMA_API_KEY || '' },
    is_default: 1,
  },
  {
    provider: 'google_maps',
    label: 'Google Maps / Places',
    category: 'Discovery',
    channel: 'discovery',
    notes: 'Places enrichment for Lead Discovery',
    config: {},
    secrets: { apiKey: process.env.GOOGLE_MAPS_API_KEY || '' },
    is_default: 1,
  },
  {
    provider: 'google_sheets',
    label: 'Google Sheets (CSV Sync)',
    category: 'Data',
    channel: 'data',
    notes: 'Google Sheets inventory sync via public CSV URL',
    config: { csvUrl: process.env.SHEET_CSV_URL || '' },
    secrets: {},
    is_default: 1,
  },
];

function ensureCoreIntegrations() {
  const ts = now();
  const insertStmt = db.prepare(`
    INSERT INTO api_integrations (
      id, provider, label, category, enabled, status, config, secrets, last_tested_at, notes, updated_at, channel, is_default
    ) VALUES (?, ?, ?, ?, 0, 'ready', ?, ?, NULL, ?, ?, ?, ?)
  `);
  const updateMeta = db.prepare(`
    UPDATE api_integrations SET label=?, category=?, channel=?, is_default=?, notes=COALESCE(NULLIF(notes,''),?), updated_at=? WHERE provider=?
  `);

  for (const p of CORE_INTEGRATIONS) {
    const existing = db.prepare('SELECT id, secrets, config FROM api_integrations WHERE provider = ?').get(p.provider);
    if (existing) {
      updateMeta.run(p.label, p.category, p.channel, p.is_default ? 1 : 0, p.notes, ts, p.provider);
      // Hydrate env secrets if DB row is empty
      const curSecrets = JSON.parse(existing.secrets || '{}');
      const envSecrets = p.secrets || {};
      let changed = false;
      const next = { ...curSecrets };
      for (const [k, v] of Object.entries(envSecrets)) {
        if (v && !String(curSecrets[k] || '').trim()) { next[k] = v; changed = true; }
      }
      if (changed) {
        const curConfig = JSON.parse(existing.config || '{}');
        const envConfig = p.config || {};
        const nextConfig = { ...curConfig };
        for (const [k, v] of Object.entries(envConfig)) {
          if (v !== undefined && v !== null && v !== '' && !String(curConfig[k] || '').trim()) nextConfig[k] = v;
        }
        const hasAnySecret = Object.values(next).some(Boolean);
        db.prepare(`UPDATE api_integrations SET secrets=?, config=?, enabled=CASE WHEN ? = 1 THEN 1 ELSE enabled END, updated_at=? WHERE provider=?`)
          .run(JSON.stringify(next), JSON.stringify(nextConfig), hasAnySecret ? 1 : 0, ts, p.provider);
      }
      continue;
    }
    const hasAnySecret = Object.values(p.secrets || {}).some(Boolean);
    insertStmt.run(
      nanoid(), p.provider, p.label, p.category,
      JSON.stringify(p.config || {}), JSON.stringify(p.secrets || {}),
      p.notes, ts, p.channel, p.is_default ? 1 : 0
    );
    if (hasAnySecret) {
      db.prepare(`UPDATE api_integrations SET enabled=1, status='connected', updated_at=? WHERE provider=?`).run(ts, p.provider);
    }
  }
}

function ensurePipelineStages() {
  const count = db.prepare('SELECT COUNT(*) as c FROM pipeline_stages').get().c;
  if (count > 0) return;
  const stages = [
    { name: 'New', slug: 'new', color: '#5B8DEF', position: 0 },
    { name: 'Contacted', slug: 'contacted', color: '#1DB8A0', position: 1 },
    { name: 'Qualified', slug: 'qualified', color: '#E8A838', position: 2 },
    { name: 'Proposal', slug: 'proposal', color: '#C45C26', position: 3 },
    { name: 'Won', slug: 'won', color: '#2F9E44', position: 4 },
    { name: 'Lost', slug: 'lost', color: '#868E96', position: 5 },
  ];
  const insert = db.prepare('INSERT INTO pipeline_stages (id, name, slug, color, position) VALUES (?, ?, ?, ?, ?)');
  for (const s of stages) insert.run(nanoid(), s.name, s.slug, s.color, s.position);
}

export function bootstrap() {
  ensurePipelineStages();
  ensureCoreIntegrations();

  const ts = now();

  // Super Admin
  let superAdmin = db.prepare("SELECT * FROM users WHERE role = 'superadmin' LIMIT 1").get()
    || db.prepare("SELECT * FROM users WHERE lower(username) = 'superadmin' LIMIT 1").get();

  const saPassword = bcrypt.hashSync('SuperAdmin@123', 10);
  if (!superAdmin) {
    db.prepare(`
      INSERT INTO users (id, name, email, username, password_hash, role, permissions, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'superadmin', ?, 1, ?, ?)
    `).run('user_superadmin', 'Super Admin', 'superadmin@elite.sales', 'superadmin', saPassword, JSON.stringify(permissionsForRole('superadmin')), ts, ts);
    console.log('✅ Created Super Admin user');
  } else {
    db.prepare(`UPDATE users SET password_hash=?, role='superadmin', active=1, updated_at=? WHERE id=?`).run(saPassword, ts, superAdmin.id);
  }

  // Karan user
  const karanPassword = bcrypt.hashSync('admin123', 10);
  const karanUser = db.prepare("SELECT * FROM users WHERE lower(username) = 'karan' LIMIT 1").get();
  if (!karanUser) {
    db.prepare(`
      INSERT INTO users (id, name, email, username, password_hash, role, permissions, active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'superadmin', ?, 1, ?, ?)
    `).run('user_karan', 'Karan Patel', 'karan@elite.sales', 'karan', karanPassword, JSON.stringify(permissionsForRole('superadmin')), ts, ts);
    console.log('✅ Created Karan user (karan / admin123)');
  } else {
    db.prepare(`UPDATE users SET password_hash=?, role='superadmin', active=1, updated_at=? WHERE id=?`).run(karanPassword, ts, karanUser.id);
  }

  console.log('\n🚀 Elite Practo Sales AI — Ready!');
  console.log('   User: karan        | Password: admin123');
  console.log('   User: superadmin   | Password: SuperAdmin@123\n');
}

// Run seed if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  bootstrap();
  process.exit(0);
}
