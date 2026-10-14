import type { WorkgroupRosterMember } from '@/lib/workgroup-collab-api';
import {
  fetchCanopiProfileByEmail,
  fetchCanopiProfileByHandle,
  type CanopiPublicProfile,
} from '@/lib/canopi-public-profile';
import { fetchGovHubUserEmails, isGovHubUserId } from '@/lib/dp-govhub-user';
import { searchCanopiUsersServer } from '@/lib/dp-canopi-user-search';
import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';
import { isEmailRelayMessage } from '@/lib/workgroup-relay-message';
import { resolveCanopiProfileChain } from '@/lib/canopi-profile-chain';

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

const canopiLookups = {
  byHandle: fetchCanopiProfileByHandle,
  byEmail: fetchCanopiProfileByEmail,
  byDisplayName: fetchCanopiProfileByDisplayName,
};

type GovHubPerson = {
  handle?: string | null;
  email?: string | null;
  displayName?: string | null;
};

/**
 * Canopi profile for a roster member: Gov Hub handle as a Canopi handle, then the Gov Hub
 * account email, then an exact display-name match.
 * `email` is the Gov Hub account email when the caller already has it.
 */
export async function resolveCanopiProfileForGovHubUser(
  person: GovHubPerson,
): Promise<CanopiPublicProfile | null> {
  return resolveCanopiProfileChain(person, canopiLookups, { allowNameMatch: true });
}

/**
 * Canopi profile for a relayed email author: handle, then email. Never by display name
 * (identity by email only; a wrong person's link is worse than no link).
 */
export async function resolveCanopiProfileForRelayAuthor(
  person: GovHubPerson,
): Promise<CanopiPublicProfile | null> {
  return resolveCanopiProfileChain(person, canopiLookups, { allowNameMatch: false });
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
      const profile = await resolveCanopiProfileForGovHubUser({
        handle: member.username,
        email: emailByGovHubId.get(String(member.user_id || '').trim()),
        displayName: member.user_name,
      });
      return profile ? attachCanopiProfile(member, profile) : member;
    }),
  );
}

const MESSAGE_PROFILE_TTL_MS = 10 * 60 * 1000;
const messageProfileCache = new Map<string, { url: string | null; at: number }>();

/**
 * Add `author_canopi_profile_url` to email-relay chat messages (handle or email only).
 * Other messages are returned unchanged. Results are cached per author for 10 minutes
 * because the chat panel refreshes every 30 seconds.
 */
export async function enrichRelayMessagesWithCanopi(
  messages: WorkgroupMessage[],
): Promise<WorkgroupMessage[]> {
  const relay = messages.filter(isEmailRelayMessage);
  if (!relay.length) return messages;

  const now = Date.now();
  const urlByAuthor = new Map<string, string | null>();
  const pending = new Map<string, WorkgroupMessage>();
  for (const msg of relay) {
    const key = String(msg.author_user_id || '').trim();
    if (!key || urlByAuthor.has(key) || pending.has(key)) continue;
    const cached = messageProfileCache.get(key);
    if (cached && now - cached.at < MESSAGE_PROFILE_TTL_MS) {
      urlByAuthor.set(key, cached.url);
    } else {
      pending.set(key, msg);
    }
  }

  if (pending.size) {
    const emailByGovHubId = await fetchGovHubUserEmails(
      [...pending.keys()].filter(isGovHubUserId),
    );
    await Promise.all(
      [...pending.entries()].map(async ([key, msg]) => {
        const profile = await resolveCanopiProfileForRelayAuthor({
          handle: msg.author_handle ?? msg.handle,
          email: emailByGovHubId.get(key),
        }).catch(() => null);
        const url = profile?.profileUrl || null;
        urlByAuthor.set(key, url);
        messageProfileCache.set(key, { url, at: now });
      }),
    );
  }

  return messages.map((msg) => {
    if (!isEmailRelayMessage(msg)) return msg;
    const url = urlByAuthor.get(String(msg.author_user_id || '').trim()) ?? null;
    return { ...msg, author_canopi_profile_url: url };
  });
}
