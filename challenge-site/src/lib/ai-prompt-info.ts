import type { ComposeAiPromptOption } from '@/components/compose/ComposeFieldAiAssist';
import { dpContextBlurb, getDpRegistryEntry, listDpRegistryEntries } from '@/lib/dp-registry';

export type AiPromptInfoLink = {
  label: string;
  href: string;
};

export type AiPromptInfo = {
  title: string;
  summary: string;
  details?: string[];
  relatedDps?: string[];
  links?: AiPromptInfoLink[];
};

type PromptInfoContext = {
  dpId?: string | null;
  isDiscovery?: boolean;
};

const DP_GENERAL: AiPromptInfo = {
  title: 'Desirable Properties (DPs)',
  summary:
    'Desirable Properties are community-defined principles for a trustworthy Meta-Layer. DP1–DP22 are inscribed on Bitcoin; DP23+ are active Gov Hub drafts.',
  details: [
    'Hermes retrieves the latest ML-Draft text synced from Gov Hub when answering.',
    'Pills that mention DPs help map discussion to the framework — they do not post on your behalf.',
  ],
  links: [
    { label: 'Browse all DPs', href: '/participate' },
    { label: 'Framing chapter', href: '/dp/dp1' },
  ],
};

const PROMPT_INFO: Record<string, (ctx: PromptInfoContext) => AiPromptInfo> = {
  start: () => ({
    title: 'Help me get started',
    summary: 'Hermes suggests 2–3 starter angles or questions based on your workgroup context.',
    details: ['Works even when the composer is empty.', 'Output goes into your composer — you send it as your message.'],
  }),
  clarify: () => ({
    title: 'Clarify my thinking',
    summary: 'Sharpens ideas in your draft and may ask one reflective question.',
    details: ['You edit or send the result — nothing posts automatically.'],
  }),
  expand: () => ({
    title: 'Expand',
    summary: 'Adds supporting detail while staying in your voice.',
    details: ['Use after you have a rough draft in the composer.'],
  }),
  dp: (ctx) => ({
    title: 'Connect to a Desirable Property',
    summary: 'Maps your draft to relevant DPs from the framework.',
    details: [
      'Hermes scans ML-Draft text for DP1–DP23 and cites overlaps.',
      ctx.dpId ? `This workgroup is scoped to ${ctx.dpId}.` : 'Discovery workgroups consider the full DP set.',
    ],
    relatedDps: ctx.dpId ? [ctx.dpId] : undefined,
    links: [{ label: 'What are DPs?', href: '/participate' }],
  }),
  strengthen: () => ({
    title: 'Strengthen for submission',
    summary: 'Makes your draft more specific and concrete for Gov Hub or workgroup submission.',
    details: ['You review before sending — this is your message, not Hermes speaking.'],
  }),
  shorter: () => ({
    title: 'Shorter version',
    summary: 'Condenses your draft while keeping the core insight.',
  }),
  fit: () => ({
    title: 'Where might this fit among existing DPs?',
    summary: 'Hermes compares the thread to inscribed and draft DPs and names closest matches.',
    details: [
      'Uses latest ML-Draft text from Gov Hub rails.',
      'Reply appears in your private Hermes panel — nothing posts until you share or adopt.',
    ],
    links: [{ label: 'DP framework overview', href: '/participate' }],
  }),
  'new-dp': () => ({
    title: 'Should we consider a new DP?',
    summary: 'Evaluates whether the topic warrants a new Desirable Property and how it would relate to existing ones.',
    details: [
      'DP23 (Universal Participation) is the current draft beyond the inscribed set.',
      'Private reply — share to thread only when ready.',
    ],
    relatedDps: ['DP23'],
  }),
  compare: (ctx) => ({
    title: 'Compare to closest inscribed match',
    summary: 'Finds the nearest inscribed DP and notes alignments, tensions, and gaps.',
    details: ['DP1–DP22 are on-chain; Hermes also considers draft DP23 where relevant.'],
    relatedDps: ctx.dpId ? [ctx.dpId] : undefined,
  }),
  decision: () => ({
    title: "What's the decision we're actually making?",
    summary: 'Facilitator-style clarification: options, stakeholders, and what resolution looks like.',
    details: ['Private note — use Share to thread when the room should see it.'],
  }),
  steelman: () => ({
    title: 'Steelman the opposite',
    summary: "Devil's advocate: the strongest fair counter-argument to the current direction.",
    details: ['Mode affects tone — try Facilitator or Devil\'s advocate pills above.'],
  }),
  summarize: () => ({
    title: 'Summarize for the room',
    summary: 'Key claims, open questions, and where the group seems headed.',
    details: ['Good for late joiners — adopt into composer or share when ready.'],
  }),
  'wg-fit': () => ({
    title: 'Fit among existing DPs',
    summary: 'Discovery workgroup: where a new concept might sit in the DP framework.',
    details: ['Considers all 23 DPs including draft DP23.'],
    links: [{ label: 'DP discovery workgroup', href: '/workgroups' }],
  }),
  'wg-gaps': () => ({
    title: 'Gaps to discuss first',
    summary: 'Surfaces under-discussed areas in the DP set for this discovery session.',
    details: ['Helps prioritize which properties need community input.'],
  }),
  'wg-reply': (ctx) => ({
    title: 'Draft a reply',
    summary: 'Drafts a reply to the latest thread message for your composer.',
    details: [
      'This is Draft my message — you send it as yourself, not as Hermes.',
      ctx.dpId ? `Scoped to ${ctx.dpId} context.` : undefined,
    ].filter(Boolean) as string[],
    relatedDps: ctx.dpId ? [ctx.dpId] : undefined,
  }),
  'wg-summarize': (ctx) => ({
    title: `Summarize ${ctx.dpId ?? 'this DP'}`,
    summary: 'One-paragraph summary of what this Desirable Property means.',
    relatedDps: ctx.dpId ? [ctx.dpId] : undefined,
  }),
  'wg-tensions': (ctx) => ({
    title: `Tensions in ${ctx.dpId ?? 'this DP'}`,
    summary: 'Typical tradeoffs and disagreements that arise in discussions of this property.',
    relatedDps: ctx.dpId ? [ctx.dpId] : undefined,
  }),
  'wg-focus': () => ({
    title: 'Workgroup focus',
    summary: 'What this workgroup should prioritize right now based on recent thread.',
  }),
  'wg-next': (ctx) => ({
    title: 'Propose or patch next',
    summary: 'Suggests concrete next steps: Gov Hub patches, discussion threads, or proposals.',
    details: [
      'Patches go through Gov Hub ML-Draft workflow.',
      ctx.dpId ? `Primary DP: ${ctx.dpId}.` : undefined,
    ].filter(Boolean) as string[],
    relatedDps: ctx.dpId ? [ctx.dpId] : undefined,
  }),
};

