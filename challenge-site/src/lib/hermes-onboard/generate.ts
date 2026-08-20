import { randomUUID } from 'crypto';
import { generateDpDirections } from '@/lib/hermes-onboard/dp-directions';
import { getAllianceOrg, resolvePartnerOrgs } from '@/lib/hermes-onboard/directory';
import { padHref } from '@/lib/hermes-onboard/tabs';
import type {
  AllianceOrg,
  BriefingMove,
  BriefingVersion,
  Citation,
  NextStep,
  OnboardSession,
  PrimitiveCopy,
  ValueMapping,
} from '@/lib/hermes-onboard/types';
import { PRIMITIVE_IDS } from '@/lib/hermes-onboard/types';

const PRIMITIVE_COPY: Record<(typeof PRIMITIVE_IDS)[number], { name: string; translation: string }> = {
  'community-layer': {
    name: 'Community layer',
    translation: 'A stewardship container that is not a vendor account',
  },
  'application-layer': {
    name: 'Application layer',
    translation: 'A tool that must obey your Minimum Permissible Affordances in code',
  },
  'overweb-id': {
    name: 'Overweb ID',
    translation: 'Staff and later members carry identity across partner environments',
  },
  tags: {
    name: 'Tags',
    translation: 'Durable handles on public pages, policies, and protocol objects',
  },
  bridges: {
    name: 'Bridges',
    translation: 'Verified relationships between your work and partner work',
  },
  'canopi-overlay': {
    name: 'Canopi overlay',
    translation: 'Discussion and presence on sites you already operate',
  },
  workgroup: {
    name: 'Gov Hub workgroup',
    translation: 'Where Alliance coordination becomes documented decisions',
  },
  guild: {
    name: 'Guild',
    translation: 'Cross-org group without forcing partners to join your layer',
  },
  mpa: {
    name: 'MPA / ML-REQ',
    translation: 'Rights you already claim, written so software can prove them',
  },
  'community-chat': {
    name: 'Hermes Community Chat',
    translation: 'Shared clerk for this briefing; everyone invited can prompt',
  },
};

function orgCitations(org: AllianceOrg): Citation[] {
  return org.sources.map((source) => ({ label: source.label, url: source.url }));
}

function partnerNames(org: AllianceOrg): string {
  const named = resolvePartnerOrgs(org).map((partner) => partner.name);
  const external = org.externalPartners.map((partner) => partner.name);
  const all = [...named, ...external];
  if (all.length === 0) return 'named Alliance partners you confirm';
  if (all.length === 1) return all[0];
  if (all.length === 2) return `${all[0]} and ${all[1]}`;
  return `${all.slice(0, -1).join(', ')}, and ${all[all.length - 1]}`;
}

function sourcesConfirmed(session: OnboardSession | null): boolean {
  return Boolean(session?.confirmed.sources);
}

