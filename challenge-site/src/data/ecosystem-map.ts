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
    detail: 'Assistant, not the place',
    href: '/agent',
    status: 'live',
    caption:
      'People and workgroups decide. Hermes helps organize conversation; it is not where community lives.',
  },
  aiMediatedAwareness: {
    id: 'aiMediatedAwareness',
    label: 'AI-mediated awareness',
    detail: 'You → AI → Everything Else',
    status: 'live',
    conceptual: true,
    caption:
      'One interface, one conversational relationship, one personalized aperture onto civilization.',
  },
  agentMediation: {
    id: 'agentMediation',
    label: 'Agent-to-agent mediation',
    detail: 'MCP-style protocols',
    status: 'live',
    conceptual: true,
    caption:
      'Machine-to-machine interoperability beneath the concierge. Agents communicate; humans may never enter shared space directly.',
  },
  personalizedAnswers: {
    id: 'personalizedAnswers',
    label: 'Personalized answers',
    detail: 'Ephemeral, privatized context',
    status: 'live',
    conceptual: true,
    caption:
      'Intelligence is not a place. An answer generated for you is not the same resource others can encounter tomorrow.',
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
  /** Optional grouping for swimlanes or clusters. */
  groups?: {
    title: string;
    subtitle?: string;
    /** Short architecture stack (fast/mediation column). */
    architecture?: string;
    /** Pro-human principle quote (slow/place column). */
    principle?: string;
    body?: string;
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
      'From A Fork in the Web: two architectural tendencies that can coexist. Fast mediation collapses machine complexity into a concierge; slow / place builds persistent shared environments around Web resources.',
    groups: [
      {
        title: 'Fast / mediation',
        subtitle: 'AI-mediated awareness',
        architecture: 'You → AI → Everything Else',
        body:
          'The machine world becomes multilayered; the human experience can collapse into one personalized aperture. Convenience, ephemeral responses, privatized context. Intelligence is not a place.',
        nodeIds: ['aiMediatedAwareness', 'agentMediation', 'personalizedAnswers', 'hermes'],
      },
      {
        title: 'Slow / place',
        subtitle: 'Human-centered layered Web',
        principle: 'AI should be an inhabitant, not the landlord.',
        body:
          'Persistent shared places around the same Web resource. Communities speak for themselves. Intellectual sovereignty and subsidiarity. A layer is not a space for layers.',
        nodeIds: [
          'dps',
          'govhub',
          'pads',
          'workgroups',
          'discuss',
          'layeredWeb',
          'monument',
          'academy',
          'overwebSubstrate',
          'overwebStudio',
          'canopi',
        ],
      },
    ],
    nodeIds: [
      'aiMediatedAwareness',
      'agentMediation',
      'personalizedAnswers',
      'hermes',
      'dps',
      'govhub',
      'pads',
      'workgroups',
      'discuss',
      'layeredWeb',
      'monument',
      'academy',
      'overwebSubstrate',
      'overwebStudio',
      'canopi',
    ],
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
