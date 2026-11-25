/**
 * Overweb Book Club: one pad (/pads/book-club) for every meeting. Add a meeting here when the club picks its next
 * reading. Cadence (owner, 25 Nov 2026): weekly to start, then every two weeks or less.
 *
 * Pure data, no runtime imports (session-chat-core.ts and scripts/book-club.test.mjs read it).
 */

export type BookClubLink = { label: string; href: string; note?: string };

export type BookClubVote = { question: string; outcome?: string; href?: string };

export type BookClubMeeting = {
  /** YYYY-MM-DD, Pacific date of the meeting. Also the ?m= value on the pad. */
  id: string;
  /** What is being read, as it appears in the chapter selector. */
  chapter: string;
  /** ISO start time with offset. */
  startsAt: string;
  durationMin: number;
  /** Where the meeting happens (no Zoom links here: the session page and Luma carry them). */
  sessionHref?: string;
  sessionLabel?: string;
  lumaUrl?: string;
  featured: BookClubLink[];
  extraCredit: BookClubLink[];
  /** Prompts to think about while reading. */
  prompts: string[];
  /** After the meeting: Claude synthesis, participants can correct it. */
  summary?: string[];
  decisions?: string[];
  /** The meeting's review draft (each session has its own commentable Doc). */
  reviewDocUrl?: string;
  reviewNote?: string;
  /** Few or none early on. */
  votes?: BookClubVote[];
};

const BOOK = 'https://book.desirableproperties.org/viewer';

export const BOOK_CLUB = {
  title: 'Overweb Book Club',
  book: 'The Layered Web',
  /** Gov Hub waitlist for the club (the owner creates it in the Overweb layer). Null until it exists. */
  waitlistUrl: null as string | null,
  cadence: 'Weekly to start, then every two weeks or less.',
  meetings: [
    {
      id: '2026-11-30',
      chapter: 'Front matter',
      startsAt: '2026-11-30T10:00:00-08:00',
      durationMin: 30,
      sessionHref: '/roundups/2026-11-30',
      sessionLabel: 'the 30 November session',
      lumaUrl: 'https://luma.com/gra1xda9',
      featured: [
        { label: 'About this digital monument', href: `${BOOK}/book_cover` },
        { label: 'Foreword', href: `${BOOK}/foreword` },
        { label: 'Introduction', href: `${BOOK}/intro` },
        { label: 'Acknowledgements', href: `${BOOK}/acknowledgements` },
      ],
      extraCredit: [
        {
          label: 'The 23 November session, where the book club was decided',
          href: '/events/listening-2026-11-23#book-club',
        },
        {
          label: 'Proposals reopened for Version 1.1',
          href: '/pads#proposals',
          note: 'Changes people want in the next edition. Pick one you agree or disagree with.',
        },
      ],
      prompts: [
        'What is this book trying to be, and who is it for?',
        'The book was written in the open by 70+ people. What does that change about how you read it?',
        'What question or insight would you bring to the group?',
      ],
    },
  ] satisfies BookClubMeeting[] as BookClubMeeting[],
};

/** Chat thread slug for one meeting (session-chat-core.ts lists these). */
export function bookClubChatSlug(id: string): string {
  return `book-club-${id}`;
}

/** Proposal key for one meeting, stored like a session date in dp_session_proposal.session_date. */
export function bookClubProposalKey(id: string): string {
  return `book-club-${id}`;
}

export const BOOK_CLUB_PATH = '/pads/book-club';

export function bookClubHref(id?: string, anchor?: string): string {
  return `${BOOK_CLUB_PATH}${id ? `?m=${id}` : ''}${anchor ? `#${anchor}` : ''}`;
}

export type BookClubPhase = 'before' | 'during' | 'after';

/** "During" runs from 10 minutes before the start to 15 minutes after the planned end. */
export function bookClubPhase(m: Pick<BookClubMeeting, 'startsAt' | 'durationMin'>, now: Date): BookClubPhase {
  const start = new Date(m.startsAt).getTime();
  const t = now.getTime();
  if (t < start - 10 * 60_000) return 'before';
  if (t <= start + (m.durationMin + 15) * 60_000) return 'during';
  return 'after';
}

/** The meeting to show by default: the one under way, else the next, else the latest. */
export function currentBookClubMeeting(meetings: BookClubMeeting[], now: Date): BookClubMeeting | null {
  const sorted = [...meetings].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return (
    sorted.find((m) => bookClubPhase(m, now) === 'during') ??
    sorted.find((m) => bookClubPhase(m, now) === 'before') ??
    sorted[sorted.length - 1] ??
    null
  );
}

export function findBookClubMeeting(meetings: BookClubMeeting[], id: string | null | undefined): BookClubMeeting | null {
  return id ? meetings.find((m) => m.id === id) ?? null : null;
}
