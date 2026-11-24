import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { readMyParticipation, saveShowName } from '@/lib/ballots/participation.server';
import { sameOrigin } from '@/lib/sessions/session-chat-core';

/**
 * GET: the signed-in account's own ballot participation (counts and streaks, never its choices) and whether its name
 * shows on the public participation list. POST { showName: boolean }: change that setting.
 */
export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function GET() {
  const session = await readSession().catch(() => null);
  if (!session?.userId) return json({ ok: false, error: 'Sign in to see your participation.' }, 401);
  try {
    const me = await readMyParticipation(session.userId);
    return json({ ok: true, ...me });
  } catch {
    return json({ ok: false, error: 'Participation is not available right now.' }, 503);
  }
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return json({ ok: false, error: 'Bad origin.' }, 403);
  const session = await readSession().catch(() => null);
  if (!session?.userId) return json({ ok: false, error: 'Sign in to change this setting.' }, 401);
  const body = (await request.json().catch(() => null)) as { showName?: unknown } | null;
  if (typeof body?.showName !== 'boolean') return json({ ok: false, error: 'showName must be true or false.' }, 400);
  try {
    await saveShowName(session.userId, body.showName);
    return json({ ok: true, showName: body.showName });
  } catch {
    return json({ ok: false, error: 'The setting was not saved. Try again.' }, 503);
  }
}
