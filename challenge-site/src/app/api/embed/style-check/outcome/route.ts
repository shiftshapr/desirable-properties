import { NextResponse } from 'next/server';
import { verifyEmbedHermesProxy } from '@/lib/embed-hermes-proxy-auth';
import { recordStyleCheckOutcome } from '@/lib/style-check.server';

const OUTCOMES = new Set(['applied', 'edited', 'ignored']);

/** What the author did after a composer style check: applied, edited by hand, or posted as is. */
export async function POST(request: Request) {
  if (!verifyEmbedHermesProxy(request)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as { checkId?: string; outcome?: string };
  if (!body.checkId || !OUTCOMES.has(String(body.outcome))) {
    return NextResponse.json({ ok: false, error: 'checkId and outcome (applied|edited|ignored) required' }, { status: 400 });
  }
  const ok = await recordStyleCheckOutcome(body.checkId, body.outcome as 'applied' | 'edited' | 'ignored');
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
