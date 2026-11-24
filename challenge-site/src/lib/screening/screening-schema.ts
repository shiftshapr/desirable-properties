/**
 * Council screening objections (DP Postgres). CREATE IF NOT EXISTS, run on the first write, like ballot-schema.ts.
 * Page reads never run DDL.
 *
 * dp_screening_objection  one row per objection a council member makes to one draft question of one session.
 *                 Withdrawing sets withdrawn_at; the row is never deleted, so the record shows it was made and
 *                 withdrawn. At most one standing (not withdrawn) objection per member per question.
 */
export const SCREENING_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS dp_screening_objection (
  id UUID PRIMARY KEY,
  ballot_slug TEXT NOT NULL,
  question_key TEXT NOT NULL,
  member_user_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (length(reason) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  withdrawn_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS dp_screening_objection_slug ON dp_screening_objection (ballot_slug, question_key);

CREATE UNIQUE INDEX IF NOT EXISTS dp_screening_objection_standing
  ON dp_screening_objection (ballot_slug, question_key, member_user_id) WHERE withdrawn_at IS NULL;
`;
