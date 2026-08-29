import type { ThreadShareActivity } from '@/lib/hermesShareActivity';
import type { HermesThreadSummary } from '@/components/HermesThreadSidebar';

export type CommunityCollabParticipant = {
  label: string;
  role: string;
};

const HERMES_THREAD_ID_PREFIX = 'hermes:thread:';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Canonical Hermes thread id (sidebar lists use hermes:thread:{uuid}). */
export function normalizeHermesThreadId(threadId?: string | null): string | null {
  const trimmed = String(threadId || '').trim();
  if (!trimmed) return null;
  if (trimmed.startsWith(HERMES_THREAD_ID_PREFIX)) return trimmed;
  if (UUID_RE.test(trimmed)) return `${HERMES_THREAD_ID_PREFIX}${trimmed}`;
  return trimmed;
}

/** Community Chat uses the group collab pattern: everyone invited can prompt Deepi. */
export function isCommunityCollabThread(
  thread?: Pick<HermesThreadSummary, 'threadKind'> | null,
): boolean {
  return thread?.threadKind === 'group';
}

export function communityCollabTitle(
  thread?: Pick<HermesThreadSummary, 'groupTitle' | 'title'> | null,
): string {
  return (thread?.groupTitle || thread?.title || 'Community Chat').trim() || 'Community Chat';
}

/** Active invitees from share grants (owner sees via shares API). */
export function communityParticipantsFromShares(
  shares: ThreadShareActivity[],
): CommunityCollabParticipant[] {
  const seen = new Set<string>();
  const participants: CommunityCollabParticipant[] = [];

  for (const share of shares) {
    if (share.status !== 'active') continue;
    for (const recipient of share.recipients) {
      if (recipient.role === 'owner_watch') continue;
      const label = recipient.displayName || recipient.email;
      if (!label) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      participants.push({
        label,
        role: recipient.hasControl ? 'controller' : recipient.role,
      });
    }
  }

  return participants;
}
