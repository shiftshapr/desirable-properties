import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { fetchGovHubUserEmails, isGovHubUserId } from '@/lib/dp-govhub-user';
import { fetchWorkgroupSignups } from '@/lib/workgroup-signups';

/**
 * Gov Hub "people you're connected with" for share/invite pickers:
 * co-members across workgroups the signed-in user belongs to.
 */
export async function GET() {
  const session = await readSession();
  if (!session?.userId || !isGovHubUserId(session.userId)) {
    return NextResponse.json({ users: [], count: 0 });
  }

  const signups = await fetchWorkgroupSignups({ fresh: true });
  if (!signups?.workgroups?.length) {
    return NextResponse.json({ users: [], count: 0 });
  }

  const myId = session.userId;
  const myWorkgroupIds = new Set<string>();
  for (const wg of signups.workgroups) {
    if (wg.members.some((m) => m.user_id === myId)) {
      myWorkgroupIds.add(wg.id);
    }
  }

  const peerMeta = new Map<string, { display_name: string }>();
  for (const wg of signups.workgroups) {
    if (!myWorkgroupIds.has(wg.id)) continue;
    for (const member of wg.members) {
      const uid = member.user_id?.trim();
      if (!uid || uid === myId || !isGovHubUserId(uid)) continue;
      if (!peerMeta.has(uid)) {
        peerMeta.set(uid, {
          display_name: String(member.user_name || 'Member').trim() || 'Member',
        });
      }
    }
  }

  const peerIds = [...peerMeta.keys()];
  if (!peerIds.length) {
    return NextResponse.json({ users: [], count: 0 });
  }

  const emails = await fetchGovHubUserEmails(peerIds);
  const users = peerIds
    .map((id) => {
      const email = emails.get(id);
      if (!email) return null;
      const meta = peerMeta.get(id);
      return {
        id,
        email,
        display_name: meta?.display_name || email,
        username: email.split('@')[0] || '',
        handle: null,
        connected: true,
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(a!.display_name).localeCompare(String(b!.display_name)));

  return NextResponse.json({ users, count: users.length });
}
