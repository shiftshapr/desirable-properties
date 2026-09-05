import type { WorkgroupRosterMember } from '@/lib/workgroup-collab-api';
import {
  fetchCanopiProfileByEmail,
  fetchCanopiProfileByHandle,
  type CanopiPublicProfile,
} from '@/lib/canopi-public-profile';
import { fetchGovHubUserEmails, isGovHubUserId } from '@/lib/dp-govhub-user';
import { searchCanopiUsersServer } from '@/lib/dp-canopi-user-search';

function attachCanopiProfile(
  member: WorkgroupRosterMember,
  profile: CanopiPublicProfile,
): WorkgroupRosterMember {
  return {
    ...member,
    username: profile.handle,
    canopi_handle: profile.handle,
    canopi_profile_url: profile.profileUrl,
    canopi_avatar_url: profile.avatarUrl,
  };
}

function normalizeDisplayName(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

async function fetchCanopiProfileByDisplayName(
  displayName: string,
): Promise<CanopiPublicProfile | null> {
  const target = normalizeDisplayName(displayName);
  if (target.length < 2) return null;

  const rows = await searchCanopiUsersServer(displayName, 8);
  const exact = rows.find(
    (row) =>
      normalizeDisplayName(row.displayName) === target
      || normalizeDisplayName(row.name) === target,
  );
  if (!exact?.handle) return null;
  return fetchCanopiProfileByHandle(exact.handle);
}

/** Attach Canopi handle, profile URL, and avatar for workgroup roster rows. */
export async function enrichWorkgroupRosterWithCanopi(
  members: WorkgroupRosterMember[],
): Promise<WorkgroupRosterMember[]> {
  const govHubIds = members
    .map((member) => String(member.user_id || '').trim())
    .filter(isGovHubUserId);
  const emailByGovHubId = await fetchGovHubUserEmails(govHubIds);

  return Promise.all(
    members.map(async (member) => {
      const handle = String(member.username || '').trim().replace(/^@/, '');
      if (handle) {
        const profile = await fetchCanopiProfileByHandle(handle);
        if (profile) return attachCanopiProfile(member, profile);
      }

      const email = emailByGovHubId.get(String(member.user_id || '').trim());
      if (email) {
        const profile = await fetchCanopiProfileByEmail(email);
        if (profile) return attachCanopiProfile(member, profile);
      }

      const byName = await fetchCanopiProfileByDisplayName(member.user_name);
      if (byName) return attachCanopiProfile(member, byName);

      return member;
    }),
  );
}
