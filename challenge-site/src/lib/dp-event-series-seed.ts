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
  minLength?: number;
};

/** Session 1 text fields — minimum reflection length before submit. */
export const FORK_SESSION_1_TEXT_MIN_LENGTH = 200;

function withTextMinLength(q: QuestionSeed, min = FORK_SESSION_1_TEXT_MIN_LENGTH): QuestionSeed {
  if (q.fieldType === 'checkbox') return q;
  return { ...q, minLength: min };
}

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

/** Session 1 Prepare — Human Statement values check-in (Workshop 1 plenary). */
const SESSION_1_PREPARE: QuestionSeed[] = [
  {
    fieldKey: 'pre_read_confirmed',
    label:
      'I reviewed the Pro-Human AI Declaration at humanstatement.org (or attended/watched the session)',
    fieldType: 'checkbox',
    required: true,
  },
  withTextMinLength({
    fieldKey: 'humanstatement_resonated',
    label: 'What resonated with me about the pro-human framing',
    fieldType: 'textarea',
    required: true,
    aiAssist: true,
  }),
  withTextMinLength({
    fieldKey: 'humanstatement_troubled',
    label: 'What troubled me or gave me pause',
    fieldType: 'textarea',
    aiAssist: true,
  }),
  withTextMinLength({
    fieldKey: 'principle_keep_change_reject',
    label: 'One principle I would keep, change, or reject (and why)',
    fieldType: 'textarea',
    required: true,
    aiAssist: true,
  }),
  withTextMinLength({
    fieldKey: 'would_sign_declaration',
    label: 'Would I sign the declaration? Why or why not?',
    fieldType: 'textarea',
    required: true,
    aiAssist: true,
  }),
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

const SESSION_1_REFLECT: QuestionSeed[] = SHARED_REFLECT.map((q) => withTextMinLength(q));

function engageFields(
  fields: Array<[string, string, boolean?]>,
  options?: { textMinLength?: number },
): QuestionSeed[] {
  return fields.map(([fieldKey, label, required]) => ({
    fieldKey,
    label,
    fieldType: fieldKey === 'dp_hook' ? 'dp_hook' : 'textarea',
    required: required ?? fieldKey !== 'dp_hook',
    aiAssist: fieldKey !== 'dp_hook',
    ...(options?.textMinLength ? { minLength: options.textMinLength } : {}),
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
        label: 'Full essay — A Fork in the Web',
        url: '/perspectives/a-fork-in-the-web',
        minutesEstimate: 19,
        optional: true,
      },
    ],
    sections: [
      { sectionKey: 'prepare' as const, title: 'Prepare', pearlStage: 'prepare', questions: SESSION_1_PREPARE },
      {
        sectionKey: 'engage' as const,
        title: 'Engage — What AI Should Not Replace',
        pearlStage: 'engage',
        questions: engageFields(
          [
            [
              'ai_stood_between',
              'A recent time AI stood between me and a site, source, service, person, or community',
            ],
            ['easier_and_hidden', 'What became easier — and what moved behind the interface'],
            [
              'remain_reachable',
              'One thing that should remain directly reachable, inspectable, or participatory (and why)',
            ],
            [
              'trust_high_stakes',
              'What I would need to trust an AI-mediated answer in a high-stakes situation (e.g. health, voting, education)',
            ],
            ['not_ai_tunnel', 'Must not become only an AI tunnel (one sentence)'],
            ['dp_hook', 'Optional DP hook', false],
          ],
          { textMinLength: FORK_SESSION_1_TEXT_MIN_LENGTH },
        ),
      },
      { sectionKey: 'reflect' as const, title: 'Reflect', pearlStage: 'reflect', questions: SESSION_1_REFLECT },
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
        label: 'Full pathway — AI & Human Agency',
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
