import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { resolveWorkgroupMembership } from '@/lib/workgroup-membership.server';
import { draftRefForWorkgroup, emailWorkingRevision, workgroupCanEdit } from '@/lib/workgroup-review-govhub';

type RouteContext = { params: Promise<{ id: string }> };
const AUDIENCES = new Set(['me', 'external', 'workgroup']);

/** Email the working revision to yourself, outside addresses (members), or the whole workgroup
 *  (coordinator / co-editors). Gov Hub sends it and enforces the rules and limits. */
export async function POST(request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  const session = await readSession();
  if (!session?.userId || !session.idToken) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  const [member, canEdit] = await Promise.all([
    resolveWorkgroupMembership(workgroupId, session.userId),
    workgroupCanEdit(workgroupId, session.idToken),
  ]);
  if (!member && !canEdit) return NextResponse.json({ error: 'Join this workgroup to email its working revision.' }, { status: 403 });
  const body = (await request.json().catch(() => ({}))) as { audience?: string; emails?: unknown; message?: string };
  const audience = String(body.audience || '');
  if (!AUDIENCES.has(audience)) return NextResponse.json({ error: 'audience must be me, external or workgroup' }, { status: 400 });
  const emails = Array.isArray(body.emails)
    ? body.emails.map((e) => String(e || '').trim()).filter(Boolean).slice(0, 20)
    : typeof body.emails === 'string'
      ? body.emails.split(/[\s,;]+/).map((e) => e.trim()).filter(Boolean).slice(0, 20)
      : [];
  const draftRef = await draftRefForWorkgroup(workgroupId, session.idToken);
  if (!draftRef) return NextResponse.json({ error: 'This workgroup has no linked chapter' }, { status: 409 });
  const result = await emailWorkingRevision(draftRef, session.idToken, {
    audience: audience as 'me' | 'external' | 'workgroup',
    emails,
    message: String(body.message || '').slice(0, 2000),
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status || 502 });
  return NextResponse.json({ ok: true, sent: result.sent, failed: result.failed });
}
