import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { refreshSessionFromCanopi } from '@/lib/auth-profile';
import { readSession, setSessionCookies } from '@/lib/auth-session';
import { fetchCanonicalAccount } from '@/lib/canonical-account';
import { getGovHubProxyBaseUrl } from '@/lib/web3auth-config';

export async function GET() {
  let session = await readSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  let sessionChanged = false;
  // A session issued before this person linked accounts on Gov Hub moves to the main account.
  const canonical = await fetchCanonicalAccount(getGovHubProxyBaseUrl(), session.userId, session.idToken);
  if (canonical) {
    session = { ...session, userId: canonical.userId, username: canonical.username || session.username };
    sessionChanged = true;
  }

  let profileImage = session.profileImage ?? null;
  let canopiUserId = session.canopiUserId ?? null;

  const refreshed = await refreshSessionFromCanopi(session);
  if (refreshed) {
    profileImage = refreshed.profileImage;
    canopiUserId = refreshed.canopiUserId;
    sessionChanged = sessionChanged || refreshed.changed;
  }

  const response = NextResponse.json({
    authenticated: true,
    user: {
      id: session.userId,
      username: session.username,
      displayName: session.displayName,
      profileImage,
      verifierId: session.verifierId,
    },
  });

  if (sessionChanged) {
    await setSessionCookies(
      response.cookies,
      { ...session, profileImage, canopiUserId },
      await cookies(),
    );
  }

  return response;
}
