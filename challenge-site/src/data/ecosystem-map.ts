import { bookDiscussHref } from '@/lib/govhub';

export type EcosystemNodeStatus = 'live' | 'in_progress' | 'coming';

export type EcosystemMapViewId = 'here' | 'fork' | 'loop';

export type EcosystemNode = {
  id: string;
  label: string;
  /** Optional secondary line under the label (e.g. grouped items). */
  detail?: string;
  href?: string;
  external?: boolean;
  /** Book discuss links use DiscussPatchLink when rendered on-site. */
  discussPatch?: boolean;
  status: EcosystemNodeStatus;
  /** When true, omit the status chip (conceptual architecture, not a live site). */
  conceptual?: boolean;
  /** Extra status context (e.g. Canopi waitlist). */
  statusNote?: string;
  caption?: string;
  timeline?: string;
};

export const ECOSYSTEM_STATUS_LABELS: Record<EcosystemNodeStatus, string> = {
  live: 'Live',
  in_progress: 'In progress',
  coming: 'Coming',
};

const ML_REQ_CAPTION =
  'People set the rules on Gov Hub. Software proves it meets them before it scales.';

/** Shared node catalog – same nodes across all three views. */
export const ECOSYSTEM_NODES: Record<string, EcosystemNode> = {
  challenge: {
    id: 'challenge',
    label: 'The Challenge',
    href: '/challenge',
    status: 'live',
  },
  dps: {
    id: 'dps',
    label: 'Desirable Properties',
    detail: 'DPs',
    href: 'https://desirableproperties.org',
    external: true,
    status: 'live',
  },
  layeredWeb: {
    id: 'layeredWeb',
    label: 'The Layered Web',
    detail: 'book.desirableproperties.org',
    href: 'https://book.desirableproperties.org',
    external: true,
    status: 'live',
  },
  govhub: {
    id: 'govhub',
    label: 'Gov Hub',
    detail: 'patches / drafts',
    href: 'https://interfacehub.net',
    external: true,
    status: 'live',
  },
  mlReqs: {
    id: 'mlReqs',
    label: 'ML-REQs',
    status: 'coming',
    caption: ML_REQ_CAPTION,
    timeline: 'October 2026',
  },
  mlAdrs: {
    id: 'mlAdrs',
    label: 'ML-ADRs',
    status: 'coming',
    caption: ML_REQ_CAPTION,
    timeline: 'December 2026',
  },
  monument: {
    id: 'monument',
    label: 'Monument / Ordinals',
    detail: 'BRC333',
    href: 'https://brc333.xyz',
    external: true,
    status: 'live',
  },
  academy: {
    id: 'academy',
    label: 'Academy',
    href: 'https://academy.themetalayer.org',
    external: true,
    status: 'live',
  },
  pads: {
    id: 'pads',
    label: 'Landing pads',
    href: '/pad',
    status: 'live',
  },
  hermes: {
    id: 'hermes',
    label: 'Hermes',
    detail: 'DP Community AI',
    href: '/agent',
    status: 'live',
  },
  brc333: {
    id: 'brc333',
    label: 'BRC333',
    detail: 'Ordinal layer',
    href: 'https://brc333.xyz',
    external: true,
    status: 'live',
  },
  workgroups: {
    id: 'workgroups',
    label: 'Workgroups',
    href: '/workgroups',
    status: 'live',
  },
  discuss: {
    id: 'discuss',
    label: 'Discuss',
    detail: 'chapter comments on the book',
    href: bookDiscussHref(),
    external: true,
    discussPatch: true,
    status: 'live',
  },
  canopi: {
    id: 'canopi',
    label: 'Canopi',
    detail: 'Shared presence above a page',
    href: 'https://app.canopi.live',
    external: true,
    status: 'in_progress',
    statusNote: 'Waitlist',
    caption:
      'Discuss and context that persist around a Web resource. Join the waitlist; not Live yet.',
  },
  overwebSubstrate: {
    id: 'overwebSubstrate',
    label: 'Overweb Substrate',
    status: 'coming',
    caption: 'Shared coordination layer for overlay implementations.',
    timeline: 'Coming',
  },
  overwebStudio: {
    id: 'overwebStudio',
    label: 'Overweb Studio',
    detail: 'in development',
    href: 'https://theoverweb.org',
    external: true,
    status: 'in_progress',
  },
  bookCoursePatch: {
    id: 'bookCoursePatch',
    label: 'Book / course / patch',
    detail: 'The Layered Web & community output',
    href: 'https://book.desirableproperties.org',
    external: true,
    status: 'live',
    caption:
      'Chapter comments are live on the book. Passage-level patching on the book is coming soon; patch drafts on Gov Hub today.',
  },
};

