/**
 * Canonical Meta-Layer capability vocabulary for civic challenges.
 * Shared by campaign pages, Hermes, and overlays.
 */

export type CapabilityDef = {
  id: string;
  label: string;
  short?: string;
};

export const CAPABILITY_DICTIONARY: Record<string, CapabilityDef> = {
  presence: {
    id: 'presence',
    label: 'Presence',
    short: 'How participants show up across contexts',
  },
  'trust-signals': {
    id: 'trust-signals',
    label: 'Trust Signals',
    short: 'Visible cues that help people evaluate authenticity',
  },
  'portable-identity': {
    id: 'portable-identity',
    label: 'Portable Identity',
    short: 'Identity that travels with the participant',
  },
  reputation: {
    id: 'reputation',
    label: 'Reputation',
    short: 'Standing earned through meaningful participation',
  },
  consent: {
    id: 'consent',
    label: 'Consent',
    short: 'Explicit choice over sharing and interaction',
  },
  'smart-tags': {
    id: 'smart-tags',
    label: 'Smart Tags',
    short: 'Structured context attached to people, places, and content',
  },
  'community-governance': {
    id: 'community-governance',
    label: 'Community Governance',
    short: 'Composable rules communities can adapt',
  },
  'ai-accountability': {
    id: 'ai-accountability',
    label: 'AI Accountability',
    short: 'Visible responsibility for AI behavior',
  },
  'context-overlays': {
    id: 'context-overlays',
    label: 'Context Overlays',
    short: 'Layered meaning on top of the open web',
  },
  'meta-communities': {
    id: 'meta-communities',
    label: 'Meta-Communities',
    short: 'Communities that persist beyond platforms',
  },
  'ai-containment': {
    id: 'ai-containment',
    label: 'AI Containment',
    short: 'Interface-level limits and consent for agents',
  },
  provenance: {
    id: 'provenance',
    label: 'Provenance',
    short: 'Traceable origins of media and claims',
  },
  'data-sovereignty': {
    id: 'data-sovereignty',
    label: 'Data Sovereignty',
    short: 'Individual control over personal data',
  },
  micropayments: {
    id: 'micropayments',
    label: 'Micropayments',
    short: 'Small-value exchange without ad dependence',
  },
  interoperability: {
    id: 'interoperability',
    label: 'Interoperability',
    short: 'Works across apps, sites, and communities',
  },
  'civic-memory': {
    id: 'civic-memory',
    label: 'Civic Memory',
    short: 'Continuity of collective understanding over time',
  },
  multimodal: {
    id: 'multimodal',
    label: 'Multimodal',
    short: 'Seamless text, audio, video, and device flows',
  },
  'attention-agency': {
    id: 'attention-agency',
    label: 'Attention Agency',
    short: 'User control over feeds, filters, and AI',
  },
};

export function capabilityLabel(id: string): string {
  return CAPABILITY_DICTIONARY[id]?.label ?? id;
}
