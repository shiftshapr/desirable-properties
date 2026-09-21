import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

const SUBMIT_UPSTREAM_MS = 180000;

function timedOut(err: unknown): boolean {
  return err instanceof Error && (err.name === 'TimeoutError' || /aborted|timeout/i.test(err.message));
}

export async function POST(request: Request) {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ error: 'Sign in required to submit' }, { status: 401 });
  }

  const body = await request.json();
  try {
    const upstream = await fetch(`${getHermesChatUrl()}/api/hermes/contributions/submit`, {
      method: 'POST',
      headers: hermesUpstreamHeaders(),
      body: JSON.stringify({
        ...body,
        idToken: session.idToken,
        verifierId: session.verifierId,
      }),
      signal: AbortSignal.timeout(SUBMIT_UPSTREAM_MS),
    });
    const data = await upstream.json().catch(() => ({ error: 'Empty response from Deepi submit' }));
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    return NextResponse.json(
      {
        error: timedOut(err)
          ? 'Publish took too long to confirm. Check Discuss before retrying; the first patch may already be live.'
          : 'Could not reach Deepi submit.',
      },
      { status: timedOut(err) ? 504 : 502 },
    );
  }
}
