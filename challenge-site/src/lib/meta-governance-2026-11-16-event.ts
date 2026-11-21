/**
 * Notes page for the DP Meta-Governance listening session (Zoom, Monday 16 November 2026, 10:00–11:30 a.m. PT).
 * Not video recorded: the page carries a summary and Zoom's automatic transcript. The transcript is built by
 * ~/handoff/dp-2026-11-16-governance-review/build_transcript.py (held-back passages are listed there for the owner).
 * The page is noindex and is not linked from navigation or a sitemap: transcript visibility is not a settled policy.
 */
export const META_GOV_EVENT_PATH = '/events/meta-governance-2026-11-16';
export const META_GOV_TITLE = 'DP Meta-Governance: Creating a Living Book Together';
export const META_GOV_DATE_LABEL = 'Monday 16 November 2026';
export const META_GOV_TIME_LABEL = '10:00–11:30 a.m. Pacific Time';
export const META_GOV_LUMA_URL = 'https://luma.com/6bqcfew2';
export const META_GOV_CORRECTIONS_EMAIL = 'daveed@bridgit.io';

/** Summary, same wording as the meeting digest (out/2026-11-16/digest.md, "Summary"). Timestamps link into the transcript. */
export const META_GOV_SUMMARY: readonly string[] = [
  'The host proposed a weekly cycle as a four-session pilot. Monday is a listening session; Claude drafts a ballot from the transcript; participants have 24 hours to correct it; the council screens it for readiness; the community votes over 48 or 72 hours; owners implement the result (00:06:37 to 00:09:51, 00:38:31 to 00:41:23). Benn Konsynski (“You need that cadence. I agree”), Leandra Preston and Stella Alvo spoke in support, and no objection was recorded (00:10:02, 00:46:02, 00:46:10). Stella Alvo asked that the process respect people’s time and time zones (00:46:31).',
  'On co-editors, the host said the site now allows 3 co-editors per DP, with 2 approvals needed (00:49:36). Stella Alvo was concerned that 3 seats will be hard to fill, since 2 were already hard (00:41:37). Gael Van Weyenbergh suggested trying it: “practice will tell” (00:51:07). No vote was taken.',
  'A single decline ending a proposal was opposed by Leandra Preston, Benn Konsynski and Lord M.E.G.A Zion (Zoom name) (01:17:26 to 01:18:36). The host summarized the room as wanting to keep two things: a decline must carry a rationale, and two approvals can overrule a decline (01:18:52). The published process text still says a single no declines a proposal.',
  'Approval threshold for community ballots: the host put forward 50% (00:53:20). Lord M.E.G.A Zion suggested that 50% should keep an item alive for review, while 60% to 70% should signal it can move forward (00:53:35 to 00:55:48). Gael Van Weyenbergh suggested working by consent, falling back to consensus, with a route to revisit decisions (00:55:58). No one offered a view on quorum (00:56:50 to 00:57:33).',
  'Chapter title changes, using DP10 “Education” to “Learning and Adaptation” as the example (00:57:41): Benn Konsynski supported requiring clear approval (00:58:16). Stella Alvo suggested 75% of the chapter’s authors, then the steering committee at 50% (01:00:17). Leandra Preston suggested the steering committee plus the chapter’s co-editors and authors (01:00:05). The host was open to a full community vote (00:59:28).',
  'Council: participants discussed an elected council to screen ballots. Gael Van Weyenbergh suggested five members, citing the panchayat tradition (01:14:56). The host leaned toward a council for the Desirable Properties specifically. Several participants signalled support (01:13:47 to 01:16:32). Renad Baomar and Leandra Preston both volunteered to serve on the council (01:15:13).',
  'Co-editor vetting: today, any account at least 7 days old can claim a seat, with no vetting (01:19:38). Lord M.E.G.A Zion favoured a questionnaire, voluntary statements and ongoing review (01:20:57, 01:22:18). The host suggested a co-editor agreement, and several participants signalled yes (01:22:45 to 01:23:50).',
  'Debrief of Version 1.0: Leandra Preston praised the AI review tools (00:18:15). Gael Van Weyenbergh asked for notifications when a contribution is accepted or declined, and for an overview of the whole book (00:20:52). Benn Konsynski suggested a taxonomy of common rejection reasons (00:23:44, 00:23:58). Lord M.E.G.A Zion shared a sketch of an interactive UI (00:25:30 to 00:31:43).',
  'Growth ideas: a case studies section or an online appendix (00:04:41, 00:11:33); university engagement (00:10:17); student hackathons or “bookathons” starting with 4 or 5 schools (00:14:26); a book club (Allison Gustavson, 01:01:09; formats discussed through 01:08:48).',
  'Communication: Signal does not work in Oman (Renad Baomar, 01:10:44). The host will open the existing WhatsApp group to everyone interested and share the Signal link (01:11:02 to 01:12:02). Joel Okomoli asked for an advance notice email before the 24-hour review window opens (01:25:50).',
];

