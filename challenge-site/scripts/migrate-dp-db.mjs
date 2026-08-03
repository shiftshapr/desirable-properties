#!/usr/bin/env node
/**
 * Apply DP challenge-site Postgres schema (idempotent).
 * Requires DP_DATABASE_URL or DATABASE_URL.
 *
 * Usage: node scripts/migrate-dp-db.mjs
 */
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvLocal() {
  const file = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(idx + 1).trim();
  }
}

loadEnvLocal();

const connectionString =
  process.env.DP_DATABASE_URL?.trim() || process.env.DATABASE_URL?.trim() || '';

if (!connectionString) {
  console.error('DP_DATABASE_URL or DATABASE_URL is required.');
  process.exit(1);
}

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

async function main() {
  const pool = new pg.Pool({ connectionString });
  await pool.query(SCHEMA_SQL);

  const counts = {};
  for (const table of [
    'dp_admin_user',
    'dp_site_modal',
    'dp_blueberry',
    'dp_broadcast_log',
  ]) {
    const r = await pool.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
    counts[table] = r.rows[0]?.n ?? 0;
  }

  console.log('[migrate-dp-db] schema applied', counts);
  await pool.end();
}

main().catch((err) => {
  console.error('[migrate-dp-db] failed', err);
  process.exit(1);
});
