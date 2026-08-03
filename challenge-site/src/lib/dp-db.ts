import pg from 'pg';

const { Pool } = pg;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS dp_admin_user (
  email TEXT PRIMARY KEY,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  added_by TEXT,
  protected BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS dp_site_modal (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  question TEXT,
  video_url TEXT,
  variant TEXT NOT NULL DEFAULT 'info',
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  status TEXT NOT NULL DEFAULT 'draft',
  sites JSONB NOT NULL DEFAULT '["all"]'::jsonb,
  audience TEXT NOT NULL DEFAULT 'public',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS dp_site_modal_updated ON dp_site_modal (updated_at DESC);

CREATE TABLE IF NOT EXISTS dp_blueberry_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  intro_text TEXT NOT NULL DEFAULT '',
  available BOOLEAN NOT NULL DEFAULT true,
  unavailable_message TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO dp_blueberry_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS dp_blueberry (
  id UUID PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'challenge',
  govhub_message_id TEXT,
  govhub_url TEXT,
  dp_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  requires_acceptance BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  available_from TIMESTAMPTZ,
  available_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dp_blueberry_sort ON dp_blueberry (sort_order ASC, created_at ASC);

CREATE TABLE IF NOT EXISTS dp_broadcast_log (
  id UUID PRIMARY KEY,
  subject TEXT NOT NULL,
  html TEXT NOT NULL DEFAULT '',
  text_body TEXT NOT NULL DEFAULT '',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_by TEXT,
  audience_filter JSONB,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  success_count INTEGER NOT NULL DEFAULT 0,
  failure_count INTEGER NOT NULL DEFAULT 0,
  test_mode BOOLEAN NOT NULL DEFAULT false,
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS dp_broadcast_log_sent ON dp_broadcast_log (sent_at DESC);
`;

let pool: pg.Pool | null = null;
let schemaReady: Promise<void> | null = null;

export function dpDatabaseUrl(): string | null {
  const url =
    process.env.DP_DATABASE_URL?.trim() ||
    process.env.DATABASE_URL?.trim() ||
    '';
  return url || null;
}

export function isDpDatabaseConfigured(): boolean {
  return Boolean(dpDatabaseUrl());
}

export function getDpPool(): pg.Pool | null {
  const connectionString = dpDatabaseUrl();
  if (!connectionString) return null;
  if (!pool) {
    pool = new Pool({ connectionString, max: 10 });
  }
  return pool;
}

export async function ensureDpSchema(): Promise<pg.Pool | null> {
  const p = getDpPool();
  if (!p) return null;
  if (!schemaReady) {
    schemaReady = p.query(SCHEMA_SQL).then(() => undefined);
  }
  await schemaReady;
  return p;
}

export async function closeDpPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    schemaReady = null;
  }
}
