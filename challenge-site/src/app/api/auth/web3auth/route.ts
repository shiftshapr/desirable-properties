import { NextResponse } from 'next/server';
import { decodeJwt } from 'jose';
import { createSessionCookie } from '@/lib/auth-session';
import { getGovHubBaseUrl } from '@/lib/web3auth-config';
import { identityFromWeb3AuthClaims } from '@/lib/web3auth-verify';

/**
 * Mirror Gov Hub login: verify idToken once on Gov Hub, then establish a local
 * encrypted session cookie (cross-origin sites cannot use Flask session cookies).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idToken = String(body.idToken || body.id_token || '').trim();
    if (!idToken) {
      return NextResponse.json({ error: 'idToken required' }, { status: 400 });
    }

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
        {
          error: 'MFA is enabled on this account. Sign in at Gov Hub first, then return here.',
          mfaRequired: true,
        },
        { status: 403 },
      );
    }

    // Gov Hub verified the token; decode claims for verifierId (no second JWKS verify).
    const claims = decodeJwt(idToken) as Record<string, unknown>;
    const identity = identityFromWeb3AuthClaims(claims);

    const user = ghData.user || {};
    const profileImage = user.profileImage || identity.profileImage || null;
    const cookie = await createSessionCookie({
      verifierId: identity.verifierId,
      userId: String(user.id || ''),
      username: String(user.username || ''),
      displayName: user.displayName || user.oauthName || identity.name || null,
      profileImage,
      idToken,
      email: identity.email,
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.oauthName || identity.name,
        profileImage,
        verifierId: identity.verifierId,
      },
    });
    response.cookies.set(cookie);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Authentication failed';
    const status = message.includes('AUTH_SESSION_SECRET') ? 500 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
