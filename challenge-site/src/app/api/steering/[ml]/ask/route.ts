import { NextResponse } from 'next/server';
import { normalizeSteeringDocument } from '@/lib/dp-steering';
import { fetchSteeringDocument, mlOr400, passThrough, requireSteeringSession } from '@/lib/dp-steering-govhub.server';
import { reviewClaudeConfigured } from '@/lib/review-claude.server';
import {
  askSteeringDeepi,
  listSteeringAsks,
  MAX_STEERING_QUESTION,
  resolveSteeringTarget,
  steeringAskDailyLimit,
  steeringAsksToday,
  SteeringAskLimitError,
  targetKey,
} from '@/lib/steering-ask.server';
import { fetchChapterPassages } from '@/lib/workgroup-review-govhub';

type RouteContext = { params: Promise<{ ml: string }> };

/**
 * The viewer, the steering document and the target ("item:<id>" or "batch:<id>"). Gov Hub serves
 * the document only to steering members, so its refusal is this route's refusal.
 */
async function load(ctx: RouteContext, rawTarget: string) {
  const parsed = mlOr400((await ctx.params).ml);
  if ('response' in parsed) return { response: parsed.response };
  const auth = await requireSteeringSession();
  if ('response' in auth) return { response: auth.response };
  const result = await fetchSteeringDocument(parsed.ml, auth.idToken);
  if (!result.ok) return { response: passThrough(result) };
  const doc = normalizeSteeringDocument(parsed.ml, result.data, auth.userId);
  const target = resolveSteeringTarget(doc, rawTarget);
  if (!target) return { response: NextResponse.json({ error: 'That proposal or batch is not on this page.' }, { status: 404 }) };
  return { auth, doc, target };
}

/** This person's questions and answers on one proposal or batch, and how many questions are left today. */
export async function GET(request: Request, ctx: RouteContext) {
  const l = await load(ctx, new URL(request.url).searchParams.get('target') || '');
  if ('response' in l) return l.response;
  const [asks, used] = await Promise.all([listSteeringAsks(targetKey(l.target), l.auth.userId), steeringAsksToday(l.auth.userId)]);
  return NextResponse.json({
    ok: true,
    enabled: reviewClaudeConfigured(),
    asks,
    remainingToday: Math.max(0, steeringAskDailyLimit() - used),
  });
}

/** Ask Deepi (Claude Opus 5.5) about one proposal or batch. What Deepi reads comes from Gov Hub, not the request. */
export async function POST(request: Request, ctx: RouteContext) {
  if (!reviewClaudeConfigured()) {
    return NextResponse.json({ error: 'Ask Deepi is not configured on this server yet.' }, { status: 503 });
  }
  const body = (await request.json().catch(() => ({}))) as { target?: string; question?: string };
  const question = String(body.question || '').trim();
  if (!question) return NextResponse.json({ error: 'question required' }, { status: 400 });
  if (question.length > MAX_STEERING_QUESTION) {
    return NextResponse.json({ error: `Keep the question under ${MAX_STEERING_QUESTION} characters.` }, { status: 400 });
  }
  const l = await load(ctx, String(body.target || ''));
  if ('response' in l) return l.response;

  let passages: string[];
  try {
    passages = await fetchChapterPassages(l.doc.mlNumber);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Document text unavailable' }, { status: 502 });
  }
  try {
    const ask = await askSteeringDeepi({
      target: l.target,
      title: l.doc.title || l.doc.mlNumber,
      passages,
      question,
      userId: l.auth.userId,
      userName: l.auth.name,
      idToken: l.auth.idToken,
    });
    const used = await steeringAsksToday(l.auth.userId);
    return NextResponse.json(
      { ok: !ask.error, ask, remainingToday: Math.max(0, steeringAskDailyLimit() - used) },
      { status: ask.error ? 502 : 200 },
    );
  } catch (err) {
    if (err instanceof SteeringAskLimitError) return NextResponse.json({ error: err.message, remainingToday: 0 }, { status: 429 });
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Ask failed' }, { status: 500 });
  }
}
