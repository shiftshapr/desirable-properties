import { readSession, type HermesSession } from '@/lib/auth-session';
import { fetchWorkgroupSignups } from '@/lib/workgroup-signups';
import { resolveWorkgroupMembership } from '@/lib/workgroup-messages.server';
import { fetchWorkgroupMessagesServer } from '@/lib/workgroup-messages.server';
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
  if (person) return new Set(person.workgroups.map((wg) => wg.id));
  return new Set();
}

/** Check membership for one workgroup (signups + direct members list). */
export async function isSessionMemberOfWorkgroup(workgroupId: string): Promise<boolean> {
  const session = await readSession();
  if (!session?.userId) return false;
  return resolveWorkgroupMembership(workgroupId, session.userId);
}

export async function readSessionMemberWorkgroupIds(): Promise<Set<string>> {
  const session = await readSession();
  if (!session?.userId) return new Set();
  return fetchUserMemberWorkgroupIds(session.userId);
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

  if (!session?.userId) {
    return {
      isMember: false,
      canPost: false,
      membershipResolved: true,
      messages: teaser,
    };
  }

  const data = await fetchWorkgroupMessagesServer(workgroupId, {
    session,
    full: true,
    teaserMessages: teaser,
  });

  const isMember = Boolean(data.is_member);
  return {
    isMember,
    canPost: Boolean(data.can_post),
    membershipResolved: true,
    messages: isMember ? data.messages || [] : data.messages || teaser,
  };
}
