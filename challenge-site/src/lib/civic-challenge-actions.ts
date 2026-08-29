import type { CivicChallenge, CivicChallengeAction } from '@/data/civic-challenges/schema';
import { buildAgentHref } from '@/lib/agent-starter';
import { bookDiscussHref } from '@/lib/govhub';
import { dpWorkgroupSlug } from '@/lib/dp-workgroup-slugs';
import { workgroupPrimaryHref } from '@/lib/workgroup-links';
import { WORKGROUPS_LIST_HREF } from '@/lib/routes';

export type ResolvedCivicAction = CivicChallengeAction & {
  href: string;
  external?: boolean;
};

function catalogDpId(challenge: CivicChallenge): string {
  if (challenge.number != null) return `DP${challenge.number}`;
  const m = String(challenge.id).match(/^dp(\d+)$/i);
  return m ? `DP${Number(m[1])}` : challenge.id.toUpperCase();
}

/**
 * Map presentation-agnostic action ids to site URLs.
 */
export function resolveCivicChallengeActions(
  challenge: CivicChallenge,
  opts?: { workgroupSlug?: string | null },
): ResolvedCivicAction[] {
  const catalogId = catalogDpId(challenge);
  const slug = opts?.workgroupSlug || dpWorkgroupSlug(catalogId);
  const workgroupHref = slug ? workgroupPrimaryHref(slug) : WORKGROUPS_LIST_HREF;

  return challenge.actions.map((action) => {
    switch (action.id) {
      case 'submit_problem':
        return {
          ...action,
          href: buildAgentHref({ dp: catalogId, intent: 'submit_problem' }),
        };
      case 'companion':
        return {
          ...action,
          href: buildAgentHref({ dp: catalogId }),
        };
      case 'improve':
        return {
          ...action,
          href: bookDiscussHref({ dpId: catalogId }),
          external: true,
        };
      case 'join_workgroup':
        return {
          ...action,
          href: workgroupHref,
        };
      case 'curate':
        return {
          ...action,
          href: buildAgentHref({ dp: catalogId, intent: 'curate' }),
        };
      default:
        return {
          ...action,
          href: `/dp/${challenge.id}`,
        };
    }
  });
}
