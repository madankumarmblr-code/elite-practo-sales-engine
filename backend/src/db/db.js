import Database from 'better-sqlite3';
import path from 'path';
import { getDataDir } from '../config.js';

const dataDir = getDataDir();
const dbPath = path.join(dataDir, 'elite-sales.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    username TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    permissions TEXT NOT NULL DEFAULT '[]',
    active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS system_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    message TEXT NOT NULL,
    detail TEXT DEFAULT '',
    user_id TEXT,
    meta TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    title TEXT,
    tags TEXT DEFAULT '[]',
    notes TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    title TEXT,
    source TEXT DEFAULT 'manual',
    stage TEXT DEFAULT 'new',
    score INTEGER DEFAULT 0,
    value REAL DEFAULT 0,
    status TEXT DEFAULT 'open',
    assigned_to TEXT DEFAULT 'Unassigned',
    last_contacted_at TEXT,
    next_action TEXT,
    notes TEXT DEFAULT '',
    tags TEXT DEFAULT '[]',
    temperature TEXT DEFAULT '',
    preferred_channel TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_leads_updated ON leads(updated_at);

  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    lead_id TEXT,
    contact_id TEXT,
    type TEXT NOT NULL,
    channel TEXT,
    title TEXT NOT NULL,
    detail TEXT DEFAULT '',
    status TEXT DEFAULT 'completed',
    created_at TEXT NOT NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS autopilot_campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    channel TEXT NOT NULL,
    status TEXT DEFAULT 'paused',
    goal TEXT DEFAULT '',
    message_template TEXT DEFAULT '',
    daily_limit INTEGER DEFAULT 50,
    sent_today INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0,
    integration_id TEXT,
    subject TEXT DEFAULT '',
    channel_config TEXT DEFAULT '{}',
    ai_personalize INTEGER DEFAULT 0,
    run_mode TEXT DEFAULT 'live',
    last_run_day TEXT,
    product_pitch TEXT DEFAULT '',
    dialogue_id TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS lead_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS api_integrations (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    category TEXT NOT NULL,
    enabled INTEGER DEFAULT 0,
    status TEXT DEFAULT 'ready',
    config TEXT DEFAULT '{}',
    secrets TEXT DEFAULT '{}',
    last_tested_at TEXT,
    last_test_message TEXT DEFAULT '',
    last_test_ok INTEGER,
    notes TEXT DEFAULT '',
    updated_at TEXT NOT NULL,
    channel TEXT DEFAULT '',
    is_default INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS pipeline_stages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#1DB8A0',
    position INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS outreach_messages (
    id TEXT PRIMARY KEY,
    lead_id TEXT,
    job_id TEXT,
    channel TEXT NOT NULL,
    provider TEXT DEFAULT '',
    direction TEXT DEFAULT 'outbound',
    to_address TEXT DEFAULT '',
    from_address TEXT DEFAULT '',
    body TEXT DEFAULT '',
    status TEXT DEFAULT 'queued',
    provider_message_id TEXT DEFAULT '',
    meta TEXT DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_outreach_created ON outreach_messages(created_at);

  CREATE TABLE IF NOT EXISTS call_logs (
    id TEXT PRIMARY KEY,
    lead_id TEXT,
    job_id TEXT,
    channel TEXT DEFAULT 'calls',
    direction TEXT DEFAULT 'outbound',
    phone TEXT DEFAULT '',
    status TEXT DEFAULT 'queued',
    duration_sec INTEGER DEFAULT 0,
    recording_url TEXT DEFAULT '',
    transcript TEXT DEFAULT '',
    summary TEXT DEFAULT '',
    provider TEXT DEFAULT '',
    meta TEXT DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_call_logs_created ON call_logs(created_at);

  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    link TEXT DEFAULT '',
    is_read INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details TEXT DEFAULT '',
    ip_address TEXT DEFAULT '127.0.0.1',
    user_agent TEXT DEFAULT '',
    status TEXT DEFAULT 'success',
    compliance_tag TEXT DEFAULT 'HIPAA/DPDP',
    old_state TEXT DEFAULT '{}',
    new_state TEXT DEFAULT '{}',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
  CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
  CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
  CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

  CREATE TABLE IF NOT EXISTS compliance_consents (
    id TEXT PRIMARY KEY,
    lead_id TEXT,
    clinic_name TEXT NOT NULL,
    contact_person TEXT,
    channel TEXT NOT NULL,
    consent_status TEXT DEFAULT 'opted_in',
    purpose TEXT DEFAULT 'B2B Sales Communication',
    ip_address TEXT DEFAULT '127.0.0.1',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS scraped_clinics (
    id TEXT PRIMARY KEY,
    clinic_name TEXT NOT NULL,
    city TEXT NOT NULL,
    locality TEXT NOT NULL,
    speciality TEXT NOT NULL,
    address TEXT DEFAULT '',
    on_practo INTEGER DEFAULT 0,
    practo_rating REAL DEFAULT 0,
    practo_reviews INTEGER DEFAULT 0,
    practo_url TEXT DEFAULT '',
    owner_name TEXT DEFAULT '',
    owner_phone TEXT DEFAULT '',
    owner_email TEXT DEFAULT '',
    marketing_name TEXT DEFAULT '',
    marketing_phone TEXT DEFAULT '',
    marketing_email TEXT DEFAULT '',
    reception_phone TEXT DEFAULT '',
    assigned_crm INTEGER DEFAULT 0,
    assigned_type TEXT DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_scraped_city_loc ON scraped_clinics(city, locality);
  CREATE INDEX IF NOT EXISTS idx_scraped_spec ON scraped_clinics(speciality);

  CREATE TABLE IF NOT EXISTS autopilot_queue (
    id TEXT PRIMARY KEY,
    lead_id TEXT,
    clinic_name TEXT NOT NULL,
    city TEXT DEFAULT '',
    locality TEXT DEFAULT '',
    speciality TEXT DEFAULT '',
    phone TEXT NOT NULL,
    email TEXT DEFAULT '',
    owner_name TEXT DEFAULT '',
    marketing_name TEXT DEFAULT '',
    product TEXT DEFAULT 'prime',
    current_stage TEXT DEFAULT 'queued',
    call_attempt_id TEXT,
    call_status TEXT DEFAULT '',
    call_duration INTEGER DEFAULT 0,
    call_transcript TEXT DEFAULT '',
    call_recording_url TEXT DEFAULT '',
    whatsapp_status TEXT DEFAULT '',
    whatsapp_message_id TEXT DEFAULT '',
    whatsapp_text TEXT DEFAULT '',
    email_status TEXT DEFAULT 'pending_review',
    email_subject TEXT DEFAULT '',
    email_body TEXT DEFAULT '',
    approved_by TEXT DEFAULT '',
    approved_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_autopilot_stage ON autopilot_queue(current_stage);
  CREATE INDEX IF NOT EXISTS idx_autopilot_lead ON autopilot_queue(lead_id);

  CREATE TABLE IF NOT EXISTS commercial_proposals (
    id TEXT PRIMARY KEY,
    lead_id TEXT,
    client_name TEXT NOT NULL,
    clinic_name TEXT NOT NULL,
    city TEXT NOT NULL,
    doc_type TEXT DEFAULT 'proposal',
    term_months INTEGER DEFAULT 3,
    prime_config TEXT DEFAULT '{}',
    reach_campaigns TEXT DEFAULT '[]',
    discount_type TEXT DEFAULT 'amount',
    discount_val REAL DEFAULT 0,
    subtotal REAL DEFAULT 0,
    gst_amount REAL DEFAULT 0,
    net_amount REAL DEFAULT 0,
    sender_name TEXT DEFAULT 'Karan Patel',
    sender_phone TEXT DEFAULT '+918071579481',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_proposals_created ON commercial_proposals(created_at);
`);

// username index (safe for existing DBs)
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)
  WHERE username IS NOT NULL AND username != ''
`);

function ensureColumn(table, column, def) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all();
    if (!cols.some((c) => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`);
    }
  } catch { /* ignore */ }
}

ensureColumn('leads', 'tags', "TEXT DEFAULT '[]'");
ensureColumn('leads', 'temperature', "TEXT DEFAULT ''");
ensureColumn('leads', 'preferred_channel', "TEXT DEFAULT ''");
ensureColumn('leads', 'next_action', "TEXT DEFAULT ''");
ensureColumn('leads', 'city', "TEXT DEFAULT ''");
ensureColumn('leads', 'locality', "TEXT DEFAULT ''");
ensureColumn('leads', 'speciality', "TEXT DEFAULT ''");
ensureColumn('leads', 'on_practo', "INTEGER DEFAULT 0");
ensureColumn('leads', 'practo_rating', "REAL DEFAULT 0");
ensureColumn('leads', 'practo_reviews', "INTEGER DEFAULT 0");
ensureColumn('leads', 'practo_url', "TEXT DEFAULT ''");
ensureColumn('leads', 'owner_name', "TEXT DEFAULT ''");
ensureColumn('leads', 'owner_phone', "TEXT DEFAULT ''");
ensureColumn('leads', 'owner_email', "TEXT DEFAULT ''");
ensureColumn('leads', 'marketing_name', "TEXT DEFAULT ''");
ensureColumn('leads', 'marketing_phone', "TEXT DEFAULT ''");
ensureColumn('leads', 'marketing_email', "TEXT DEFAULT ''");
ensureColumn('leads', 'reception_phone', "TEXT DEFAULT ''");
ensureColumn('leads', 'product_interest', "TEXT DEFAULT 'prime'");
ensureColumn('leads', 'workflow_stage', "TEXT DEFAULT 'manual'");

// User-level & SuperAdmin extra settings columns
ensureColumn('users', 'territory', "TEXT DEFAULT '[\"Bangalore\"]'");
ensureColumn('users', 'monthly_quota', "INTEGER DEFAULT 50");
ensureColumn('users', 'daily_call_limit', "INTEGER DEFAULT 100");
ensureColumn('users', 'can_export', "INTEGER DEFAULT 1");
ensureColumn('users', 'can_trigger_autopilot', "INTEGER DEFAULT 1");
ensureColumn('users', 'can_approve_proposals', "INTEGER DEFAULT 0");
ensureColumn('users', 'status', "TEXT DEFAULT 'active'");
ensureColumn('users', 'phone', "TEXT DEFAULT ''");

// Autopilot human interference & retry columns
ensureColumn('autopilot_queue', 'human_interference_required', "INTEGER DEFAULT 0");
ensureColumn('autopilot_queue', 'human_reason', "TEXT DEFAULT ''");
ensureColumn('autopilot_queue', 'retry_count', "INTEGER DEFAULT 0");
ensureColumn('autopilot_queue', 'next_retry_at', "TEXT DEFAULT ''");
ensureColumn('autopilot_queue', 'call_disposition', "TEXT DEFAULT ''");
ensureColumn('autopilot_queue', 'doctor_sentiment', "TEXT DEFAULT ''");
ensureColumn('autopilot_queue', 'interest_score', "INTEGER DEFAULT 0");
ensureColumn('autopilot_queue', 'doctor_intent', "TEXT DEFAULT ''");
ensureColumn('autopilot_queue', 'objections_detected', "TEXT DEFAULT '[]'");
ensureColumn('autopilot_queue', 'proposal_id', "TEXT DEFAULT ''");
ensureColumn('autopilot_queue', 'proposal_amount', "REAL DEFAULT 0");
ensureColumn('autopilot_queue', 'auto_pilot_mode', "TEXT DEFAULT 'full_auto'");

// Voice Agent, Telephony & Dual Sentiment Analysis columns
ensureColumn('call_logs', 'voice_engine', "TEXT DEFAULT 'native'");
ensureColumn('call_logs', 'telephony_provider', "TEXT DEFAULT 'simulator'");
ensureColumn('call_logs', 'agent_type', "TEXT DEFAULT 'ai'");
ensureColumn('call_logs', 'transcription_json', "TEXT DEFAULT '[]'");
ensureColumn('call_logs', 'doctor_sentiment', "TEXT DEFAULT 'neutral'");
ensureColumn('call_logs', 'agent_sentiment', "TEXT DEFAULT 'professional'");
ensureColumn('call_logs', 'sentiment_score', "REAL DEFAULT 0");
ensureColumn('call_logs', 'interest_score', "INTEGER DEFAULT 0");
ensureColumn('call_logs', 'objections_detected', "TEXT DEFAULT '[]'");
ensureColumn('call_logs', 'talk_listen_ratio', "TEXT DEFAULT '50:50'");
ensureColumn('call_logs', 'interruption_count', "INTEGER DEFAULT 0");
ensureColumn('call_logs', 'qa_coaching_notes', "TEXT DEFAULT ''");
ensureColumn('call_logs', 'doctor_intent', "TEXT DEFAULT ''");
ensureColumn('call_logs', 'audio_url', "TEXT DEFAULT ''");

export default db;
