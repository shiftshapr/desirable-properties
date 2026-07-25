import { NextResponse } from 'next/server';
import { createSessionCookie } from '@/lib/auth-session';
import { getGovHubBaseUrl } from '@/lib/web3auth-config';
import { identityFromWeb3AuthClaims, verifyWeb3AuthIdToken } from '@/lib/web3auth-verify';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idToken = String(body.idToken || body.id_token || '').trim();
    if (!idToken) {
      return NextResponse.json({ error: 'idToken required' }, { status: 400 });
    }

    const claims = await verifyWeb3AuthIdToken(idToken);
    const identity = identityFromWeb3AuthClaims(claims);

    const ghRes = await fetch(`${getGovHubBaseUrl()}/api/auth/web3auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken,
        evmAddress: body.evmAddress || '',
        solanaAddress: body.solanaAddress || '',
        bitcoinAddress: body.bitcoinAddress || '',
      }),
      signal: AbortSignal.timeout(30000),
    });
    const ghData = await ghRes.json();
    if (!ghRes.ok) {
      return NextResponse.json(
        { error: ghData.error || 'Gov Hub sign-in failed' },
        { status: ghRes.status },
      );
    }
    if (ghData.mfaRequired) {
      return NextResponse.json(
        { error: 'MFA is enabled on this account. Sign in on Gov Hub first.' },
        { status: 403 },
      );
    }

    const user = ghData.user || {};
    const cookie = await createSessionCookie({
      verifierId: identity.verifierId,
      userId: String(user.id || ''),
      username: String(user.username || ''),
      displayName: user.displayName || user.oauthName || identity.name || null,
      idToken,
      email: identity.email,
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.oauthName || identity.name,
        profileImage: user.profileImage,
        verifierId: identity.verifierId,
      },
    });
    response.cookies.set(cookie);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Authentication failed';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