/** Who spoke in the 16 November session, in order of first contribution. */
export const META_GOV_SPEAKERS: readonly string[] = [
  'Daveed Benjamin (host)',
  'Leandra Preston',
  'Lord M.E.G.A Zion (Zoom name)',
  'Benn Konsynski',
  'Gael Van Weyenbergh',
  'Stella Alvo',
  'Allison Gustavson',
  'Joel Okomoli',
  'Renad Baomar',
];

/** The eight decision titles from the digest ("Decisions needed"). The options and draft ballot questions go out on Tuesday. */
export const META_GOV_DECISIONS: readonly string[] = [
  'Should the weekly decision cycle run as a four-session pilot?',
  'How long should the correction window and the voting period be?',
  'What approval threshold and quorum should community ballots use?',
  'How many co-editors per DP, and how many approvals?',
  'What happens when a co-editor declines?',
  'Who approves a chapter title change?',
  'Should there be an elected council, and what should it look like?',
  'Should co-editors be vetted, or sign an agreement?',
];

/** Open questions, same wording as the digest. */
export const META_GOV_OPEN_QUESTIONS: readonly string[] = [
  'Who is in the voting body? The host said everyone who has contributed or co-edited (00:48:25). How eligibility is checked was not discussed.',
  'How would council elections run, and what does the current five-person steering committee do until then (01:14:06)?',
  'What quorum applies, if any? No one gave a view (00:57:14).',
  'If someone misses the 24-hour window, the host said the issue goes to a future meeting or ballot (00:47:45). Is that enough?',
  'How can people outside the Monday time slot take part, for example through other times or asynchronous input (Stella Alvo, 00:46:37)?',
  'How can the project recruit enough co-editors beyond the core group, especially if there are 3 seats (00:41:37, 00:42:53)?',
  'Book club format: 20 or 30 minutes inside the Monday meeting, or a separate session; weekly or every two weeks; asynchronous comments in the margins (01:02:26 to 01:08:48). Only Lord M.E.G.A Zion answered when the host asked who would read a chapter in advance (01:05:05).',
  'Should a case studies section be part of the official book, or an online-only appendix? What is inscribed on chain and what stays online (00:04:41 to 00:05:58, 00:13:41)?',
  'How can implementation work on the code move from the host alone to a small group (00:40:40)?',
  'Feedback on the Version 1.0 PDF was requested but none was given (00:23:23).',
  'What should the vetting questionnaire or co-editor agreement contain (01:22:18, 01:22:45)?',
];

export type MetaGovTurn = { id: string; t: number; speaker: string; text: string };
export type MetaGovSection = { t: number; title: string };

/** "01:17:26" clock used by the digest and the transcript. */
export function sessionClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

export function parseClock(clock: string): number {
  const [h, m, s] = clock.split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

/** The turn a digest timestamp falls in: the last turn starting at or before it. */
export function turnAt(turns: readonly MetaGovTurn[], seconds: number): MetaGovTurn | undefined {
  let found: MetaGovTurn | undefined;
  for (const turn of turns) {
    if (turn.t <= seconds + 0.5) found = turn;
    else break;
  }
  return found;
}
