import { readSession, type HermesSession } from '@/lib/auth-session';
import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import { fetchWorkgroupSignups } from '@/lib/workgroup-signups';
import type { WorkgroupMessagesResponse } from '@/lib/workgroup-collab-types';

export type WorkgroupMembershipSnapshot = {
  isMember: boolean;
  canPost: boolean;
  membershipResolved: boolean;
  messages: WorkgroupMessagesResponse['messages'];
};

/** Workgroup IDs the signed-in Gov Hub user belongs to (from layer signups aggregate). */
export async function fetchUserMemberWorkgroupIds(userId: string): Promise<Set<string>> {
  const id = String(userId || '').trim();
  if (!id) return new Set();
  const signups = await fetchWorkgroupSignups({ fresh: true });
  if (!signups) return new Set();
  const person = signups.people.find((p) => p.user_id === id);
  if (!person) return new Set();
  return new Set(person.workgroups.map((wg) => wg.id));
}

export async function readSessionMemberWorkgroupIds(): Promise<Set<string>> {
  const session = await readSession();
  if (!session?.userId) return new Set();
  return fetchUserMemberWorkgroupIds(session.userId);
}

async function fetchGovHubMessages(
  workgroupId: string,
  session: HermesSession | null,
  full: boolean,
): Promise<WorkgroupMessagesResponse | null> {
  try {
    const url = new URL(
      `${GOVHUB_PUBLIC_BASE_URL}/api/workgroups/${encodeURIComponent(workgroupId)}/messages/`,
    );
    if (full) url.searchParams.set('full', '1');
    const headers: HeadersInit = { Accept: 'application/json' };
    if (session?.idToken) {
      headers.Authorization = `Bearer ${session.idToken}`;
    }
    const res = await fetch(url.toString(), { cache: 'no-store', headers });
    if (!res.ok) return null;
    return (await res.json()) as WorkgroupMessagesResponse;
  } catch {
    return null;
  }
}

/** Resolve membership and messages on the server to avoid client-side UI flicker. */
export async function fetchWorkgroupMembershipSnapshot(
  workgroupId: string,
  opts?: {
    session?: HermesSession | null;
    teaserMessages?: WorkgroupMessagesResponse['messages'];
  },
): Promise<WorkgroupMembershipSnapshot> {
  const session = opts?.session !== undefined ? opts.session : await readSession();
  const teaser = opts?.teaserMessages ?? [];

  if (!session?.idToken) {
    return {
      isMember: false,
      canPost: false,
      membershipResolved: true,
      messages: teaser,
    };
  }

  const data = await fetchGovHubMessages(workgroupId, session, true);
  if (!data) {
    const memberIds = await fetchUserMemberWorkgroupIds(session.userId);
    const isMember = memberIds.has(workgroupId);
    return {
      isMember,
      canPost: isMember,
      membershipResolved: true,
      messages: teaser,
    };
  }

  const isMember = Boolean(data.is_member);
  return {
    isMember,
    canPost: Boolean(data.can_post),
    membershipResolved: true,
    messages: isMember ? data.messages || [] : data.messages || teaser,
  };
}
