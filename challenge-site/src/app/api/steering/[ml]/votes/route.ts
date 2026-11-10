import { NextResponse } from 'next/server';
import {
  mlOr400,
  passThrough,
  postSteeringVote,
  requireSteeringSession,
  type SteeringVoteInput,
} from '@/lib/dp-steering-govhub.server';

type RouteContext = { params: Promise<{ ml: string }> };

const DECISIONS = new Set(['accept', 'accept_revised', 'decline', 'defer']);

/** Record (or change) the viewer's steering vote on one proposal. Two matching votes carry it out. */
export async function POST(request: Request, ctx: RouteContext) {
  const parsed = mlOr400((await ctx.params).ml);
  if ('response' in parsed) return parsed.response;
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth.response;

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const proposalId = String(body.proposal_id || '').trim();
  const decision = String(body.decision || '').trim().toLowerCase();
  if (!proposalId || !DECISIONS.has(decision)) {
    return NextResponse.json(
      { error: 'proposal_id and decision (accept, accept_revised, decline or defer) required' },
      { status: 400 },
    );
  }
  const revisedText = String(body.revised_text || '').trim();
  if (decision === 'accept_revised' && !revisedText) {
    return NextResponse.json({ error: 'Accept revised needs the revised text.' }, { status: 400 });
  }
  const input: SteeringVoteInput = {
    proposal_id: proposalId,
    decision: decision as SteeringVoteInput['decision'],
  };
  if (decision === 'accept_revised') input.revised_text = revisedText.slice(0, 20000);
  if (body.agrees_with_analysis === true || body.agrees_with_analysis === false) {
    input.agrees_with_analysis = body.agrees_with_analysis;
  }
  const note = String(body.note || '').trim().slice(0, 4000);
  if (note) input.note = note;

  return passThrough(await postSteeringVote(parsed.ml, auth.idToken, input));
}