function buildMoves(org: AllianceOrg, session: OnboardSession | null): BriefingMove[] {
  const citations = orgCitations(org);
  const hypothesis = !sourcesConfirmed(session);
  const partners = partnerNames(org);
  const dismissed = new Set(session?.dismissedMoveIds || []);
  const pinned = new Set(session?.pinnedMoveIds || []);
  const enabled = session?.enabledPrimitives;

  const candidates: BriefingMove[] = [
    {
      id: 'own-layer-sandbox',
      title: `Stand up ${org.shortName}'s own layer in a sandbox`,
      summary: `Create a Gov Hub / Canopi stewardship container for ${org.name} and run the first overlay on a public page you already control. Vicariance (sandbox before scale) keeps this from becoming a population-wide experiment on day one.`,
      lens: 'capabilities',
      layer: 'own',
      primitives: ['community-layer', 'application-layer', 'canopi-overlay'],
      citations,
      hypothesis,
      why: `Cited mission: “${org.mission}” Own-layer work is the smallest way to extend capability without leaving that mission for a captured platform.`,
    },
    {
      id: 'collaborative-partner-layer',
      title: `Open a collaborative layer with ${partners}`,
      summary: `Invite the partners already named in this packet into a shared layer plus guild. Shared tags and bridges let communities meet without forcing a single login or feed.`,
      lens: 'reach',
      layer: 'collaborative',
      primitives: ['community-layer', 'guild', 'bridges', 'tags'],
      citations,
      hypothesis,
      why: 'Reach compounds only when named partners share a layer. Hermes will not invent partners you did not list or confirm.',
    },
    {
      id: 'mpa-cosign',
      title: 'Co-sign a Minimum Permissible Affordance on data agency',
      summary: `Draft an MPA in ${org.shortName}'s language: people can export identity and social graph they created here. Ask partners to co-sign, then file it toward an ML-REQ on Gov Hub.`,
      lens: 'impact',
      layer: 'collaborative',
      primitives: ['mpa', 'workgroup'],
      citations,
      hypothesis,
      why: 'Impact is a public claim made testable. This org already states people should own and control personal data.',
    },
    {
      id: 'overlay-productivity',
      title: 'Put Canopi and Hermes on the pages staff already maintain',
      summary: `Pilot overlay + Community Chat on ${org.website} so coordination does not start in a new silo. Hermes clerks the briefing; staff keep the CMS they have.`,
      lens: 'productivity',
      layer: 'own',
      primitives: ['canopi-overlay', 'community-chat', 'tags'],
      citations,
      hypothesis,
      why: 'Productivity gains come from meeting on existing URLs, not migrating the whole stack first.',
    },
    {
      id: 'portable-id',
      title: 'Issue Overweb ID to staff, keep DSNP portability in view',
      summary: `Staff carry a portable Overweb ID across the own layer and partner layer. For a DSNP-aligned org, this is a bridge to self-sovereign identity rather than a replacement for Frequency.`,
      lens: 'capabilities',
      layer: 'own',
      primitives: ['overweb-id', 'bridges'],
      citations,
      hypothesis,
      why: 'Portable identity is the Overweb counterpart to the Alliance’s public identity agenda.',
    },
  ];

  const scored = candidates
    .filter((move) => !dismissed.has(move.id))
    .filter((move) => {
      if (!enabled || enabled.length === 0) return true;
      return move.primitives.some((id) => enabled.includes(id));
    })
    .map((move) => {
      let score = 1;
      if (pinned.has(move.id)) score += 10;
      if (move.layer === 'collaborative' && resolvePartnerOrgs(org).length > 0) score += 2;
      if (org.tags.includes('dsnp') && move.id === 'mpa-cosign') score += 2;
      if (org.tags.includes('labs') && move.id === 'portable-id') score += 2;
      if (org.tags.includes('steward') && move.id === 'collaborative-partner-layer') score += 2;
      if (org.tags.includes('institute') && move.id === 'mpa-cosign') score += 1;
      return { move, score };
    })
    .sort((a, b) => b.score - a.score);

  const picked: BriefingMove[] = [];
  const lenses = new Set<string>();
  for (const { move } of scored) {
    if (picked.length >= 3) break;
    if (lenses.has(move.lens) && picked.length < 2) continue;
    picked.push(move);
    lenses.add(move.lens);
  }
  for (const { move } of scored) {
    if (picked.length >= 3) break;
    if (!picked.some((item) => item.id === move.id)) picked.push(move);
  }
  return picked.slice(0, 3);
}

function valuesMappings(org: AllianceOrg, session: OnboardSession | null): ValueMapping[] {
  const confirmedValues = new Set(session?.confirmed.values || []);
  const catalog: Array<{ match: string; dp: string; mpa: string }> = [
    {
      match: 'agency',
      dp: 'Portable human agency (user-controlled identity and data)',
      mpa: 'Export identity and data the person created here, without a platform petition',
    },
    {
      match: 'people, not platforms',
      dp: 'Communities rather than platform silos',
      mpa: 'Layer membership is optional stewardship, not a walled garden',
    },
    {
      match: 'open',
      dp: 'Layer interoperability and open protocols',
      mpa: 'Declare how other layers may discover and bridge without capture',
    },
    {
      match: 'research',
      dp: 'Transparency of AI and human roles in inquiry',
      mpa: 'Show when Hermes drafted vs when humans confirmed',
    },
    {
      match: 'self-sovereign',
      dp: 'Portable identity across environments',
      mpa: 'Do not require a proprietary login to leave with relationships',
    },
    {
      match: 'academic',
      dp: 'Vicariance: sandbox novel work before population-wide exposure',
      mpa: 'Research overlays start in sandbox stage',
    },
  ];

  return org.values.map((value) => {
    const lower = value.toLowerCase();
    const hit = catalog.find((row) => lower.includes(row.match)) || catalog[0];
    return {
      value,
      desirableProperty: hit.dp,
      mpa: hit.mpa,
      confirmed: confirmedValues.has(value),
    };
  });
}

