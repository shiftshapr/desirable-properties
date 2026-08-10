/** Fork in the Web workshop series seed definitions. */

export const FORK_SERIES_SLUG = 'fork-in-the-web-workshops';

export const FORK_SERIES_TITLE = 'Fork in the Web workshops';

/** Live workshop slot length (from Luma). */
export const FORK_SESSION_LENGTH_MINUTES = 75;

/**
 * Full series participation: pre-read (~15 min) + 4×75 min sessions (5h) + session questions (~2.5h).
 */
export const FORK_SERIES_TOTAL_ESTIMATE_LABEL = '≈8 hours total';

export const BOOK_LAUNCH_SLUG = 'desirable-properties-book-launch';

/** Single event — no badge; Luma date TBD (save-the-date). */
export const BOOK_LAUNCH_SEED = {
  title: 'Book Launch: The Layered Web',
  subtitle: 'Desirable Properties Book Launch',
  descriptionMd:
    'The culmination of two years of work on the meta-layer. We will release the V1 Desirable Properties Meta-Layer (DPML) and feature speakers working on meta-layer aligned initiatives.',
  liveUrl: 'https://luma.com/wfi1z9lv',
  /** Luma lists save-the-date only; admin can set when announced. */
  startsAt: null as string | null,
  endsAt: null as string | null,
} as const;

export type PreReadSeed = {
  label: string;
  url: string;
  minutesEstimate?: number;
  optional?: boolean;
};

type QuestionSeed = {
  fieldKey: string;
  label: string;
  helpText?: string;
  fieldType: 'checkbox' | 'textarea' | 'dp_hook';
  required?: boolean;
  aiAssist?: boolean;
};

type SectionSeed = {
  sectionKey: 'prepare' | 'engage' | 'reflect';
  title: string;
  pearlStage: string;
  questions: QuestionSeed[];
};

const SHARED_PREPARE: QuestionSeed[] = [
  {
    fieldKey: 'pre_read_confirmed',
    label: 'I reviewed the pre-read or attended/watched the session',
    fieldType: 'checkbox',
    required: true,
  },
  {
    fieldKey: 'hope_to_explore',
    label: 'What I hope to explore',
    fieldType: 'textarea',
    required: true,
    aiAssist: true,
  },
];

const SHARED_REFLECT: QuestionSeed[] = [
  {
    fieldKey: 'thinking_shifted',
    label: 'What shifted in my thinking?',
    fieldType: 'textarea',
    required: true,
    aiAssist: true,
  },
  {
    fieldKey: 'tension_held',
    label: 'One tension I still hold',
    fieldType: 'textarea',
    aiAssist: true,
  },
  {
    fieldKey: 'would_share',
    label: 'Would I share this with my community? Why or why not?',
    fieldType: 'textarea',
    aiAssist: true,
  },
];

function engageFields(fields: Array<[string, string, boolean?]>): QuestionSeed[] {
  return fields.map(([fieldKey, label, required]) => ({
    fieldKey,
    label,
    fieldType: fieldKey === 'dp_hook' ? 'dp_hook' : 'textarea',
    required: required ?? fieldKey !== 'dp_hook',
    aiAssist: fieldKey !== 'dp_hook',
  }));
}

/** Pacific workshop slots from Luma (Mondays 11:30 AM–1:00 PM PT). */
const FORK_SESSION_SCHEDULE = [
  { startsAt: '2026-08-10T18:30:00.000Z', endsAt: '2026-08-10T20:00:00.000Z' },
  { startsAt: '2026-08-17T18:30:00.000Z', endsAt: '2026-08-17T20:00:00.000Z' },
  { startsAt: '2026-08-24T18:30:00.000Z', endsAt: '2026-08-24T20:00:00.000Z' },
  { startsAt: '2026-08-31T18:30:00.000Z', endsAt: '2026-08-31T20:00:00.000Z' },
] as const;

