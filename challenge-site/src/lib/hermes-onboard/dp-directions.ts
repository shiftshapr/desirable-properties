import { buildAgentHref } from '@/lib/agent-starter';
import { getCivicChallenge } from '@/lib/civic-challenges';
import { getDpRegistryEntry } from '@/lib/dp-registry';
import { bookDiscussHref } from '@/lib/govhub';
import { dpWorkgroupSlug } from '@/lib/dp-workgroup-slugs';
import { workgroupPrimaryHref } from '@/lib/workgroup-links';
import type { AllianceOrg, DpDirection } from '@/lib/hermes-onboard/types';

const TAG_DPS: Record<string, string[]> = {
  identity: ['DP1', 'DP2', 'DP5'],
  dsnp: ['DP2', 'DP4', 'DP7', 'DP20'],
  steward: ['DP8', 'DP20', 'DP3'],
  institute: ['DP10', 'DP14', 'DP22', 'DP12'],
  research: ['DP10', 'DP22', 'DP14'],
  policy: ['DP3', 'DP12', 'DP20'],
  labs: ['DP7', 'DP5', 'DP11', 'DP13'],
  protocol: ['DP7', 'DP5', 'DP1'],
  frequency: ['DP5', 'DP7', 'DP4'],
};

const DEFAULT_DPS = ['DP2', 'DP4', 'DP20', 'DP8'];

function hermesPatchHref(org: AllianceOrg, dpId: string): string {
  return buildAgentHref({
    dp: dpId,
    intent: 'alliance_patch',
    slug: org.slug,
  });
}

export function patchSeed(org: AllianceOrg, dpId: string): { direction: string; patchIdea: string } {
  const name = org.shortName;
  switch (dpId) {
    case 'DP1':
      return {
        direction: `Can ${name}'s identity work sit beside federated authentication without becoming another platform login?`,
        patchIdea: `Clarify in DP1 that self-sovereign or DSNP-class identifiers are valid accountability anchors, not second-class to platform accounts.`,
      };
    case 'DP2':
      return {
        direction: `Does ${name}'s agency claim stop at data export, or does it include control of attention and presence?`,
        patchIdea: `Add that portable social graphs and presence settings are required expressions of participant agency, not optional app features.`,
      };
    case 'DP3':
      return {
        direction: `How should Alliance-scale governance grow without unifying everyone into one feed?`,
        patchIdea: `State that adaptive governance may remain plural across Alliance members so long as interoperability and exit remain intact.`,
      };
    case 'DP4':
      return {
        direction: `Where does ${name}'s “people own their data” language need to become an enforceable affordance?`,
        patchIdea: `Require that personal data created in a layer can leave with the person, including social graph, without a platform petition.`,
      };
    case 'DP5':
      return {
        direction: `Should Frequency / namespace work be named as an example of decentralized naming rather than a single mandated stack?`,
        patchIdea: `Note that multiple naming systems may coexist if they remain user-portable and are not captured by one commercial resolver.`,
      };
    case 'DP7':
      return {
        direction: `What must stay simple so ${name}'s protocol work can interoperate with other Alliance layers?`,
        patchIdea: `Require a documented bridge and export path between protocol identities and Overweb / layer identities.`,
      };
    case 'DP8':
      return {
        direction: `How do Alliance members share a collaboration space without collapsing into one platform community?`,
        patchIdea: `Define meta-communities as optional shared rooms with explicit consent, not an ambient social network that harvests the Alliance listserv.`,
      };
    case 'DP10':
      return {
        direction: `What should researchers and fellows be invited to teach or contest in the DP corpus?`,
        patchIdea: `Add that educational onboarding must show the live patch trail, not only a finished property statement.`,
      };
    case 'DP11':
      return {
        direction: `If Labs ships AI products, which safety claims belong in DP11 versus product policy?`,
        patchIdea: `Require glass-box disclosure when AI drafts norms that later bind a community, including this briefing itself.`,
      };
    case 'DP12':
      return {
        direction: `Who ratifies AI-assisted policy when Institute, Labs, and Alliance members disagree?`,
        patchIdea: `Bound AI assistance so communities can reject a draft without losing the human deliberation record.`,
      };
    case 'DP13':
      return {
        direction: `What containment is needed before protocol-adjacent AI agents act in a shared layer?`,
        patchIdea: `Sandbox agent write-access until a named human steward accepts the action against an ML-REQ.`,
      };
    case 'DP14':
      return {
        direction: `How should ${name} show when Deepi inferred from public pages versus when a human confirmed?`,
        patchIdea: `Require provenance on AI-assisted governance artifacts: source URLs, confirmations, and remaining hypotheses.`,
      };
    case 'DP20':
      return {
        direction: `This is the anti-capture test: can ${name}'s coordination space stay owned by people if commercial players arrive later?`,
        patchIdea: `Strengthen anti-capture language: community rules and exit rights are written before large commercial platforms are invited to play.`,
      };
    case 'DP22':
      return {
        direction: `What civic memory should Alliance research leave so later members can see why a property changed?`,
        patchIdea: `Require that contested summaries of Alliance public work remain linked to original-language sources.`,
      };
    default:
      return {
        direction: `How does ${name}'s public mission press on this property?`,
        patchIdea: `Propose one sentence that would make this property testable against “${org.mission}”.`,
      };
  }
}

