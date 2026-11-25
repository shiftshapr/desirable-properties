/**
 * Proposals for the next session (DP Postgres). CREATE IF NOT EXISTS on the first write, like screening-schema.ts.
 *
 * dp_session_proposal          one row per proposal for one session (session_date, YYYY-MM-DD). Never deleted:
 *                              withdrawn_at (by the proposer) or hidden_at (by a council member, with a reason).
 * dp_session_proposal_support  one row per supporter per proposal; removing a support removes only that click.
 */
export const NEXT_PROPOSALS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS dp_session_proposal (
  id UUID PRIMARY KEY,
  session_date TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  title TEXT NOT NULL CHECK (length(title) > 0),
  body TEXT NOT NULL CHECK (length(body) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at TIMESTAMPTZ,
  hidden_at TIMESTAMPTZ,
  hidden_by_user_id TEXT,
  hidden_by_name TEXT,
  hidden_reason TEXT
);
CREATE INDEX IF NOT EXISTS dp_session_proposal_date ON dp_session_proposal (session_date, created_at);

CREATE TABLE IF NOT EXISTS dp_session_proposal_support (
  proposal_id UUID NOT NULL REFERENCES dp_session_proposal(id),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (proposal_id, user_id)
);
`;
