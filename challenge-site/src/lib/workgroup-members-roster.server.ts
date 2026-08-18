import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';
import {
  isUserOnWorkgroupMembersList,
  resolveWorkgroupMembership,
} from '@/lib/workgroup-membership.server';
import {
  isWorkgroupShareFacilitator,
  WORKGROUP_SHARE_FACILITATOR_POSITIONS,
} from '@/lib/workgroup-share-restrictions';

export type WorkgroupRosterMember = {
  user_id: string;
  user_name: string;
  joined_at: string | null;
  positions: string[];
  is_facilitator: boolean;
};

type GovHubMemberRow = {
  user_id?: string | null;
  user_name?: string | null;
  joined_at?: string | null;
};

type GovHubChairRow = {
  user_id?: string | null;
  position_key?: string | null;
  status?: string | null;
  approved?: boolean;
};

const APPROVED_CHAIR_STATUSES = new Set(['approved']);

async function fetchGovHubJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${GOVHUB_PUBLIC_BASE_URL}${path}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchWorkgroupRoster(workgroupId: string): Promise<WorkgroupRosterMember[]> {
  const [membersData, chairsData] = await Promise.all([
    fetchGovHubJson<{ members?: GovHubMemberRow[] }>(
      `/api/workgroups/${encodeURIComponent(workgroupId)}/members/`,
    ),
    fetchGovHubJson<{ chairs?: GovHubChairRow[] }>(
      `/api/workgroups/${encodeURIComponent(workgroupId)}/chairs/`,
    ),
  ]);

  const positionsByUser = new Map<string, Set<string>>();
  for (const chair of chairsData?.chairs ?? []) {
    const uid = String(chair.user_id || '').trim();
    if (!uid) continue;
    const approved =
      chair.approved === true
      || APPROVED_CHAIR_STATUSES.has(String(chair.status || '').trim().toLowerCase());
    if (!approved) continue;
    const key = String(chair.position_key || 'chair').trim();
    const set = positionsByUser.get(uid) ?? new Set<string>();
    set.add(key);
    positionsByUser.set(uid, set);
  }

  const roster: WorkgroupRosterMember[] = [];
  for (const member of membersData?.members ?? []) {
    const userId = String(member.user_id || '').trim();
    if (!userId) continue;
    const positions = [...(positionsByUser.get(userId) ?? [])];
    roster.push({
      user_id: userId,
      user_name: String(member.user_name || 'Member').trim() || 'Member',
      joined_at: member.joined_at ? String(member.joined_at) : null,
      positions,
      is_facilitator: isWorkgroupShareFacilitator(positions),
    });
  }

  roster.sort((a, b) => a.user_name.localeCompare(b.user_name, undefined, { sensitivity: 'base' }));
  return roster;
}

export async function fetchUserWorkgroupPositions(
  workgroupId: string,
  userId: string,
): Promise<string[]> {
  const roster = await fetchWorkgroupRoster(workgroupId);
  return roster.find((m) => m.user_id === userId)?.positions ?? [];
}

export async function resolveWorkgroupRecipient(
  workgroupId: string,
  query: string,
  opts?: { excludeUserId?: string | null },
): Promise<{ member: WorkgroupRosterMember } | { error: string }> {
  const trimmed = String(query || '').trim();
  if (!trimmed) return { error: 'Recipient required' };

  const roster = await fetchWorkgroupRoster(workgroupId);
  const q = trimmed.toLowerCase();
  const candidates = roster.filter((m) => {
    if (opts?.excludeUserId && m.user_id === opts.excludeUserId) return false;
    const name = m.user_name.toLowerCase();
    return m.user_id === trimmed || name === q || name.includes(q);
  });

  if (candidates.length === 0) {
    return {
      error: 'Recipient must be a workgroup member. External emails are not allowed.',
    };
  }
  if (candidates.length > 1) {
    return { error: 'Multiple members match that name. Be more specific.' };
  }
  return { member: candidates[0]! };
}

export async function assertActiveWorkgroupMember(
  workgroupId: string,
  userId: string,
): Promise<boolean> {
  return resolveWorkgroupMembership(workgroupId, userId);
}

export { WORKGROUP_SHARE_FACILITATOR_POSITIONS };