export const FORK_SESSION_SEEDS = [
  {
    sessionNumber: 1,
    slug: 'the-first-fork',
    title: 'The First Fork: You → AI → Everything Else',
    imageUrl: '/images/perspectives/a-fork-in-the-web/you-ai-everything-else.webp',
    startsAt: FORK_SESSION_SCHEDULE[0].startsAt,
    endsAt: FORK_SESSION_SCHEDULE[0].endsAt,
    liveUrl: 'https://luma.com/polb50e0',
    facilitatorBlurb:
      'Name what disappears when intelligence replaces place — and what must not become only an AI tunnel.',
    perspectiveAnchor: 'the-internet-where-we-stop-going-to-the-internet',
    relatedDpIds: ['DP2', 'DP4', 'DP8'],
    preReads: [
      {
        label: 'A Fork in the Web — the first fork',
        url: '/perspectives/a-fork-in-the-web#the-internet-where-we-stop-going-to-the-internet',
        minutesEstimate: 2,
      },
      {
        label: 'Pro-Human AI Declaration',
        url: 'https://humanstatement.org/',
        minutesEstimate: 5,
      },
      {
        label: 'Optional: Full essay — A Fork in the Web',
        url: '/perspectives/a-fork-in-the-web',
        minutesEstimate: 19,
        optional: true,
      },
    ],
    sections: [
      { sectionKey: 'prepare' as const, title: 'Prepare', pearlStage: 'prepare', questions: SHARED_PREPARE },
      {
        sectionKey: 'engage' as const,
        title: 'Engage — Human Place Requirements',
        pearlStage: 'engage',
        questions: engageFields([
          ['scenario', 'Scenario (information need we mapped)'],
          ['ai_path_optimizes', 'What the AI path optimizes for'],
          ['direct_human_preserves', 'What the direct-human path preserves'],
          ['not_ai_tunnel', 'Must not become only an AI tunnel (one sentence)'],
          ['human_place_requirements', 'Human place requirements (persistence, co-presence, contestability, etc.)'],
          ['dp_hook', 'Optional DP hook', false],
        ]),
      },
      { sectionKey: 'reflect' as const, title: 'Reflect', pearlStage: 'reflect', questions: SHARED_REFLECT },
    ],
  },
  {
    sessionNumber: 2,
    slug: 'concierge-vs-commons',
    title: 'Concierge vs. Commons',
    imageUrl: '/images/perspectives/a-fork-in-the-web/concierge-vs-commons.webp',
    startsAt: FORK_SESSION_SCHEDULE[1].startsAt,
    endsAt: FORK_SESSION_SCHEDULE[1].endsAt,
    liveUrl: 'https://luma.com/j5s1q67g',
    facilitatorBlurb:
      'Separate brilliant convenience from shared, contestable context — an extraordinarily capable concierge is not a commons.',
    perspectiveAnchor: 'we-could-solve-the-symptoms-without-solving-the-architecture',
    relatedDpIds: ['DP14', 'DP22', 'DP20'],
    preReads: [
      {
        label: 'Privatization of Context',
        url: '/perspectives/a-fork-in-the-web#the-privatization-of-context',
        minutesEstimate: 1,
      },
      {
        label: 'Concierge vs. Commons',
        url: '/perspectives/a-fork-in-the-web#we-could-solve-the-symptoms-without-solving-the-architecture',
        minutesEstimate: 1,
      },
    ],
    sections: [
      { sectionKey: 'prepare' as const, title: 'Prepare', pearlStage: 'prepare', questions: SHARED_PREPARE },
      {
        sectionKey: 'engage' as const,
        title: 'Engage — Minimum Viable Commons',
        pearlStage: 'engage',
        questions: engageFields([
          ['shared_resource', 'Shared resource (URL, document, policy, or event)'],
          ['who_speaks', 'Who can speak for themselves here?'],
          ['what_persists', 'What persists after the session?'],
          ['where_dissent', 'Where does dissent accumulate?'],
          ['one_week_experiment', 'One-week experiment your community could run'],
          ['dp_hook', 'Optional DP hook', false],
        ]),
      },
      { sectionKey: 'reflect' as const, title: 'Reflect', pearlStage: 'reflect', questions: SHARED_REFLECT },
    ],
  },
  {
    sessionNumber: 3,
    slug: 'human-centered-layered-web',
    title: 'Designing the Human-Centered Layered Web',
    imageUrl: '/images/perspectives/a-fork-in-the-web/human-centered-layered-web.webp',
    startsAt: FORK_SESSION_SCHEDULE[2].startsAt,
    endsAt: FORK_SESSION_SCHEDULE[2].endsAt,
    liveUrl: 'https://luma.com/grrdboa9',
    facilitatorBlurb:
      'Sketch architecture — many worlds around one resource, with AI as inhabitant not landlord.',
    perspectiveAnchor: 'a-human-centered-layered-web',
    relatedDpIds: ['DP7', 'DP8', 'DP19'],
    preReads: [
      {
        label: 'A Human-Centered Layered Web',
        url: '/perspectives/a-fork-in-the-web#a-human-centered-layered-web',
        minutesEstimate: 3,
      },
      {
        label: 'AI as inhabitant, not landlord',
        url: '/perspectives/a-fork-in-the-web#ai-should-be-an-inhabitant-not-the-landlord',
        minutesEstimate: 1,
      },
    ],
    sections: [
      { sectionKey: 'prepare' as const, title: 'Prepare', pearlStage: 'prepare', questions: SHARED_PREPARE },
      {
        sectionKey: 'engage' as const,
        title: 'Engage — Layered Web Stack',
        pearlStage: 'engage',
        questions: engageFields([
          ['substrate', 'Substrate (shared resource)'],
          ['environment_1', 'Environment 1 (who, what activity)'],
          ['environment_2', 'Environment 2'],
          ['environment_3', 'Environment 3'],
          ['environment_4', 'Environment 4'],
          ['portable', 'What must be portable (identity, data, context)'],
          ['open_protocols', 'Open protocols needed'],
          ['ai_role', 'AI role (inhabitant, not landlord)'],
          ['draft_dp_paragraph', 'Draft Desirable Property paragraph'],
          ['dp_hook', 'Optional DP hook', false],
        ]),
      },
      { sectionKey: 'reflect' as const, title: 'Reflect', pearlStage: 'reflect', questions: SHARED_REFLECT },
    ],
  },
  {
    sessionNumber: 4,
    slug: 'sovereignty-and-second-fork',
    title: 'Sovereignty, Subsidiarity & the Second Fork',
    imageUrl: '/images/perspectives/a-fork-in-the-web/intellectual-sovereignty-subsidiarity.webp',
    startsAt: FORK_SESSION_SCHEDULE[3].startsAt,
    endsAt: FORK_SESSION_SCHEDULE[3].endsAt,
    liveUrl: 'https://luma.com/cwjilts3',
    facilitatorBlurb:
      'Turn principles into delegation rules — sovereignty is the right; subsidiarity is the operating principle.',
    perspectiveAnchor: 'the-second-fork-in-the-road',
    relatedDpIds: ['DP2', 'DP11', 'DP12', 'DP22'],
    preReads: [
      {
        label: 'Intellectual Sovereignty & Subsidiarity',
        url: '/perspectives/a-fork-in-the-web#intellectual-sovereignty',
        minutesEstimate: 1,
      },
      {
        label: 'AI & Human Agency pathway (principles)',
        url: '/pathways/ai-human-agency#principles-heading',
        minutesEstimate: 1,
      },
      {
        label: 'Optional: Full pathway — AI & Human Agency',
        url: '/pathways/ai-human-agency',
        minutesEstimate: 10,
        optional: true,
      },
    ],
    sections: [
      { sectionKey: 'prepare' as const, title: 'Prepare', pearlStage: 'prepare', questions: SHARED_PREPARE },
      {
        sectionKey: 'engage' as const,
        title: 'Engage — Second Fork Statement',
        pearlStage: 'engage',
        questions: engageFields([
          ['scenario', 'Scenario'],
          ['sovereignty', 'Who holds authority over meaning? (sovereignty)'],
          ['tasks_stay_human', 'Tasks that must stay human/community'],
          ['tasks_delegate_ai', 'Tasks rightly delegated to AI'],
          ['subsidiarity_rule', 'Subsidiarity rule (one sentence)'],
          ['human_place', 'Human place worth defending'],
          ['second_fork_for_me', 'The second fork for me (one sentence)'],
          ['action_7_days', 'One action in 7 days'],
          ['dp_hook', 'Optional DP hook', false],
        ]),
      },
      { sectionKey: 'reflect' as const, title: 'Reflect', pearlStage: 'reflect', questions: SHARED_REFLECT },
    ],
  },
] satisfies Array<{
  sessionNumber: number;
  slug: string;
  title: string;
  imageUrl: string;
  startsAt: string;
  endsAt: string;
  liveUrl: string;
  facilitatorBlurb: string;
  perspectiveAnchor: string;
  relatedDpIds: string[];
  preReads: PreReadSeed[];
  sections: SectionSeed[];
}>;

export type ForkSessionSeed = (typeof FORK_SESSION_SEEDS)[number];
