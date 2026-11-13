/**
 * Copy for /improve ("Help shape Version 1.1"). Edit freely: the page renders whatever is here.
 *
 * Sources for the drafted copy (keep it to what the project has already said):
 * - Version 1.1 picks up the MTPs, glossaries and everything deferred from 1.0: /participate, site FAQ, /challenge.
 * - Chapter glossaries and steering-decided purpose statements planned; Version 1.2 adds reviewed images: /press.
 * - Every chapter ends with "Open Questions and Future Work" and most with a "Path Toward ML-RFC": book content.
 * - Requirements use MUST / SHOULD / MAY; Version 1.0 feeds the ML-REQs in December: src/data/dp-process.ts.
 * - DPs → ML-REQs → ML-ADRs → the Overweb: /v1 and the book's About page.
 * - Desirable Properties book V2 (post-launch requirements, ADRs, implementation learning): challenge-timeline.json.
 */

export type ImproveLink = { label: string; href: string };

export type ImprovePriority = {
  title: string;
  body: string;
  link?: ImproveLink;
};

export const IMPROVE_HERO = {
  eyebrow: 'Version 1.0 is out · Version 1.1 is open',
  title: 'Help shape Version 1.1',
  lead:
    'The Layered Web: The Desirable Properties of a Meta-Layer is a living book. Version 1.0 sets out 24 properties a trustworthy layer above the web must have, decided in the open across 1,635 proposals. Version 1.1 starts now, and it is written the same way: by the people who read it.',
  ways: [
    {
      key: 'contribute',
      title: 'Contribute',
      body: 'Select a passage in any chapter and propose better wording, a missing case or a sharper requirement.',
    },
    {
      key: 'coedit',
      title: 'Co-edit a DP',
      body: 'Each DP has three co-editor seats. Co-editors read every proposal for their chapter and decide what goes in.',
    },
    {
      key: 'steer',
      title: 'Steer Version 1.1',
      body: 'The steering committee keeps the 24 chapters consistent and signs off each document. Volunteer for 1.1.',
    },
  ],
} as const;

export const IMPROVE_STATS: Array<[string, string]> = [
  ['24', 'Desirable Properties'],
  ['28', 'documents, with the front matter'],
  ['1,635', 'proposals decided in the open'],
  ['57', 'community contributors in the open review'],
];

export const PRIORITIES_V1_1: { intro: string; items: ImprovePriority[] } = {
  intro:
    'Version 1.1 is an open revision. These are the places where help goes furthest. None of them is closed: if you see something more important, propose it.',
  items: [
    {
      title: 'Pick up what 1.0 held back',
      body: 'The MTPs were held out of Version 1.0 for 1.1, and chapter glossaries and steering-decided purpose statements are planned for this revision. Draft, challenge or improve them.',
    },
    {
      title: 'Work through the open questions',
      body: 'Every chapter ends with “Open Questions and Future Work”. Proposals that answer a question, sharpen it, or show where two chapters disagree are especially welcome.',
      link: { label: 'Read the book', href: 'https://book.desirableproperties.org/' },
    },
    {
      title: 'Revisit what was deferred or considered',
      body: 'Some proposals were marked Considered, and items still open when a steering stage closed were deferred to 1.1 with their votes kept. Filter the explorer below by status to find them.',
    },
    {
      title: 'Make each property testable',
      body: 'Requirements use MUST, SHOULD and MAY deliberately, and a requirement that cannot be checked becomes guidance. Proposals that make a chapter’s minimums checkable help the requirements work that follows.',
      link: { label: 'How the book is made', href: '/process' },
    },
    {
      title: 'Keep the 24 chapters consistent',
      body: 'Terms, cross-references and claims should agree across neighbouring DPs. Reading two related chapters side by side is one of the most useful reviews anyone can do.',
    },
    {
      title: 'Fill the co-editor seats',
      body: 'A chapter moves only as fast as its co-editors. Check which DPs below have an open seat, and claim one or nominate someone who should hold it.',
    },
  ],
};

export const LOOKING_TO_V2: { intro: string; items: ImprovePriority[]; note: string } = {
  intro:
    'The Desirable Properties are the first step of a circuit that turns shared values into running software, and running software back into better values.',
  items: [
    {
      title: 'Requirements (ML-REQs)',
      body: 'Each property becomes testable requirements. Version 1.0 is the input; the project timeline has this work starting in December 2026.',
      link: { label: 'Requirements at theoverweb.org', href: 'https://theoverweb.org/reqs/' },
    },
    {
      title: 'Architecture decisions (ML-ADRs)',
      body: 'Requirements become recorded design decisions, tied to code and tests. Most chapters already name what they need in a “Path Toward ML-RFC” section.',
      link: { label: 'Architecture decisions at theoverweb.org', href: 'https://theoverweb.org/adrs/' },
    },
    {
      title: 'The Overweb',
      body: 'Built and piloted against those decisions. What the builds teach flows back into the properties.',
    },
    {
      title: 'Version 2 of the book',
      body: 'The project timeline sketches a Version 2 that folds in the requirements, the architecture decisions and what implementation teaches. Its scope is open: tell us what it should hold.',
    },
  ],
  note: 'Before then, Version 1.2 is planned to add reviewed images.',
};

/** Steering: where to volunteer (no dedicated sign-up exists; /participate points to the support page). */
export const STEERING_INTEREST = {
  href: '/support',
  label: 'Volunteer through the support page',
  hint: 'Choose “General” and say which DPs or kinds of review interest you.',
};
