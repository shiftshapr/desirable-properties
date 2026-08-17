/**
 * Presentation-agnostic Civic Challenge schema.
 * Powers DP campaign pages, Hermes context, badges, dashboards, and future RFCs.
 */

export const CIVIC_CHALLENGE_SCHEMA_VERSION = '1.0' as const;

export type CivicChallengeKind = 'desirable-property' | 'rfc' | 'initiative';

export type CivicChallengeStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';

export type CivicChallengeActionId =
  | 'submit_problem'
  | 'companion'
  | 'improve'
  | 'join_workgroup'
  | 'curate';

export type CivicChallengeResourceKind =
  | 'video'
  | 'infographic'
  | 'research'
  | 'white_paper'
  | 'examples'
  | 'faq'
  | 'discussion'
  | 'other';

export type CivicChallengeHero = {
  headline: string;
  text: string;
  media?: {
    image?: string | null;
    video?: string | null;
  };
};

export type CivicChallengeProblemStory = {
  title?: string;
  scenario: string;
  stakes?: string[];
};

export type CivicChallengeAudience = {
  id: string;
  label: string;
  why: string;
};

export type CivicChallengeExampleDomain = {
  label: string;
  text: string;
};

export type CivicChallengeAction = {
  id: CivicChallengeActionId;
  label: string;
  intent: string;
};

export type CivicChallengeResource = {
  kind: CivicChallengeResourceKind | string;
  title: string;
  href?: string;
  optional?: boolean;
};

/** Optional presentation hints; never required for consumers. */
export type CivicChallengePresentation = {
  themeColor?: string;
  badge?: string;
};

export type CivicChallenge = {
  schemaVersion: typeof CIVIC_CHALLENGE_SCHEMA_VERSION | string;
  kind: CivicChallengeKind;
  id: string;
  number?: number;
  slug: string;
  title: string;
  status: CivicChallengeStatus;
  family?: string;
  relatedIds?: string[];

  guidingQuestion: string;
  summary: string;
  humanIssue: string;
  webProblem: string;
  opportunity: string;

  hero: CivicChallengeHero;
  problemStory: CivicChallengeProblemStory;
  currentChallenges: string[];
  webLimitations: { title?: string; text: string };
  futureVision: { title?: string; text: string; bullets?: string[] };

  audiences: CivicChallengeAudience[];
  /** Capability dictionary ids, e.g. "portable-identity". */
  capabilities: string[];
  exampleDomains: CivicChallengeExampleDomain[];

  actions: CivicChallengeAction[];
  resources: CivicChallengeResource[];

  presentation?: CivicChallengePresentation;
};

export type CivicChallengeIndexEntry = {
  id: string;
  number?: number;
  slug: string;
  title: string;
  status: CivicChallengeStatus;
  file: string;
};

export type CivicChallengeIndex = {
  schemaVersion: string;
  family: string;
  challenges: CivicChallengeIndexEntry[];
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string');
}

/**
 * Lightweight runtime parse. Returns null if required campaign fields are missing.
 */
export function parseCivicChallenge(raw: unknown): CivicChallenge | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  if (!isNonEmptyString(o.id)) return null;
  if (!isNonEmptyString(o.slug)) return null;
  if (!isNonEmptyString(o.title)) return null;
  if (!isNonEmptyString(o.guidingQuestion)) return null;
  if (!isNonEmptyString(o.summary)) return null;
  if (!isNonEmptyString(o.humanIssue)) return null;
  if (!isNonEmptyString(o.webProblem)) return null;
  if (!isNonEmptyString(o.opportunity)) return null;

  const hero = o.hero as Record<string, unknown> | undefined;
  if (!hero || !isNonEmptyString(hero.headline) || !isNonEmptyString(hero.text)) return null;

  const problemStory = o.problemStory as Record<string, unknown> | undefined;
  if (!problemStory || !isNonEmptyString(problemStory.scenario)) return null;

  const webLimitations = o.webLimitations as Record<string, unknown> | undefined;
  if (!webLimitations || !isNonEmptyString(webLimitations.text)) return null;

  const futureVision = o.futureVision as Record<string, unknown> | undefined;
  if (!futureVision || !isNonEmptyString(futureVision.text)) return null;

  if (!isStringArray(o.currentChallenges)) return null;
  if (!isStringArray(o.capabilities)) return null;
  if (!Array.isArray(o.audiences) || !Array.isArray(o.exampleDomains)) return null;
  if (!Array.isArray(o.actions) || !Array.isArray(o.resources)) return null;

  const kind = o.kind;
  if (kind !== 'desirable-property' && kind !== 'rfc' && kind !== 'initiative') return null;

  const status = o.status;
  if (status !== 'ACTIVE' && status !== 'DRAFT' && status !== 'ARCHIVED') return null;

  return o as unknown as CivicChallenge;
}
