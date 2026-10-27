import { NextResponse } from 'next/server';
import { requireDpAdmin } from '@/lib/dp-admin-api';
import { anchorEvalStatus, runAnchorEvalForWorkgroup } from '@/lib/anchor-eval.server';
import { reviewClaudeConfigured } from '@/lib/review-claude.server';

export const maxDuration = 800;

/** Per-DP progress of the one-time anchor evaluation. */
export async function GET() {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;
  return NextResponse.json({ ok: true, enabled: reviewClaudeConfigured(), dps: await anchorEvalStatus() });
}

/** Evaluate one DP's pending proposals that have no current evaluation. */
export async function POST(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;
  if (!reviewClaudeConfigured()) {
    return NextResponse.json({ error: 'REVIEW_ANTHROPIC_API_KEY is not set on this server.' }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { workgroupId?: string };
  const workgroupId = String(body.workgroupId || '').trim();
  if (!workgroupId) return NextResponse.json({ error: 'workgroupId required' }, { status: 400 });
  try {
    return NextResponse.json({ ok: true, ...(await runAnchorEvalForWorkgroup(workgroupId)) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Evaluation failed' }, { status: 500 });
  }
}
