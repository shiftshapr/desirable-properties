import { GOVHUB_PUBLIC_BASE_URL } from '@/lib/govhub';

const METAWEB_LAYER_ID =
  process.env.GOVHUB_METAWEB_LAYER_ID ?? '22d90c89-2783-4726-a8b6-220dca505402';

export type WorkgroupSignupMember = {
  id: string;
  user_id: string | null;
  user_name: string | null;
  joined_at: string | null;
};

export type WorkgroupSignupGroup = {
  id: string;
  name: string;
  slug: string;
  acronym: string;
  member_count: number;
  members: WorkgroupSignupMember[];
};

export type WorkgroupSignupPerson = {
  user_id: string | null;
  user_name: string | null;
  workgroups: Array<{
    id: string;
    name: string;
    slug: string;
    acronym: string;
    joined_at: string | null;
  }>;
};

export type WorkgroupSignupsPayload = {
  workgroups: WorkgroupSignupGroup[];
  people: WorkgroupSignupPerson[];
  total_memberships: number;
  total_people: number;
};

/** Workgroups that have at least one member (empty groups stay in the list). */
export function occupiedWorkgroupCount(
  workgroups: Array<{ member_count?: number; members?: unknown[] }>,
): number {
  return workgroups.filter(
    (group) => (group.member_count ?? 0) > 0 || (group.members?.length ?? 0) > 0,
  ).length;
}

export async function fetchWorkgroupSignups(opts?: {
  /** Bypass Next.js fetch cache (use when resolving live membership for a signed-in user). */
  fresh?: boolean;
}): Promise<WorkgroupSignupsPayload | null> {
  const aggregated = await fetchSignupsAggregated(opts?.fresh);
  if (aggregated) return aggregated;
  return fetchSignupsFromWorkgroups(opts?.fresh);
}

async function fetchSignupsAggregated(fresh?: boolean): Promise<WorkgroupSignupsPayload | null> {
  try {
    const res = await fetch(
      `${GOVHUB_PUBLIC_BASE_URL}/api/layers/${METAWEB_LAYER_ID}/workgroup-signups/`,
      fresh ? { cache: 'no-store' } : { next: { revalidate: 120 } },
    );
    if (!res.ok) return null;
    return (await res.json()) as WorkgroupSignupsPayload;
  } catch {
    return null;
  }
}

type WorkgroupsResponse = {
  workgroups?: Array<{
    id: string;
    name: string;
    slug: string;
    acronym?: string;
  }>;
};

type MembersResponse = {
  members?: Array<{
    id: string;
    user_id: string | null;
    user_name: string | null;
    joined_at: string | null;
  }>;
};

async function fetchSignupsFromWorkgroups(fresh?: boolean): Promise<WorkgroupSignupsPayload | null> {
  try {
    const fetchOpts = fresh ? { cache: 'no-store' as const } : { next: { revalidate: 120 } };
    const workgroupsRes = await fetch(
      `${GOVHUB_PUBLIC_BASE_URL}/api/layers/${METAWEB_LAYER_ID}/workgroups/`,
      fetchOpts,
    );
    if (!workgroupsRes.ok) return null;
    const workgroupsData = (await workgroupsRes.json()) as WorkgroupsResponse;
    const dpWorkgroups = (workgroupsData.workgroups ?? []).filter((wg) => {
      const slug = String(wg.slug || wg.acronym || '')
        .trim()
        .toLowerCase();
      return slug === 'dp-discovery' || /^DP\d+\b/i.test(wg.name);
    });

    const byWorkgroup: WorkgroupSignupGroup[] = [];
    const peopleMap = new Map<string, WorkgroupSignupPerson>();

    await Promise.all(
      dpWorkgroups.map(async (wg) => {
        const membersRes = await fetch(
          `${GOVHUB_PUBLIC_BASE_URL}/api/workgroups/${encodeURIComponent(wg.id)}/members/`,
          fetchOpts,
        );
        const membersData = membersRes.ok
          ? ((await membersRes.json()) as MembersResponse)
          : { members: [] };
        const members = membersData.members ?? [];

        byWorkgroup.push({
          id: wg.id,
          name: wg.name,
          slug: wg.slug,
          acronym: wg.acronym ?? wg.slug,
          member_count: members.length,
          members: members.map((member) => ({
            id: member.id,
            user_id: member.user_id,
            user_name: member.user_name,
            joined_at: member.joined_at,
          })),
        });

        for (const member of members) {
          const personKey = member.user_id || member.user_name || member.id;
          const existing = peopleMap.get(personKey) ?? {
            user_id: member.user_id,
            user_name: member.user_name,
            workgroups: [],
          };
          existing.workgroups.push({
            id: wg.id,
            name: wg.name,
            slug: wg.slug,
            acronym: wg.acronym ?? wg.slug,
            joined_at: member.joined_at,
          });
          peopleMap.set(personKey, existing);
        }
      }),
    );

    byWorkgroup.sort((a, b) => {
      const aNum = Number(a.name.match(/^DP(\d+)/i)?.[1] ?? 999);
      const bNum = Number(b.name.match(/^DP(\d+)/i)?.[1] ?? 999);
      if (aNum !== bNum) return aNum - bNum;
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
    });

    const people = Array.from(peopleMap.values()).sort((a, b) =>
      (a.user_name || '').localeCompare(b.user_name || '', undefined, { sensitivity: 'base' }),
    );

    return {
      workgroups: byWorkgroup,
      people,
      total_memberships: byWorkgroup.reduce((sum, wg) => sum + wg.member_count, 0),
      total_people: people.length,
    };
  } catch {
    return null;
  }
}

import { formatUserDate } from '@/lib/format-user-datetime';

export function formatSignupDate(iso: string | null | undefined): string {
  if (!iso) return '–';
  const formatted = formatUserDate(iso);
  return formatted || '–';
}
