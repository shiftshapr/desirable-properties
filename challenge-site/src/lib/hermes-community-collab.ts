import type { ThreadShareActivity } from '@/lib/hermesShareActivity';
import type { HermesThreadSummary } from '@/components/HermesThreadSidebar';

export type CommunityCollabParticipant = {
  label: string;
  role: string;
};

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
