import { bookDiscussHref } from '@/lib/govhub';

export type EcosystemNodeStatus = 'live' | 'in_progress' | 'coming';

export type EcosystemMapViewId = 'here' | 'layers' | 'loop';

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
    href: 'https://app.canopi.live',
    external: true,
    status: 'in_progress',
    statusNote: 'Waitlist',
    caption: 'Join the waitlist. Full product launch follows the book and Gov Hub path.',
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
  /** Optional grouping for swimlanes or clusters. */
  groups?: {
    title: string;
    subtitle?: string;
    nodeIds: string[];
  }[];
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
    id: 'layers',
    label: 'Fast and slow layers',
    description:
      'Some parts of the Meta-Layer stack move on multi-year horizons; others you can use this week.',
    groups: [
      {
        title: 'Slow (years)',
        nodeIds: [
          'challenge',
          'layeredWeb',
          'govhub',
          'mlReqs',
          'mlAdrs',
          'monument',
          'academy',
          'overwebSubstrate',
          'overwebStudio',
        ],
      },
      {
        title: 'Fast (this week)',
        nodeIds: ['pads', 'hermes', 'workgroups', 'discuss', 'canopi'],
      },
    ],
    nodeIds: [
      'challenge',
      'layeredWeb',
      'govhub',
      'mlReqs',
      'mlAdrs',
      'monument',
      'academy',
      'overwebSubstrate',
      'overwebStudio',
      'pads',
      'hermes',
      'workgroups',
      'discuss',
      'canopi',
    ],
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