function primitivesFor(org: AllianceOrg, session: OnboardSession | null): PrimitiveCopy[] {
  const enabled = session?.enabledPrimitives;
  return PRIMITIVE_IDS.map((id) => ({
    id,
    name: PRIMITIVE_COPY[id].name,
    translation: org.tags.includes('dsnp') && id === 'overweb-id'
      ? 'Staff ID that can sit beside DSNP / Frequency portability, not instead of it'
      : PRIMITIVE_COPY[id].translation,
    enabled: enabled ? enabled.includes(id) : true,
  }));
}

function nextStepsFor(
  org: AllianceOrg,
  session: OnboardSession | null,
  communityHref: string,
): NextStep[] {
  const prior = new Map((session?.nextSteps || []).map((step) => [step.id, step]));
  const steps: NextStep[] = [
    {
      id: 'claim',
      title: `Claim this ${org.shortName} briefing`,
      why: 'Someone from the organization should own the private notes and chat.',
      system: 'Subject ownership',
      status: session?.claimedBy ? 'done' : 'open',
    },
    {
      id: 'confirm-sources',
      title: 'Confirm the public source URLs Hermes may read',
      why: 'Hero cards stay marked hypothesis until sources are confirmed.',
      system: 'Subject packet',
      href: padHref(org.slug, 'rights'),
      status: session?.confirmed.sources ? 'done' : 'open',
    },
    {
      id: 'confirm-partners',
      title: 'Confirm or edit the partner list for the collaborative layer',
      why: 'The partner layer cannot be empty of names Hermes is allowed to cite.',
      system: 'Partners tab',
      href: padHref(org.slug, 'partners'),
      status: session?.confirmed.partners ? 'done' : 'open',
    },
    {
      id: 'weigh-in-dp',
      title: `Weigh in on Desirable Properties tied to ${org.shortName}`,
      why: 'Follow one interest to a specific patch idea. This is the invitation, not a finished score.',
      system: 'DP tab',
      href: padHref(org.slug, 'dp'),
      status: prior.get('weigh-in-dp')?.status || 'open',
    },
    {
      id: 'community-chat',
      title: 'Open a Hermes Community Chat for this briefing',
      why: 'Invite colleagues; everyone can prompt; origin badges back here.',
      system: 'Hermes group thread',
      href: communityHref,
      status: session?.communityThreadId ? 'done' : 'open',
    },
    {
      id: 'govhub-layer',
      title: 'Request an own layer on Gov Hub',
      why: 'Graduation from briefing to stewardship container.',
      system: 'Gov Hub',
      href: 'https://interfacehub.net/',
      status: prior.get('govhub-layer')?.status || 'open',
    },
    {
      id: 'mpa-draft',
      title: 'Keep the MPA draft as a next-step commitment',
      why: 'Impact card becomes a filed requirement only after humans accept it.',
      system: 'Gov Hub ML-REQ (later)',
      href: 'https://interfacehub.net/',
      status: prior.get('mpa-draft')?.status || 'open',
    },
  ];
  return steps;
}

export function generateBriefing(
  org: AllianceOrg,
  session: OnboardSession | null,
): BriefingVersion {
  const partners = partnerNames(org);
  const communityHref = session?.communityThreadId
    ? `/agent?thread=${encodeURIComponent(session.communityThreadId)}`
    : padHref(org.slug, 'community');
  const steps = nextStepsFor(org, session, communityHref);

  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    moves: buildMoves(org, session),
    valuesMappings: valuesMappings(org, session),
    ownLayer: {
      title: `${org.shortName} layer`,
      body: `A community layer named after ${org.name}, with a sandbox application overlay on ${org.website}. Staff Overweb IDs first. Tags on the public pages listed as sources. No production bridges until an ML-REQ gate exists.`,
    },
    partnerLayer: {
      title: 'Collaborative Alliance layer',
      body: `Shared space with ${partners}. Guild for coordination that does not require joining ${org.shortName}'s layer. Bridges between public sources. Co-signed MPA on data agency.`,
    },
    primitives: primitivesFor(org, session),
    dpDirections: generateDpDirections(org),
    nextSteps: steps,
  };
}

export function generateBriefingForSlug(
  slug: string,
  session: OnboardSession | null,
): BriefingVersion | null {
  const org = getAllianceOrg(slug);
  if (!org) return null;
  return generateBriefing(org, session);
}
