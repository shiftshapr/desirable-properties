import { NextResponse } from 'next/server';
import { embedCanopiUserFromBody, verifyEmbedHermesProxy } from '@/lib/embed-hermes-proxy-auth';
import { runStyleCheck } from '@/lib/style-check.server';

/**
 * Style check for the book's patch composer. Called server-to-server by Canopi
 * (x-canopi-embed-ai-proxy-secret), never by browsers.
 */
export async function POST(request: Request) {
  if (!verifyEmbedHermesProxy(request)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const proposedText = String(body.proposedText || '').trim();
  if (!proposedText) {
    return NextResponse.json({ ok: false, error: 'proposedText required' }, { status: 400 });
  }
  const user = embedCanopiUserFromBody(body);
  try {
    const check = await runStyleCheck({
      source: 'composer',
      dpId: body.dpId ? String(body.dpId).toUpperCase() : null,
      mode: String(body.mode || '').startsWith('insert') ? 'insert' : 'replace',
      originalText: String(body.originalText || ''),
      proposedText,
      rationale: body.rationale ? String(body.rationale) : null,
      canopiUserId: user.id,
    });
    return NextResponse.json({ ok: true, checkId: check.id, result: check.result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Style check failed' },
      { status: 503 },
    );
  }
}
