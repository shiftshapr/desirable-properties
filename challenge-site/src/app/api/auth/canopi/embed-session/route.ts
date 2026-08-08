import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { getCanopiApiBase } from '@/lib/canopi-api';

/**
 * Mint a Canopi embed JWT from the challenge-site Web3Auth session cookie.
 * Lets the Discuss embed call CanopiEmbed.setAuth() without a Web3Auth popup.
 */
export async function GET() {
  const session = await readSession();
  if (!session?.idToken || !session.userId) {
    return NextResponse.json({ ok: false, error: 'not_authenticated' }, { status: 401 });
  }

  try {
    const upstream = await fetch(`${getCanopiApiBase()}/api/auth/web3auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ idToken: session.idToken }),
      signal: AbortSignal.timeout(20000),
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok || !data.user?.id || !data.embedToken) {
      return NextResponse.json(
        { ok: false, error: data.error || 'embed_session_failed' },
        { status: upstream.status === 401 ? 401 : 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      type: 'CANOPI_AUTH_SUCCESS',
      user: data.user,
      embedToken: data.embedToken,
      session: data.session || null,
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'upstream_failed' }, { status: 502 });
  }
}
