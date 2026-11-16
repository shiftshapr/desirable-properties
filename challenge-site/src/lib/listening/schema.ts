/**
 * Listening workspace schema (Phase 1). Append-only meeting record; see the design note
 * (~/handoff/specs/listening-workspace-phase1-design.md, section 2).
 *
 * Runs only from ensureListeningSchema() (flag on) and from scripts/listening-import.ts.
 * The first statement refuses the production database by name: production gets these tables only
 * through a reviewed change that removes this guard and an explicit, manual migration.
 */
export const PRODUCTION_DB_NAME = 'desirable_properties';

export const LISTENING_GUARD_SQL = `
DO $$
BEGIN
  IF current_database() = '${PRODUCTION_DB_NAME}'
     AND coalesce(current_setting('dp.listening_allow_prod', true), '') <> 'on' THEN
    RAISE EXCEPTION 'listening workspace: refusing to touch the production database';
  END IF;
END $$;
`;

export const LISTENING_SCHEMA_SQL = `
${LISTENING_GUARD_SQL}

CREATE TABLE IF NOT EXISTS dp_listen_meeting (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'occurrence' CHECK (kind IN ('occurrence', 'demo')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  source_key TEXT,
  canonical_path TEXT,
  join_url TEXT,
  zoom_meeting_id TEXT,
  zoom_occurrence_uuid TEXT,
  phase TEXT NOT NULL DEFAULT 'before',
  transcript_mode TEXT NOT NULL DEFAULT 'none'
    CHECK (transcript_mode IN ('none', 'imported', 'replaying', 'live')),
  transcript_source TEXT,
  last_seq BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS dp_listen_event (
  meeting_id TEXT NOT NULL REFERENCES dp_listen_meeting(id),
  seq BIGINT NOT NULL,
  kind TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  actor_user_id TEXT,
  actor_name TEXT,
  actor_role TEXT,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (meeting_id, seq)
);

CREATE INDEX IF NOT EXISTS dp_listen_event_kind ON dp_listen_event (meeting_id, kind, seq);

CREATE TABLE IF NOT EXISTS dp_listen_participant (
  meeting_id TEXT NOT NULL REFERENCES dp_listen_meeting(id),
  user_id TEXT NOT NULL,
  display_name TEXT,
  role TEXT NOT NULL DEFAULT 'participant'
    CHECK (role IN ('participant', 'facilitator', 'administrator', 'council', 'claude_service')),
  granted_by TEXT,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (meeting_id, user_id)
);

CREATE TABLE IF NOT EXISTS dp_listen_speaker (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES dp_listen_meeting(id),
  zoom_display_name TEXT NOT NULL,
  account_user_id TEXT,
  attribution_status TEXT NOT NULL DEFAULT 'unresolved'
    CHECK (attribution_status IN ('unresolved', 'confirmed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, zoom_display_name)
);

CREATE TABLE IF NOT EXISTS dp_listen_segment (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES dp_listen_meeting(id),
  source_id TEXT NOT NULL,
  speaker_id TEXT REFERENCES dp_listen_speaker(id),
  start_ms BIGINT NOT NULL,
  end_ms BIGINT,
  section_title TEXT,
  current_rev INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, source_id)
);

CREATE INDEX IF NOT EXISTS dp_listen_segment_time ON dp_listen_segment (meeting_id, start_ms);

CREATE TABLE IF NOT EXISTS dp_listen_segment_rev (
  segment_id TEXT NOT NULL REFERENCES dp_listen_segment(id),
  rev INTEGER NOT NULL,
  text TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'original' CHECK (kind IN ('original', 'correction')),
  correction_id TEXT,
  actor_user_id TEXT,
  actor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (segment_id, rev)
);

CREATE TABLE IF NOT EXISTS dp_listen_contribution (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES dp_listen_meeting(id),
  author_user_id TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL CHECK (kind IN ('comment', 'question', 'suggested_option', 'correction_request')),
  target_type TEXT NOT NULL CHECK (target_type IN ('meeting', 'topic', 'card', 'segment')),
  target_id TEXT,
  body TEXT NOT NULL,
  proposed_text TEXT,
  timing TEXT NOT NULL CHECK (timing IN ('before', 'live', 'after')),
  client_nonce TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (meeting_id, author_user_id, client_nonce)
);

CREATE INDEX IF NOT EXISTS dp_listen_contribution_meeting ON dp_listen_contribution (meeting_id, created_at);

CREATE TABLE IF NOT EXISTS dp_listen_card (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES dp_listen_meeting(id),
  parent_id TEXT REFERENCES dp_listen_card(id),
  card_type TEXT NOT NULL,
  origin TEXT NOT NULL CHECK (origin IN ('import', 'participant', 'facilitator', 'claude')),
  import_key TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  current_rev INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  UNIQUE (meeting_id, import_key)
);

CREATE TABLE IF NOT EXISTS dp_listen_card_rev (
  card_id TEXT NOT NULL REFERENCES dp_listen_card(id),
  rev INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  label TEXT,
  source_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'withdrawn')),
  reason TEXT,
  base_rev INTEGER,
  actor_user_id TEXT,
  actor_name TEXT,
  actor_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (card_id, rev),
  CHECK (jsonb_array_length(source_refs) > 0 OR coalesce(label, '') IN ('claude_synthesis', 'added_after_meeting'))
);

CREATE TABLE IF NOT EXISTS dp_listen_answer (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES dp_listen_meeting(id),
  question_id TEXT NOT NULL REFERENCES dp_listen_contribution(id),
  status TEXT NOT NULL CHECK (status IN ('answered', 'record_does_not_support', 'declined')),
  answer JSONB NOT NULL DEFAULT '{}'::jsonb,
  session_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dp_listen_moderation (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES dp_listen_meeting(id),
  contribution_id TEXT NOT NULL REFERENCES dp_listen_contribution(id),
  action TEXT NOT NULL CHECK (action IN (
    'prioritize', 'deprioritize', 'defer', 'undefer', 'combine',
    'correction_accepted', 'correction_not_accepted'
  )),
  related_id TEXT,
  note TEXT,
  actor_user_id TEXT,
  actor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dp_listen_moderation_meeting ON dp_listen_moderation (meeting_id, created_at);

-- Append-only: no UPDATE or DELETE on the content and log tables.
CREATE OR REPLACE FUNCTION dp_listen_append_only() RETURNS trigger LANGUAGE plpgsql AS $fn$
BEGIN
  RAISE EXCEPTION 'listening workspace: % is append-only', TG_TABLE_NAME;
END
$fn$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['dp_listen_event', 'dp_listen_segment_rev', 'dp_listen_card_rev',
                           'dp_listen_contribution', 'dp_listen_moderation', 'dp_listen_answer'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = t || '_append_only') THEN
      EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION dp_listen_append_only()',
                     t || '_append_only', t);
    END IF;
  END LOOP;
END $$;
`;
