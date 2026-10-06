import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { refreshSessionFromCanopi } from '@/lib/auth-profile';
import { readSession, setSessionCookies } from '@/lib/auth-session';

export async function GET() {
  const session = await readSession();
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  let profileImage = session.profileImage ?? null;
  let canopiUserId = session.canopiUserId ?? null;
  let sessionChanged = false;

  const refreshed = await refreshSessionFromCanopi(session);
  if (refreshed) {
    profileImage = refreshed.profileImage;
    canopiUserId = refreshed.canopiUserId;
    sessionChanged = refreshed.changed;
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
