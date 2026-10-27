import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { extractDpId } from '@/lib/govhub';
import { latestPrepublishCheck, runPrepublishCheck, workingHash } from '@/lib/prepublish-check.server';
import { reviewClaudeConfigured } from '@/lib/review-claude.server';
import {
  draftRefForWorkgroup,
  fetchChapterPassages,
  fetchWorkgroupSummary,
  fetchWorkingRevisionBody,
  workgroupCanEdit,
} from '@/lib/workgroup-review-govhub';

type RouteContext = { params: Promise<{ id: string }> };

export const maxDuration = 600;

async function publisher(workgroupId: string) {
  const session = await readSession();
  if (!session?.userId || !session.idToken) {
    return { error: NextResponse.json({ error: 'Sign in required' }, { status: 401 }) };
  }
  if (!(await workgroupCanEdit(workgroupId, session.idToken))) {
    return { error: NextResponse.json({ error: 'Only people who can publish this DP run the pre-publish check.' }, { status: 403 }) };
  }
  const draftRef = await draftRefForWorkgroup(workgroupId, session.idToken);
  if (!draftRef) return { error: NextResponse.json({ error: 'This workgroup has no linked chapter' }, { status: 409 }) };
  return { session, draftRef };
}

/** The latest check, and whether it still matches the working revision (current). */
export async function GET(_request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  const p = await publisher(workgroupId);
  if (p.error) return p.error;
  const [check, working] = await Promise.all([
    latestPrepublishCheck(workgroupId),
    fetchWorkingRevisionBody(p.draftRef, p.session.idToken).catch(() => null),
  ]);
  return NextResponse.json({
    ok: true,
    enabled: reviewClaudeConfigured(),
    check,
    current: Boolean(check && !check.error && working && check.workingHash === workingHash(working.body)),
  });
}

/** Run Claude's check of the working revision against the published chapter. */
export async function POST(_request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  const p = await publisher(workgroupId);
  if (p.error) return p.error;
  if (!reviewClaudeConfigured()) {
    return NextResponse.json({ error: 'The pre-publish check is not configured on this server yet.' }, { status: 503 });
  }
  const working = await fetchWorkingRevisionBody(p.draftRef, p.session.idToken).catch(() => null);
  if (!working) return NextResponse.json({ error: 'There is no working revision to check.' }, { status: 404 });
  const summary = await fetchWorkgroupSummary(workgroupId, p.session.idToken);
  let published: string;
  try {
    published = (await fetchChapterPassages(p.draftRef)).join('\n\n');
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Chapter unavailable' }, { status: 502 });
  }
  const check = await runPrepublishCheck({
    workgroupId,
    dpId: extractDpId(summary?.name || ''),
    draftRef: p.draftRef,
    revisionNumber: working.revisionNumber,
    publishedText: published,
    workingText: working.body,
    by: p.session.displayName || p.session.username || p.session.userId,
  });
  return NextResponse.json({ ok: !check.error, check, current: !check.error }, { status: check.error ? 502 : 200 });
}