export function relatedDpIdsForOrg(org: AllianceOrg): string[] {
  if (org.relatedDps && org.relatedDps.length > 0) {
    return Array.from(new Set(org.relatedDps.map((id) => id.toUpperCase())));
  }
  const fromTags = org.tags.flatMap((tag) => TAG_DPS[tag] || []);
  const merged = [...fromTags, ...DEFAULT_DPS];
  return Array.from(new Set(merged)).slice(0, 6);
}

export function generateDpDirections(org: AllianceOrg): DpDirection[] {
  const directions: DpDirection[] = [];
  for (const dpId of relatedDpIdsForOrg(org)) {
    const entry = getDpRegistryEntry(dpId);
    if (!entry) continue;
    const challenge = getCivicChallenge(entry.id);
    const seed = patchSeed(org, entry.id);
    const slug = dpWorkgroupSlug(entry.id);
    const citations = org.sources.slice(0, 2).map((source) => ({
      label: source.label,
      url: source.url,
    }));
    const whyFromCorpus = challenge
      ? `Your stated mission ("${org.mission}") sits next to ${entry.id}'s human issue: ${challenge.humanIssue}. Guiding question: ${challenge.guidingQuestion}`
      : `Your stated mission ("${org.mission}") is the reason we opened ${entry.id} (${entry.name}) rather than a generic intro.`;
    directions.push({
      dpId: entry.id,
      dpName: entry.name,
      whyFromCorpus,
      direction: seed.direction,
      patchIdea: seed.patchIdea,
      hypothesis: true,
      citations,
      chapterHref: entry.siteUrl,
      discussHref: bookDiscussHref({ dpId: entry.id }),
      hermesHref: hermesPatchHref(org, entry.id),
      workgroupHref: slug ? workgroupPrimaryHref(slug) : '/workgroups',
    });
  }
  return directions;
}

export function defaultPitch(org: AllianceOrg): NonNullable<AllianceOrg['pitch']> {
  if (org.pitch) return org.pitch;
  return {
    headline: `We started a page for ${org.shortName}. Did we hear you correctly?`,
    lead: `This briefing is an invitation, not a finished strategy. We used only public pages you already published. We want your input, your existing work, and anything we should add so the Desirable Properties take your concerns seriously.`,
    ask: `Tell us what we got wrong, then weigh in on the related DPs. Follow one interest far enough and you will have a specific patch idea.`,
    captureLine: `The commercial internet had no pause to write community rules before it was captured. This is that pause: design the people's rules, then invite the commercial world to play by them.`,
  };
}
