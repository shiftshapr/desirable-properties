export type AllianceSource = {
  label: string;
  url: string;
};

export type ExternalPartner = {
  name: string;
  url: string;
  note?: string;
};

export type AlliancePitch = {
  headline: string;
  lead: string;
  ask: string;
  captureLine: string;
};

export type AllianceOrg = {
  slug: string;
  name: string;
  shortName: string;
  kind: 'organization';
  website: string;
  allianceUrl: string;
  claimDomains: string[];
  tags: string[];
  mission: string;
  values: string[];
  sources: AllianceSource[];
  partners: string[];
  externalPartners: ExternalPartner[];
  relatedDps?: string[];
  pitch?: AlliancePitch;
};

export type AllianceDirectory = {
  cohort: string;
  cohortLabel: string;
  directoryNote: string;
  orgs: AllianceOrg[];
};

export type RosterOrg = {
  slug: string;
  name: string;
  domain: string;
  website: string;
};

export type AllianceRoster = {
  cohort: string;
  sourceUrl: string;
  importedAt: string;
  rosterNote: string;
  orgs: RosterOrg[];
};

export type PadLookupStatus = 'found' | 'roster' | 'dynamic' | 'not_found';

export type PadLookupResult = {
  status: PadLookupStatus;
  slug: string | null;
  domain: string | null;
  name: string | null;
  href: string | null;
};

export type Lens = 'capabilities' | 'reach' | 'productivity' | 'impact';
export type LayerKind = 'own' | 'collaborative';

export type Citation = {
  label: string;
  url: string;
};

export type BriefingMove = {
  id: string;
  title: string;
  summary: string;
  lens: Lens;
  layer: LayerKind;
  primitives: string[];
  citations: Citation[];
  hypothesis: boolean;
  why: string;
};

export type ValueMapping = {
  value: string;
  desirableProperty: string;
  mpa: string;
  confirmed: boolean;
};

export type PrimitiveCopy = {
  id: string;
  name: string;
  translation: string;
  enabled: boolean;
};

export type NextStep = {
  id: string;
  title: string;
  why: string;
  system: string;
  href?: string;
  status: 'open' | 'accepted' | 'done';
};

export type DpDirection = {
  dpId: string;
  dpName: string;
  whyFromCorpus: string;
  direction: string;
  patchIdea: string;
  hypothesis: boolean;
  citations: Citation[];
  chapterHref: string;
  discussHref: string;
  hermesHref: string;
  workgroupHref: string;
};

export type BriefingVersion = {
  id: string;
  createdAt: string;
  moves: BriefingMove[];
  valuesMappings: ValueMapping[];
  ownLayer: { title: string; body: string };
  partnerLayer: { title: string; body: string };
  primitives: PrimitiveCopy[];
  dpDirections: DpDirection[];
  nextSteps: NextStep[];
};

export type OnboardConsent = {
  publicRead: boolean;
  sessionMemory: boolean;
  crossSubjectLearning: boolean;
};

export type OnboardClaim = {
  userId: string;
  email: string | null;
  displayName: string | null;
  claimedAt: string;
  domainMatched: boolean;
};

export type OnboardActor = {
  userId: string;
  email: string | null;
  displayName: string | null;
};

export type OnboardEvent = {
  id: string;
  slug: string;
  kind: string;
  actor: OnboardActor | null;
  payload: Record<string, unknown>;
  createdAt: string;
};

export type OnboardSession = {
  slug: string;
  confirmed: {
    mission?: boolean;
    sources?: boolean;
    partners?: boolean;
    values?: string[];
  };
  consent: OnboardConsent;
  briefing: BriefingVersion | null;
  nextSteps: NextStep[];
  pinnedMoveIds: string[];
  dismissedMoveIds: string[];
  enabledPrimitives: string[] | null;
  claimedBy: OnboardClaim | null;
  communityThreadId: string | null;
  communityThreadTitle: string | null;
  updatedAt: string;
};

export const DEFAULT_CONSENT: OnboardConsent = {
  publicRead: true,
  sessionMemory: false,
  crossSubjectLearning: false,
};

export const PRIMITIVE_IDS = [
  'community-layer',
  'application-layer',
  'overweb-id',
  'tags',
  'bridges',
  'canopi-overlay',
  'workgroup',
  'guild',
  'mpa',
  'community-chat',
] as const;
