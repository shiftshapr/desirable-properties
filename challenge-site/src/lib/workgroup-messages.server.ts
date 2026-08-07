import { readSession, type HermesSession } from '@/lib/auth-session';
import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import { fetchWorkgroupSignups } from '@/lib/workgroup-signups';
import type { WorkgroupMessagesResponse } from '@/lib/workgroup-collab-types';

const TEASER_LIMIT = 5;

async function memberIdsFromSignups(userId: string): Promise<Set<string>> {
  const id = String(userId || '').trim();
  if (!id) return new Set();
  const signups = await fetchWorkgroupSignups({ fresh: true });
  if (!signups) return new Set();
  const person = signups.people.find((p) => p.user_id === id);
  if (!person) return new Set();
  return new Set(person.workgroups.map((wg) => wg.id));
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
  const memberIds = await memberIdsFromSignups(userId);
  if (memberIds.has(workgroupId)) return true;
  return isUserOnWorkgroupMembersList(workgroupId, userId);
}

async function fetchGovHubMessagesRaw(
  workgroupId: string,
  session: HermesSession | null,
  full: boolean,
): Promise<{ ok: true; data: WorkgroupMessagesResponse } | { ok: false; status: number }> {
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
    if (!res.ok) return { ok: false, status: res.status };
    const data = (await res.json()) as WorkgroupMessagesResponse;
    return { ok: true, data };
  } catch {
    return { ok: false, status: 502 };
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
 * Fetch workgroup messages from Gov Hub when deployed; otherwise resolve membership
 * via signups/members API and return a valid payload (messages may be empty).
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

  const upstream = await fetchGovHubMessagesRaw(workgroupId, session, full);
  if (upstream.ok) {
    return upstream.data;
  }

  const isMember =
    session?.userId != null
      ? await resolveWorkgroupMembership(workgroupId, session.userId)
      : false;

  return emptyMessagesResponse(isMember, full, teaser);
}
