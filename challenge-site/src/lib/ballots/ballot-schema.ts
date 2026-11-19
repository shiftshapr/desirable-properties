/**
 * Session ballot tables (DP Postgres). CREATE IF NOT EXISTS, run on the first vote (and by scripts/ballot-admin.mjs),
 * the same way the site creates its other tables (dp-db.ts ensureDpSchema). Page reads never run DDL.
 *
 * dp_ballot       optional, one row per ballot, written only by ballot-admin: status 'closed' stops voting before
 *                 closesAt; 'published' shows the totals on the page. Without a row the definition's window applies.
 * dp_ballot_vote  one current vote per (ballot, question, account). A changed vote overwrites the row (no history of
 *                 an account's earlier choices is kept).
 */
export const BALLOT_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS dp_ballot (
  slug TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('closed', 'published')),
  closed_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS dp_ballot_vote (
  ballot_slug TEXT NOT NULL,
  question_key TEXT NOT NULL,
  user_id TEXT NOT NULL,
  option_key TEXT NOT NULL,
  cast_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (ballot_slug, question_key, user_id)
);

CREATE INDEX IF NOT EXISTS dp_ballot_vote_user ON dp_ballot_vote (ballot_slug, user_id);
`;
