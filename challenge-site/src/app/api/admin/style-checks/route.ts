import { NextResponse } from 'next/server';
import { requireDpAdmin } from '@/lib/dp-admin-api';
import {
  listStyleChecks,
  summarizeStyleChecks,
  type StyleCheckAuditRow,
  type StyleCheckSource,
} from '@/lib/style-check.server';

const CSV_COLUMNS: Array<[string, (r: StyleCheckAuditRow) => unknown]> = [
  ['id', (r) => r.id],
  ['created_at', (r) => r.createdAt],
  ['source', (r) => r.source],
  ['dp', (r) => r.dpId],
  ['item_key', (r) => r.itemKey],
  ['cached_from', (r) => r.cachedFrom],
  ['mode', (r) => r.mode],
  ['provider', (r) => r.provider],
  ['model', (r) => r.model],
  ['guide_version', (r) => r.guideVersion],
  ['prompt_version', (r) => r.promptVersion],
  ['latency_ms', (r) => r.latencyMs],
  ['prompt_tokens', (r) => r.promptTokens],
  ['completion_tokens', (r) => r.completionTokens],
  ['verdict', (r) => r.result?.verdict],
  ['notes', (r) => r.result?.notes.map((n) => `[${n.section}] ${n.issue} -> ${n.fix}`).join(' | ')],
  ['suggested_text', (r) => r.result?.suggestedText],
  ['error', (r) => r.error],
  ['outcome', (r) => r.outcome],
  ['helpful', (r) => r.helpful],
  ['rated_by', (r) => r.ratedBy],
  ['rating_comment', (r) => r.ratingComment],
  ['original_text', (r) => r.originalText],
  ['proposed_text', (r) => r.proposedText],
  ['rationale', (r) => r.rationale],
];

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Style-check audit for admins: summary + rows, or a CSV/JSON export (?format=csv|json). */
export async function GET(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;
  const url = new URL(request.url);
  const source = url.searchParams.get('source');
  const rated = url.searchParams.get('rated');
  const rows = await listStyleChecks({
    limit: Number(url.searchParams.get('limit')) || 200,
    dpId: url.searchParams.get('dp')?.toUpperCase() || null,
    source: source === 'composer' || source === 'review' ? (source as StyleCheckSource) : null,
    rated: rated === 'helpful' || rated === 'unhelpful' || rated === 'unrated' ? rated : null,
  });
  const format = url.searchParams.get('format');
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === 'csv') {
    const lines = [CSV_COLUMNS.map(([h]) => h).join(',')];
    for (const r of rows) lines.push(CSV_COLUMNS.map(([, get]) => csvCell(get(r))).join(','));
    return new Response(lines.join('\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="style-checks-${stamp}.csv"`,
      },
    });
  }
  if (format === 'json') {
    return new Response(JSON.stringify(rows, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="style-checks-${stamp}.json"`,
      },
    });
  }
  return NextResponse.json({ summary: summarizeStyleChecks(rows), rows });
}
