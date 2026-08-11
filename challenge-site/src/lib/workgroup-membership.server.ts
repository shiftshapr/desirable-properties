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

const TEASER_LIMIT = 5;

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

/** True when user_id appears on the workgroup members list (direct Gov Hub check). */
export async function isUserOnWorkgroupMembersList(
  workgroupId: string,
  userId: string,
): Promise<boolean> {
  const id = String(userId || '').trim();
  const wgId = String(workgroupId || '').trim();
  if (!id || !wgId) return false;
  try {
    const res = await fetch(
      `${GOVHUB_PUBLIC_BASE_URL}/api/workgroups/${encodeURIComponent(wgId)}/members/`,
      { cache: 'no-store' },
    );
    if (!res.ok) return false;
    const data = (await res.json()) as {
      members?: Array<{ user_id?: string | null }>;
    };
    return (data.members ?? []).some((m) => String(m.user_id || '').trim() === id);
  } catch {
    return false;
  }
}

/** Resolve membership: signups aggregate first, then direct members list. */
export async function resolveWorkgroupMembership(
  workgroupId: string,
  userId: string,
): Promise<boolean> {
  const memberIds = await fetchUserMemberWorkgroupIds(userId);
  if (memberIds.has(workgroupId)) return true;
  return isUserOnWorkgroupMembersList(workgroupId, userId);
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

function emptyMessagesResponse(
  isMember: boolean,
  full: boolean,
  teaserMessages: WorkgroupMessagesResponse['messages'] = [],
): WorkgroupMessagesResponse {
  const messages = isMember && full ? [] : teaserMessages.slice(0, TEASER_LIMIT);
  return {
    messages,
    is_member: isMember,
    can_post: isMember,
    teaser: !isMember || !full,
    count: messages.length,
  };
}

/**
 * Fetch workgroup messages for the local proxy route. Gov Hub may return
 * is_member:false for signed-in members (teaser mode, stale token, etc.) —
 * reconcile with signups/members list before responding.
 */
export async function fetchWorkgroupMessagesServer(
  workgroupId: string,
  opts?: {
    session?: HermesSession | null;
    full?: boolean;
    teaserMessages?: WorkgroupMessagesResponse['messages'];
  },
): Promise<WorkgroupMessagesResponse> {
  const session = opts?.session !== undefined ? opts.session : await readSession();
  const full = Boolean(opts?.full);
  const teaser = opts?.teaserMessages ?? [];

  const signupsMember =
    session?.userId != null
      ? await resolveWorkgroupMembership(workgroupId, session.userId)
      : false;

  const upstream =
    session?.idToken != null
      ? await fetchGovHubMessages(workgroupId, session, full)
      : null;

  if (upstream) {
    if (signupsMember && !upstream.is_member) {
      return {
        ...upstream,
        is_member: true,
        can_post: upstream.can_post || true,
      };
    }
    return upstream;
  }

  return emptyMessagesResponse(signupsMember, full, teaser);
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

  const signupsMember = await resolveWorkgroupMembership(workgroupId, session.userId);
  const data = session.idToken ? await fetchGovHubMessages(workgroupId, session, true) : null;

  if (!data) {
    return {
      isMember: signupsMember,
      canPost: signupsMember,
      membershipResolved: true,
      messages: teaser,
    };
  }

  const isMember = Boolean(data.is_member) || signupsMember;
  return {
    isMember,
    canPost: Boolean(data.can_post) || signupsMember,
    membershipResolved: true,
    messages: isMember ? data.messages || [] : data.messages || teaser,
  };
}