function dpRelatedLinks(dpIds: string[]): AiPromptInfoLink[] {
  return dpIds
    .map((id) => {
      const entry = getDpRegistryEntry(id);
      if (!entry) return null;
      const links: AiPromptInfoLink[] = [{ label: `${entry.id} on site`, href: entry.siteUrl }];
      if (entry.govhubUrl) {
        links.push({ label: `${entry.mlNumber ?? entry.id} on Gov Hub`, href: entry.govhubUrl });
      }
      return links;
    })
    .flat()
    .filter(Boolean) as AiPromptInfoLink[];
}

export function getAiPromptInfo(
  option: ComposeAiPromptOption,
  ctx: PromptInfoContext = {},
): AiPromptInfo | null {
  const builder = PROMPT_INFO[option.id];
  if (!builder) {
    if (/dp|desirable propert/i.test(option.label)) {
      return { ...DP_GENERAL, title: option.label, summary: option.label };
    }
    return null;
  }

  const info = builder(ctx);
  const related = info.relatedDps ?? (ctx.dpId ? [ctx.dpId] : []);
  const dpLinks = dpRelatedLinks(related);
  const dpBlurbs = related
    .map((id) => dpContextBlurb(id))
    .filter(Boolean) as string[];

  return {
    ...info,
    details: [
      ...(info.details ?? []),
      ...dpBlurbs.map((b) => `• ${b}`),
    ],
    links: [...(info.links ?? []), ...dpLinks],
  };
}

export function isDpAwarePrompt(option: ComposeAiPromptOption): boolean {
  if (PROMPT_INFO[option.id]) {
    const ids = ['dp', 'fit', 'new-dp', 'compare', 'wg-fit', 'wg-gaps', 'wg-summarize', 'wg-tensions', 'wg-next'];
    return ids.includes(option.id);
  }
  return /dp|desirable propert/i.test(option.label);
}

export function allDpNamesForDiscovery(): string {
  return listDpRegistryEntries()
    .map((e) => `${e.id}: ${e.name}`)
    .join('; ');
}
