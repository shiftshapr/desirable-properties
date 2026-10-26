import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { dismissAnchorEval } from '@/lib/anchor-eval.server';
import { fetchViewerCoEditor } from '@/lib/workgroup-review-govhub';

type RouteContext = { params: Promise<{ id: string }> };

/** A co-editor keeps a proposal where it is: Claude's "better anchor" flag stops showing. */
export async function POST(request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  const session = await readSession();
  if (!session?.userId || !session.idToken) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }
  const { isCoEditor } = await fetchViewerCoEditor(workgroupId, session.idToken);
  if (!isCoEditor) {
    return NextResponse.json({ error: "Only this DP's co-editors decide where proposals go." }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as { govhubProposalId?: string };
  const proposalId = String(body.govhubProposalId || '').trim();
  if (!proposalId) return NextResponse.json({ error: 'govhubProposalId required' }, { status: 400 });
  const by = session.displayName || session.username || session.userId;
  return NextResponse.json({ ok: await dismissAnchorEval(proposalId, by) });
}