export type EcosystemViewConfig = {
  id: EcosystemMapViewId;
  label: string;
  description: string;
  /** Node ids in display order for this view. */
  nodeIds: string[];
  /** Optional grouping for bands or clusters. */
  groups?: {
    title: string;
    subtitle?: string;
    body?: string;
    principle?: string;
    nodeIds?: string[];
  }[];
  /** AI-mediated awareness – failure mode, not a product band. */
  failureMode?: {
    title: string;
    subtitle: string;
    architecture: string;
    body: string;
    warning: string;
  };
  /** Highlighted node id (We are here). */
  highlightId?: string;
  tagline?: string;
  footnote?: string;
};

export const ECOSYSTEM_VIEWS: EcosystemViewConfig[] = [
  {
    id: 'here',
    label: 'We are here',
    description:
      'Where the Desirable Properties Challenge sits on the path from community-defined properties to Overweb implementations.',
    groups: [
      {
        title: 'Define the foundation',
        nodeIds: ['dps', 'mlReqs', 'mlAdrs'],
      },
      {
        title: 'Build Overweb',
        subtitle: 'Substrate + Overweb Studio',
        nodeIds: ['overwebSubstrate', 'overwebStudio'],
      },
    ],
    nodeIds: ['dps', 'mlReqs', 'mlAdrs', 'overwebSubstrate', 'overwebStudio'],
    highlightId: 'dps',
    tagline: 'We are here to define the next level of the internet.',
  },
  {
    id: 'fork',
    label: 'Space for layers',
    description:
      'The fork from A Fork in the Web: today\'s Web as substrate, an architectural space for independent layers to coexist, and particular layers as inhabitants. AI-mediated awareness is the failure mode to avoid – not a product timeline.',
    groups: [
      {
        title: 'Substrate',
        body:
          'Today\'s Web resources as common reference points – pages, documents, media, applications, datasets, and other digital objects underneath.',
        nodeIds: [],
      },
      {
        title: 'Space for layers',
        subtitle: 'Human-centered layered Web (architectural category, not an app)',
        body:
          'Desirable Properties, The Layered Web, Gov Hub, ML-REQs, ML-ADRs, monument, and Academy name what must be true so many layers can coexist without one owning the others. Building a layer is different from creating an architectural space in which independent layers can coexist. A human-centered layered Web is therefore not another application category. It is an architectural category.',
        nodeIds: ['dps', 'layeredWeb', 'govhub', 'mlReqs', 'mlAdrs', 'monument', 'academy'],
      },
      {
        title: 'Particular layers',
        subtitle: 'Inhabitants – each is a layer; none is the space',
        principle: 'AI should be an inhabitant, not the landlord.',
        body: 'Intelligence and place are different things.',
        nodeIds: [
          'canopi',
          'pads',
          'hermes',
          'discuss',
          'workgroups',
          'overwebSubstrate',
          'overwebStudio',
          'brc333',
        ],
      },
    ],
    nodeIds: [
      'dps',
      'layeredWeb',
      'govhub',
      'mlReqs',
      'mlAdrs',
      'monument',
      'academy',
      'canopi',
      'pads',
      'hermes',
      'discuss',
      'workgroups',
      'overwebSubstrate',
      'overwebStudio',
      'brc333',
    ],
    failureMode: {
      title: 'Failure mode (not a product)',
      subtitle: 'AI-mediated awareness',
      architecture: 'You → AI → Everything Else',
      body:
        'One interface. One conversational relationship. One personalized aperture onto civilization.',
      warning: 'If Hermes or Canopi becomes that aperture, the architecture failed.',
    },
    footnote:
      'These futures are not mutually exclusive. Neither does the first naturally lead to the second. Design choices influence which becomes dominant – not a deterministic binary, and not a moral cartoon.',
  },
  {
    id: 'loop',
    label: 'Living loop',
    description:
      'Community input flows through Gov Hub and the monument into published artifacts, then back into governance.',
    nodeIds: ['workgroups', 'pads', 'discuss', 'govhub', 'monument', 'bookCoursePatch'],
    groups: [
      {
        title: 'Community input',
        nodeIds: ['workgroups', 'pads', 'discuss'],
      },
      {
        title: 'Govern & preserve',
        nodeIds: ['govhub', 'monument'],
      },
      {
        title: 'Publish & learn',
        nodeIds: ['bookCoursePatch'],
      },
    ],
    footnote:
      'Book comments are live today. Passage-level patching on the book is coming soon; use Gov Hub to patch drafts now.',
  },
];

export const DEFAULT_ECOSYSTEM_VIEW: EcosystemMapViewId = 'here';

export function getEcosystemNode(id: string): EcosystemNode | undefined {
  return ECOSYSTEM_NODES[id];
}

export function getEcosystemView(id: EcosystemMapViewId): EcosystemViewConfig | undefined {
  return ECOSYSTEM_VIEWS.find((view) => view.id === id);
}
