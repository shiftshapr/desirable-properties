/**
 * Plain-language summaries for proposal pads: the pure rules shared by the app and the generator script
 * (scripts/generate-proposal-pad-summaries.mjs). No server-only imports, so node scripts and tests can load it.
 *
 * Two sources: the runtime table dp_pad_summary (written by the scheduled generator, so a new or edited proposal gets
 * a summary with no deploy) and the bundled seed src/data/proposal-pad-summaries.json. A summary shows only while its
 * source hash matches the proposal's current text; the table is preferred when both match.
 */
import { createHash } from 'node:crypto';

/** One stored summary, from either source. */
export type SummaryRow = {
  padId: string;
  title: string;
  summary: string;
  sourceHash: string;
  model: string;
  generatedAt: string;
  mlNumber: string | null;
};

/** Anything with pg's query shape (a Pool, a Client, or a test double). */
export type Queryable = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount?: number | null }>;
};

export const PAD_SUMMARY_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS dp_pad_summary (
  pad_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  model TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ml_number TEXT
);
`;

/** The hash a summary is keyed to: sha256 of summaryInput(...), first 16 hex characters (same as the seed JSON). */
export function sourceHash(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

type SeedFile = {
  model?: string;
  items?: Record<string, { title: string; summary: string; inputHash: string; generatedAt: string; ml?: string; servedBy?: string }>;
};

/** The bundled seed JSON as rows. */
export function seedRows(file: SeedFile): Map<string, SummaryRow> {
  const out = new Map<string, SummaryRow>();
  for (const [padId, r] of Object.entries(file.items || {})) {
    out.set(padId, {
      padId,
      title: r.title,
      summary: r.summary,
      sourceHash: r.inputHash,
      model: file.model || r.servedBy || '',
      generatedAt: r.generatedAt,
      mlNumber: r.ml || null,
    });
  }
  return out;
}

/** The summary to show: the first source (table, then seed) whose hash matches the current text; otherwise none. */
export function pickSummary(hash: string, ...rows: Array<SummaryRow | null | undefined>): SummaryRow | null {
  for (const r of rows) if (r && r.sourceHash === hash) return r;
  return null;
}

/** A short title for lists (not hash-checked, as before): the table's, then the seed's. */
export function pickTitle(...rows: Array<SummaryRow | null | undefined>): string | null {
  for (const r of rows) if (r?.title) return r.title;
  return null;
}

/** True when either source already has a summary for exactly this text (the generator skips it). */
export function isCurrent(hash: string, ...rows: Array<SummaryRow | null | undefined>): boolean {
  return pickSummary(hash, ...rows) !== null;
}

const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v ?? ''));

/** Read every stored row (the table is small: one row per proposal). Returns an empty map when the table is absent. */
export async function readSummaryRows(db: Queryable): Promise<Map<string, SummaryRow>> {
  const exists = await db.query("SELECT to_regclass('public.dp_pad_summary') IS NOT NULL AS ok");
  if (!exists.rows[0]?.ok) return new Map();
  const r = await db.query(
    'SELECT pad_id, title, summary, source_hash, model, generated_at, ml_number FROM dp_pad_summary',
  );
  return new Map(
    r.rows.map((row) => [
      String(row.pad_id),
      {
        padId: String(row.pad_id),
        title: String(row.title),
        summary: String(row.summary),
        sourceHash: String(row.source_hash),
        model: String(row.model),
        generatedAt: iso(row.generated_at),
        mlNumber: row.ml_number ? String(row.ml_number) : null,
      },
    ]),
  );
}

export async function ensureSummarySchema(db: Queryable): Promise<void> {
  await db.query(PAD_SUMMARY_SCHEMA_SQL);
}

/** Insert or replace one proposal's summary. */
export async function upsertSummary(db: Queryable, row: SummaryRow): Promise<void> {
  await db.query(
    `INSERT INTO dp_pad_summary (pad_id, title, summary, source_hash, model, generated_at, ml_number)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (pad_id) DO UPDATE SET title = EXCLUDED.title, summary = EXCLUDED.summary,
       source_hash = EXCLUDED.source_hash, model = EXCLUDED.model, generated_at = EXCLUDED.generated_at,
       ml_number = EXCLUDED.ml_number`,
    [row.padId, row.title, row.summary, row.sourceHash, row.model, row.generatedAt, row.mlNumber],
  );
}

// USD per million tokens (claude-opus-5-5): input, output, cache read, cache write (5 min).
export const PRICE = { input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 };

export type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number };

export function usageCost(u: Usage): number {
  return (u.input * PRICE.input + u.output * PRICE.output + u.cacheRead * PRICE.cacheRead + u.cacheWrite * PRICE.cacheWrite) / 1e6;
}

/**
 * A cautious guess at one call's cost before it is made: the instructions written to cache, the proposal at about four
 * characters a token, and a full medium-effort answer (thinking included) of 2,000 output tokens.
 */
export function estimateCallCost(inputChars: number, instructionChars: number): number {
  return usageCost({
    input: Math.ceil(inputChars / 4) + 50,
    output: 2000,
    cacheRead: 0,
    cacheWrite: Math.ceil(instructionChars / 4),
  });
}

/**
 * Whether the run may start one more call: under the item cap, and the cost so far plus the projected cost of the
 * calls still in flight and this one (each the larger of the up-front estimate and the average so far) stays within
 * the budget.
 */
export function mayStart(
  state: { started: number; spent: number; finished: number },
  estimate: number,
  limits: { max: number; budget: number },
): boolean {
  if (state.started >= limits.max) return false;
  const average = state.finished ? state.spent / state.finished : 0;
  const inFlight = state.started - state.finished;
  return state.spent + (inFlight + 1) * Math.max(estimate, average) <= limits.budget;
}

/** The one-line result the scheduled run logs. */
export function resultLine(r: {
  wrote: number;
  pending: number;
  todo: number;
  failed: number;
  skippedDocs: number;
  cost: number;
  stoppedBy: 'cap' | 'budget' | null;
}): string {
  const parts = [
    `pad-summaries: wrote ${r.wrote} of ${r.todo} new or changed (${r.pending} pending checked)`,
    `cost $${r.cost.toFixed(4)}`,
  ];
  if (r.failed) parts.push(`failed ${r.failed}`);
  if (r.skippedDocs) parts.push(`Gov Hub did not answer for ${r.skippedDocs} documents`);
  if (r.stoppedBy) parts.push(`stopped at the ${r.stoppedBy === 'cap' ? 'item cap' : 'cost cap'}, rest next run`);
  return parts.join(', ');
}

/**
 * Read the named keys from a .env file, parsed the way the app's ecosystem.config.js reads .env.local (KEY=value,
 * optional matching quotes, # comment lines). Only the wanted keys are returned, so no other secret enters the process.
 */
export function parseEnvKeys(text: string, wanted: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    if (!wanted.includes(key)) continue;
    let value = trimmed.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[key] = value;
  }
  return out;
}
