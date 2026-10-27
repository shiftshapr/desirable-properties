import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import {
  latestPrepublishCheck,
  recordPrepublishDecisions,
  workingHash,
  type PrepublishDecision,
} from '@/lib/prepublish-check.server';
import {
  applyWorkingRevisionEdits,
  draftRefForWorkgroup,
  fetchWorkingRevisionBody,
  workgroupCanEdit,
} from '@/lib/workgroup-review-govhub';

type RouteContext = { params: Promise<{ id: string }> };

/** The publisher accepts (applies) or skips edits from the latest pre-publish check. */
export async function POST(request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  const session = await readSession();
  if (!session?.userId || !session.idToken) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  if (!(await workgroupCanEdit(workgroupId, session.idToken))) {
    return NextResponse.json({ error: 'Only people who can publish this DP edit the working revision.' }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as { checkId?: string; accept?: unknown; skip?: unknown };
  const check = await latestPrepublishCheck(workgroupId);
  if (!check || check.id !== body.checkId || check.error) {
    return NextResponse.json({ error: 'That check is no longer the latest. Run the check again.' }, { status: 409 });
  }
  const ints = (v: unknown) =>
    (Array.isArray(v) ? v : []).map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < check.edits.length && !check.decisions[n]);
  const accept = [...new Set(ints(body.accept))];
  const skip = [...new Set(ints(body.skip))].filter((n) => !accept.includes(n));
  const by = session.displayName || session.username || session.userId;
  const at = new Date().toISOString();
  const decisions: Record<string, PrepublishDecision> = {};
  for (const n of skip) decisions[n] = { status: 'skipped', by, at };

  const draftRef = await draftRefForWorkgroup(workgroupId, session.idToken);
  if (!draftRef) return NextResponse.json({ error: 'This workgroup has no linked chapter' }, { status: 409 });
  let notApplied: Array<{ index: number; reason: string }> = [];
  if (accept.length) {
    const before = await fetchWorkingRevisionBody(draftRef, session.idToken).catch(() => null);
    if (!before || workingHash(before.body) !== check.workingHash) {
      return NextResponse.json({ error: 'The working revision changed since this check. Run the check again.' }, { status: 409 });
    }
    const result = await applyWorkingRevisionEdits(
      draftRef,
      session.idToken,
      accept.map((n) => ({
        original_text: check.edits[n].originalText,
        proposed_text: check.edits[n].proposedText,
        note: check.edits[n].reason.slice(0, 300),
      })),
      'Claude pre-publish check',
    );
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status || 502 });
    for (const i of result.applied) decisions[accept[i]] = { status: 'accepted', by, at };
    notApplied = result.skipped.map((s) => ({ index: accept[s.index], reason: s.reason }));
  }
  const after = accept.length ? await fetchWorkingRevisionBody(draftRef, session.idToken).catch(() => null) : null;
  await recordPrepublishDecisions(check.id, decisions, after ? after.body : null);
  return NextResponse.json({ ok: true, decisions, notApplied });
}
