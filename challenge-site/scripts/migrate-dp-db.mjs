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

CREATE TABLE IF NOT EXISTS dp_support_ticket (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'open',
  subject TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  urgency TEXT NOT NULL DEFAULT 'non_blocking',
  category TEXT NOT NULL DEFAULT 'general',
  screenshot_acknowledged BOOLEAN NOT NULL DEFAULT false,
  user_id TEXT,
  email TEXT,
  handle TEXT,
  page_url TEXT,
  browser TEXT,
  os TEXT,
  canopi_mode TEXT,
  steps_to_reproduce TEXT,
  expected_behavior TEXT,
  actual_behavior TEXT,
  tried_already TEXT,
  diagnostic_bundle JSONB,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  has_screenshots BOOLEAN NOT NULL DEFAULT false,
  related_ticket_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  source TEXT NOT NULL DEFAULT 'dp_challenge',
  agent_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  draft_reply JSONB NOT NULL DEFAULT '{}'::jsonb,
  proposed_resolution TEXT,
  resolution TEXT,
  escalated_to_human BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS dp_support_ticket_queue ON dp_support_ticket (status, urgency, created_at ASC);
CREATE INDEX IF NOT EXISTS dp_support_ticket_user ON dp_support_ticket (user_id);
CREATE INDEX IF NOT EXISTS dp_support_ticket_updated ON dp_support_ticket (updated_at DESC);
`;

async function importSupportTickets(pool, dataDir) {
  const dir = path.join(dataDir, 'support-tickets');
  if (!fs.existsSync(dir)) return { imported: 0, skipped: 0 };

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  let imported = 0;
  let skipped = 0;

  for (const file of files) {
    const fp = path.join(dir, file);
    let ticket;
    try {
      ticket = JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch {
      skipped += 1;
      continue;
    }

    const exists = await pool.query('SELECT id FROM dp_support_ticket WHERE id = $1', [ticket.id]);
    if (exists.rowCount) {
      skipped += 1;
      continue;
    }

    await pool.query(
      `INSERT INTO dp_support_ticket (
         id, created_at, updated_at, status, subject, body, urgency, category,
         screenshot_acknowledged, user_id, email, handle, page_url, browser, os,
         canopi_mode, steps_to_reproduce, expected_behavior, actual_behavior,
         tried_already, diagnostic_bundle, attachments, has_screenshots,
         related_ticket_ids, source, agent_notes, draft_reply, proposed_resolution,
         resolution, escalated_to_human
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
         $21::jsonb,$22::jsonb,$23,$24::jsonb,$25,$26::jsonb,$27::jsonb,$28,$29,$30
       )`,
      [
        ticket.id,
        ticket.createdAt,
        ticket.updatedAt,
        ticket.status || 'open',
        ticket.subject || '',
        ticket.body || '',
        ticket.urgency || 'non_blocking',
        ticket.category || 'general',
        Boolean(ticket.screenshotAcknowledged),
        ticket.userId || null,
        ticket.email || null,
        ticket.handle || null,
        ticket.pageUrl || null,
        ticket.browser || null,
        ticket.os || null,
        ticket.canopiMode || null,
        ticket.stepsToReproduce || null,
        ticket.expectedBehavior || null,
        ticket.actualBehavior || null,
        ticket.triedAlready || null,
        ticket.diagnosticBundle ? JSON.stringify(ticket.diagnosticBundle) : null,
        JSON.stringify(ticket.attachments || []),
        Boolean(ticket.hasScreenshots),
        JSON.stringify(ticket.relatedTicketIds || []),
        ticket.source || 'dp_challenge',
        JSON.stringify(ticket.agentNotes || []),
        JSON.stringify(ticket.draftReply || {}),
        ticket.proposedResolution || null,
        ticket.resolution || null,
        ticket.escalatedToHuman != null ? Boolean(ticket.escalatedToHuman) : ticket.urgency === 'critical',
      ],
    );
    imported += 1;
  }

  return { imported, skipped };
}

async function main() {
  const pool = new pg.Pool({ connectionString });
  await pool.query(SCHEMA_SQL);

  const dataDir = path.join(__dirname, '..', 'data');
  const ticketImport = await importSupportTickets(pool, dataDir);

  const counts = {};
  for (const table of [
    'dp_admin_user',
    'dp_site_modal',
    'dp_blueberry',
    'dp_broadcast_log',
    'dp_support_ticket',
  ]) {
    const r = await pool.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
    counts[table] = r.rows[0]?.n ?? 0;
  }

  console.log('[migrate-dp-db] schema applied', counts);
  if (ticketImport.imported || ticketImport.skipped) {
    console.log('[migrate-dp-db] support ticket import', ticketImport);
  }
  await pool.end();
}

main().catch((err) => {
  console.error('[migrate-dp-db] failed', err);
  process.exit(1);
});
