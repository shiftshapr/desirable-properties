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

ALTER TABLE dp_broadcast_log ADD COLUMN IF NOT EXISTS font_id TEXT NOT NULL DEFAULT 'default';
ALTER TABLE dp_broadcast_log ADD COLUMN IF NOT EXISTS available_in_archive BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS dp_broadcast_log_archive ON dp_broadcast_log (sent_at DESC) WHERE available_in_archive = true;

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

ALTER TABLE dp_support_ticket ADD COLUMN IF NOT EXISTS blueberry_award JSONB;

CREATE TABLE IF NOT EXISTS dp_broadcast_preference (
  user_id TEXT PRIMARY KEY,
  email TEXT,
  do_not_send BOOLEAN NOT NULL DEFAULT false,
  unsubscribe_token TEXT UNIQUE,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dp_broadcast_preference_token ON dp_broadcast_preference (unsubscribe_token);

CREATE TABLE IF NOT EXISTS dp_broadcast_unsubscribe (
  token TEXT PRIMARY KEY,
  user_id TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dp_invite_global_event (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  event_date TIMESTAMPTZ,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS dp_invite_global_event_sort ON dp_invite_global_event (sort_order ASC, updated_at DESC);

CREATE TABLE IF NOT EXISTS dp_invite_perspective (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  slug TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS dp_invite_perspective_slug ON dp_invite_perspective (slug);
CREATE INDEX IF NOT EXISTS dp_invite_perspective_sort ON dp_invite_perspective (sort_order ASC, updated_at DESC);

CREATE TABLE IF NOT EXISTS dp_event_series (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description_md TEXT,
  hero_image_url TEXT,
  perspective_url TEXT,
  pathway_url TEXT,
  sessions_required_count INTEGER,
  series_type TEXT NOT NULL DEFAULT 'series',
  badge_code TEXT,
  pearl_badge_code TEXT,
  badge_image_url TEXT,
  badge_mint_preview_url TEXT,
  pearl_badge_image_url TEXT,
  pearl_badge_mint_preview_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  updated_by TEXT
);

CREATE INDEX IF NOT EXISTS dp_event_series_sort ON dp_event_series (sort_order ASC, updated_at DESC);

CREATE TABLE IF NOT EXISTS dp_event_series_session (
  id UUID PRIMARY KEY,
  series_id UUID NOT NULL REFERENCES dp_event_series(id) ON DELETE CASCADE,
  session_number INTEGER NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  image_url TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  live_url TEXT,
  facilitator_blurb_md TEXT,
  perspective_section_anchor TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (series_id, session_number),
  UNIQUE (series_id, slug)
);

CREATE INDEX IF NOT EXISTS dp_event_series_session_series ON dp_event_series_session (series_id, sort_order ASC);

ALTER TABLE dp_event_series ADD COLUMN IF NOT EXISTS series_type TEXT NOT NULL DEFAULT 'series';
ALTER TABLE dp_event_series ALTER COLUMN badge_code DROP NOT NULL;

ALTER TABLE dp_event_series_session ADD COLUMN IF NOT EXISTS recording_url TEXT;

CREATE TABLE IF NOT EXISTS dp_event_series_pre_read (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES dp_event_series_session(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  minutes_estimate INTEGER
);

ALTER TABLE dp_event_series_pre_read ADD COLUMN IF NOT EXISTS minutes_estimate INTEGER;
ALTER TABLE dp_event_series_pre_read ADD COLUMN IF NOT EXISTS optional BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS dp_event_series_session_dp (
  session_id UUID NOT NULL REFERENCES dp_event_series_session(id) ON DELETE CASCADE,
  dp_id TEXT NOT NULL,
  PRIMARY KEY (session_id, dp_id)
);

CREATE TABLE IF NOT EXISTS dp_event_series_question_section (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES dp_event_series_session(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  title TEXT NOT NULL,
  pearl_stage TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (session_id, section_key)
);

CREATE TABLE IF NOT EXISTS dp_event_series_question (
  id UUID PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES dp_event_series_question_section(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  help_text TEXT,
  field_type TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT false,
  ai_assist BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  min_length INTEGER,
  UNIQUE (section_id, field_key)
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dp_event_series_question'
      AND column_name = 'max_length'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dp_event_series_question'
      AND column_name = 'min_length'
  ) THEN
    ALTER TABLE dp_event_series_question RENAME COLUMN max_length TO min_length;
  END IF;
END $$;

ALTER TABLE dp_event_series_question ADD COLUMN IF NOT EXISTS min_length INTEGER;

CREATE TABLE IF NOT EXISTS dp_event_series_response (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES dp_event_series_session(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_email TEXT,
  attended_confirmed BOOLEAN NOT NULL DEFAULT false,
  ai_assist_used BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

ALTER TABLE dp_event_series_response ADD COLUMN IF NOT EXISTS ai_assist_used BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS dp_event_series_response_user ON dp_event_series_response (user_id);

CREATE TABLE IF NOT EXISTS dp_event_series_answer (
  id UUID PRIMARY KEY,
  response_id UUID NOT NULL REFERENCES dp_event_series_response(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES dp_event_series_question(id) ON DELETE CASCADE,
  value_text TEXT,
  value_bool BOOLEAN,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (response_id, question_id)
);

CREATE TABLE IF NOT EXISTS dp_event_series_pearl (
  id UUID PRIMARY KEY,
  series_id UUID NOT NULL REFERENCES dp_event_series(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_email TEXT,
  patch_idea TEXT,
  socialize_url TEXT,
  socialize_note TEXT,
  feedback_summary TEXT,
  feedback_from TEXT,
  patch_verified BOOLEAN NOT NULL DEFAULT false,
  patch_verified_at TIMESTAMPTZ,
  patch_verified_source TEXT,
  patch_govhub_proposal_id TEXT,
  patch_canopi_message_id TEXT,
  patch_verified_href TEXT,
  patch_last_checked_at TIMESTAMPTZ,
  reflection TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (series_id, user_id)
);

CREATE TABLE IF NOT EXISTS dp_event_series_badge_grant (
  id UUID PRIMARY KEY,
  series_id UUID NOT NULL REFERENCES dp_event_series(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  badge_code TEXT NOT NULL,
  grant_type TEXT NOT NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  UNIQUE (series_id, user_id, badge_code)
);

CREATE TABLE IF NOT EXISTS dp_event_series_patch_lookup (
  id UUID PRIMARY KEY,
  pearl_id UUID NOT NULL REFERENCES dp_event_series_pearl(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  external_id TEXT NOT NULL,
  href TEXT,
  snippet TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (pearl_id, source, external_id)
);

CREATE TABLE IF NOT EXISTS dp_hermes_workgroup_settings (
  workgroup_id TEXT PRIMARY KEY,
  confidence_threshold REAL NOT NULL DEFAULT 0.8,
  allowed_modes JSONB NOT NULL DEFAULT '["observer","facilitator"]'::jsonb,
  cooldown_minutes INTEGER NOT NULL DEFAULT 15,
  devils_advocate_mode TEXT NOT NULL DEFAULT 'request_only',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS dp_hermes_hand (
  id UUID PRIMARY KEY,
  workgroup_id TEXT NOT NULL,
  trigger_message_id TEXT NOT NULL,
  trigger_message_body TEXT NOT NULL DEFAULT '',
  trigger_author_user_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'raised',
  confidence REAL NOT NULL DEFAULT 0,
  teaser TEXT NOT NULL DEFAULT '',
  full_reply TEXT,
  requested_explicitly BOOLEAN NOT NULL DEFAULT false,
  visibility TEXT NOT NULL DEFAULT 'private',
  owner_user_id TEXT NOT NULL,
  shared_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  opened_at TIMESTAMPTZ,
  shared_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS dp_hermes_hand_workgroup ON dp_hermes_hand (workgroup_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dp_hermes_hand_owner ON dp_hermes_hand (owner_user_id, workgroup_id, status);
CREATE INDEX IF NOT EXISTS dp_hermes_hand_message ON dp_hermes_hand (workgroup_id, trigger_message_id);

CREATE TABLE IF NOT EXISTS dp_workgroup_message_share (
  id UUID PRIMARY KEY,
  workgroup_id TEXT NOT NULL,
  anchor_message_id TEXT NOT NULL,
  sharer_user_id TEXT NOT NULL,
  recipient_user_id TEXT NOT NULL,
  sendee_role TEXT NOT NULL DEFAULT 'watcher',
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dp_wg_share_workgroup ON dp_workgroup_message_share (workgroup_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dp_wg_share_recipient ON dp_workgroup_message_share (recipient_user_id, workgroup_id, status);

CREATE TABLE IF NOT EXISTS hermes_onboard_session (
  slug TEXT PRIMARY KEY,
  confirmed JSONB NOT NULL DEFAULT '{}'::jsonb,
  consent JSONB NOT NULL DEFAULT '{}'::jsonb,
  briefing JSONB,
  next_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  pinned_move_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  dismissed_move_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled_primitives JSONB,
  claimed_by JSONB,
  community_thread_id TEXT,
  community_thread_title TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hermes_onboard_event (
  id UUID PRIMARY KEY,
  slug TEXT NOT NULL,
  kind TEXT NOT NULL,
  actor JSONB,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS hermes_onboard_event_slug ON hermes_onboard_event (slug, created_at DESC);

CREATE TABLE IF NOT EXISTS hermes_on_settings (
  property TEXT PRIMARY KEY,
  default_tab TEXT NOT NULL DEFAULT 'dp',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS hermes_person_pad (
  slug TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  linkedin_url TEXT,
  cv_url TEXT,
  work_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  perspective_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  uploaded_docs JSONB NOT NULL DEFAULT '[]'::jsonb,
  bio_text TEXT,
  profile_paste TEXT,
  selected_sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE hermes_person_pad ADD COLUMN IF NOT EXISTS bio_text TEXT;
ALTER TABLE hermes_person_pad ADD COLUMN IF NOT EXISTS profile_paste TEXT;
ALTER TABLE hermes_person_pad ADD COLUMN IF NOT EXISTS selected_sources JSONB NOT NULL DEFAULT '[]'::jsonb;
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
    pool = new Pool({
      connectionString,
      max: 10,
      connectionTimeoutMillis: 8000,
    });
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
