import { bookDiscussHref } from '@/lib/govhub';

export type EcosystemNodeStatus = 'live' | 'in_progress' | 'coming';

export type EcosystemMapViewId = 'here' | 'fork' | 'pace' | 'loop';

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

/** Shared node catalog – products, functions, and pace-layer roles across views. */
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
  /** Pace-layer functions – monument stack roles, not product catalog entries. */
  paceDigitalMonuments: {
    id: 'paceDigitalMonuments',
    label: 'Digital monuments',
    detail: 'On-chain inscriptions',
    href: '/onchain',
    status: 'live',
  },
  paceRealityAnchors: {
    id: 'paceRealityAnchors',
    label: 'Reality anchors',
    status: 'live',
    conceptual: true,
    caption: 'Durable reference points that outlive any single interface or session.',
  },
  paceBridges: {
    id: 'paceBridges',
    label: 'Bridges',
    status: 'live',
    conceptual: true,
    caption: 'Connections that let living context reach across anchors without collapsing them.',
  },
  paceAiConcierge: {
    id: 'paceAiConcierge',
    label: 'AI / concierge',
    detail: 'Fast inhabitant',
    href: '/agent',
    status: 'live',
    caption: 'Same pace as human conversation; a different inhabitant – not the only aperture.',
  },
  paceH2hConversation: {
    id: 'paceH2hConversation',
    label: 'Human-to-human conversation',
    detail: 'Fast inhabitant',
    href: bookDiscussHref(),
    external: true,
    discussPatch: true,
    status: 'live',
    caption: 'Same pace as AI assistance; communities speak for themselves. Not the Meta-Layer.',
  },
  paceDiscussion: {
    id: 'paceDiscussion',
    label: 'Discussion',
    detail: 'Workgroup deliberation',
    href: '/workgroups',
    status: 'live',
  },
  paceAnnotations: {
    id: 'paceAnnotations',
    label: 'Annotations',
    detail: 'On the book',
    href: 'https://book.desirableproperties.org',
    external: true,
    status: 'live',
  },
  paceInterfaces: {
    id: 'paceInterfaces',
    label: 'Interfaces',
    detail: 'Landing pads',
    href: '/pad',
    status: 'live',
  },
  paceUpdates: {
    id: 'paceUpdates',
    label: 'Updates',
    status: 'live',
    conceptual: true,
    caption: 'Living context that evolves around a durable anchor.',
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
  /** Pace view: Meta-Layer is capability, not the slow band. */
  metaLayerNote?: string;
  /** Pace view: AI/concierge and H2H – same pace, different inhabitant. */
  fastInhabitantIds?: string[];
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
      warning:
        'The fork is when the concierge fast layer crowds out human-to-human conversation and hides the slow anchors – monuments, reality anchors, and bridges – behind one aperture. If Hermes or Canopi becomes that sole concierge, the architecture failed.',
    },
    footnote:
      'These futures are not mutually exclusive. Neither does the first naturally lead to the second. Design choices influence which becomes dominant – not a deterministic binary, and not a moral cartoon.',
  },
  {
    id: 'pace',
    label: 'Pace layers',
    description:
      'Monuments separate fast living context from slow durable anchors. Fast living context is what the Meta-Layer enables; slow durable anchors are monuments, reality anchors, and bridges. Not a product catalog sorted by ship speed.',
    groups: [
      {
        title: 'Slow durable anchors',
        subtitle: 'What must endure',
        body: 'Digital monuments, reality anchors, and bridges preserve continuity beneath living context.',
        nodeIds: ['paceDigitalMonuments', 'paceRealityAnchors', 'paceBridges'],
      },
      {
        title: 'Fast living context',
        subtitle: 'What the Meta-Layer enables',
        body:
          'Discussion, annotations, conversation, interfaces, and updates – including both AI / concierge and human-to-human conversation at the same pace, as different inhabitants. Fast context gathers around slow anchors; it does not replace them.',
        nodeIds: [
          'paceDiscussion',
          'paceAnnotations',
          'paceInterfaces',
          'paceUpdates',
        ],
      },
    ],
    fastInhabitantIds: ['paceAiConcierge', 'paceH2hConversation'],
    nodeIds: [
      'paceDigitalMonuments',
      'paceRealityAnchors',
      'paceBridges',
      'paceAiConcierge',
      'paceH2hConversation',
      'paceDiscussion',
      'paceAnnotations',
      'paceInterfaces',
      'paceUpdates',
    ],
    metaLayerNote:
      'The Meta-Layer is the space and capability that makes fast living context possible around slow durable anchors. It is not itself a speed, and not the slow layer.',
    tagline:
      'A normal website collapses memory into one speed. A monument separates living context from durable anchors.',
    footnote:
      'The monument remains stable while annotations, summaries, lessons, and debates evolve around it. The result is not a frozen archive; it is living orientation around durable memory.',
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
