import { requireDpAdmin } from '@/lib/dp-admin-api';
import { ensureDpSchema } from '@/lib/dp-db';

const COLUMNS = [
  'id', 'created_at', 'dp_id', 'workgroup_id', 'comment_key', 'provider', 'model', 'guide_version',
  'prompt_version', 'latency_ms', 'prompt_tokens', 'completion_tokens', 'error', 'passage', 'comment_text',
  'ai_action', 'ai_proposed_text', 'ai_rationale', 'ai_why_none', 'filed_mode', 'filed_text', 'proposal_id',
  'filed_at', 'raw_response',
];

function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV of every AI draft from a comment, next to the text members actually filed. */
export async function GET() {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;
  const pool = await ensureDpSchema();
  const rows = pool
    ? (await pool.query(
        `SELECT *, result_json->>'action' AS ai_action, result_json->>'proposedText' AS ai_proposed_text,
                result_json->>'rationale' AS ai_rationale, result_json->>'whyNone' AS ai_why_none
         FROM dp_comment_draft ORDER BY created_at DESC LIMIT 5000`,
      )).rows
    : [];
  const lines = [COLUMNS.join(',')];
  for (const r of rows) lines.push(COLUMNS.map((c) => cell(r[c])).join(','));
  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="comment-drafts-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
