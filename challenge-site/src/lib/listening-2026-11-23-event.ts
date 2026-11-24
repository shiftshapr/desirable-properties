/**
 * Record for DP Listening Experiment 1/4 (Zoom, Monday 23 November 2026, 10:00–11:30 a.m. PT), meeting
 * "Ballot results and the first weekly cycle". Durable page: /events/listening-2026-11-23.
 *
 * Sources: the meeting recording (84.5 minutes), transcribed word by word by speech recognition, with speakers
 * taken from Deepi's live transcript (Deepi, the meeting assistant, was in the call from about 00:20:00; before
 * that, speakers come from Deepi's first visit up to 00:04:30 and from the content of what was said). Two
 * participants who spoke at 00:13:01 and 00:15:27 could not be identified and are shown as "Speaker unclear".
 * Personal check-ins, a short exchange about AI news and the attempts to make Deepi speak aloud are left out.
 * Not for search engines: whether meeting transcripts are public is not yet a settled policy.
 */
import type { MetaGovSection, MetaGovTurn } from '@/lib/meta-governance-2026-11-16-event';

export type ListeningTurn = MetaGovTurn;
export type ListeningSection = MetaGovSection;

export const LISTENING_1123_EVENT_PATH = '/events/listening-2026-11-23';
export const LISTENING_1123_DATE_LABEL = 'Monday 23 November 2026';
export const LISTENING_1123_TIME_LABEL = '10:00–11:30 a.m. Pacific Time';
export const LISTENING_1123_LUMA_URL = 'https://luma.com/nqyu7j5r';

/** Summary drafted by Claude from the transcript. Timestamps link into the transcript. */
export const LISTENING_1123_SUMMARY: readonly string[] = [
  'Opening statement on gates (00:03:51 to 00:12:09): the host read a statement on four kinds of digital gate (who comes in, what comes in, who leaves, what data leaves) and asked whether the book treats gates well and whether gating deserves its own property (00:10:18). Responses: gates are about agency, and the DPs partly cover them already (speaker unclear, 00:13:01); email pop-ups and cookie banners are everyday gates that people work around with throwaway addresses (speaker unclear, 00:15:27); Rick Botelho suggested a four-column table of personal, professional, commons and corporate gates, since most people do not see what they give away (00:17:52); Salwa El Mais asked that gates not impose needless restrictions (00:19:40); Laura Del Campo said gates should be doorways without discrimination, not gatekeeping (00:20:31); Leandra Preston and Rick Botelho spoke about children, social media and parental gates (00:21:16 to 00:25:42); Michelle Thuo said an open gate without a ramp still keeps people out, so entry points must work across devices, connectivity and verification (00:25:58). Everyone the host asked agreed their comments could be used in a video.',
  'Rick Botelho asked which desirable properties parents need to trust gated platforms for children (00:27:39). Deepi answered in the chat, and the host read it out: age and guardian consent (DP1, DP4), transparency about algorithms (DP14), parental visibility and control (DP2) (00:29:18). The host floated an extra section of the book, official or not, with chapters on cross-cutting topics such as gates, bridges or smart tags (00:29:59). No one responded.',
  'Results of the 16 November ballot (00:31:25 to 00:43:06): 24 people voted and 14 of 15 questions were decided. The host read out the results: the four-session pilot (20 to 1), the two-tier approval rule (11 votes), 3 co-editor seats with 2 approvals (20 to 2), a decline keeps the current rule, title changes by 75% of a chapter’s authors and co-editors (16 votes), a co-editor agreement, a vetting questionnaire screened against published criteria, an elected council, the interim council, a council scope covering the wider Meta-Layer Initiative, and published screening criteria (21 to 2). He also noted the 48-hour correction window and 72-hour voting period people chose (00:43:51).',
  'Quorum tie (question 5) was not settled. The host asked whether anyone objected to no quorum for the next four weeks and heard no objection (00:35:28); Joel Okomoli then spoke for 25% of the voting body (00:36:09). The host suggested 25% of the active voting body, said he would work out who counts as active, and would put it on this session page (00:37:04). While reading the results he said the tie was with no quorum (00:33:11); the published tally has the tie between a minimum of 20 votes and 25% of the voting body (00:31:25).',
  'Interim council: Leandra Preston, Renad Baomar and Phahsa had already said they were in (00:40:11). Michelle Thuo, whose microphone was not working, confirmed in the chat, as Joel Okomoli relayed (00:50:45, 00:51:20). The host: “So we have an interim council now” (00:51:35). Phahsa said the wider council scope lacked a clear roadmap (00:42:12); the host said the near-to-medium-term focus is the DPs and the Metaweb Academy certification programme (00:42:29).',
  'How the first cycle went: Leandra Preston found it easy, and the heads-up and reminder helpful (00:45:49); in the chat, Joel Okomoli called the reminder very helpful and Renad Baomar said it was well organized. The host said the page header still showed voting after the vote closed and that he would fix the sync of status and outcomes in code (00:45:58).',
  'Next questions (00:46:39 to 00:49:30): one person, one vote. The host said nothing yet stops one person from voting with several accounts; it should be done soon, though he did not think anyone voted twice (00:47:17). He asked whether transcripts should be put on the session page and kept, with 48 hours for corrections (00:47:17, 00:48:24); Laura Del Campo agreed (00:49:15). He listed ties, conflicting outcomes, implementation owners and reopening decisions as topics, without discussion (00:48:24). Mike McGuire’s idea of daily review sprints was mentioned; the host asked for Mike’s own explanation (00:49:30).',
  'Suggestions from the host’s walk-through with Markabadi, put forward for next week’s vote (00:51:35 to 00:59:13): an option goes into the draft ballot only if someone seconds it (Laura Del Campo and Leandra Preston supported it, 00:55:20, 00:55:39); multi-select voting when several items are picked (the host: “we can handle that”); a 30-second check-in; one major inquiry per session; plain English before formal ballot wording; the AI assistant raising its hand; and opt-in text reminders that skip people who have already voted (00:55:58, 00:58:17).',
  'The host showed the pads (00:59:13 to 01:05:49): session pads, 40 proposal pads for the proposals deferred to Version 1.1, where readers can support and co-editors approve, and meeting pads. Leandra Preston asked whether people can work on the deferred proposals now; the host said yes (01:16:57).',
  'Book club, decided in the room: next week’s session (30 November) includes a 30-minute book club on the book’s front matter: About this digital monument, the Foreword, the Introduction and the Acknowledgements (01:11:39). Renad Baomar, Leandra Preston and Salwa El Mais supported the idea (01:07:11 to 01:09:21); Salwa El Mais moved to go ahead (01:12:48) and Leandra Preston seconded (01:13:25). Joel Okomoli suggested that after the first weeks the group pick chapters by interest or background (01:14:01); the host proposed putting the book club cadence on next week’s agenda, and Joel Okomoli seconded (01:14:38, 01:14:45).',
  'Leandra Preston is writing a two-page brief on the metaweb for the Scholars Strategy Network and asked for feedback before she submits it (01:18:58). Phahsa and others offered to read it.',
];

/** Decisions taken in the room (not by ballot). */
export const LISTENING_1123_DECIDED: readonly string[] = [
  'Interim council formed: Daveed Benjamin, Leandra Preston, Michelle Thuo, Phahsa and Renad Baomar, following the 16 November vote and Michelle Thuo’s confirmation in the chat (00:51:35).',
  'Book club: a 30-minute book club in the 30 November session on the front matter (About this digital monument, Foreword, Introduction, Acknowledgements). Moved by Salwa El Mais, seconded by Leandra Preston (01:12:48, 01:13:25).',
  'The book club cadence goes on next week’s agenda. Joel Okomoli raised it (01:14:01); the host proposed it for next week and Joel Okomoli seconded (01:14:38, 01:14:45).',
];

/** Follow-ups named in the meeting. */
export const LISTENING_1123_FOLLOW_UPS: readonly string[] = [
  'Daveed Benjamin: work out who counts as the active voting body and put the quorum options on this page (00:37:04).',
  'Daveed Benjamin: stop one person voting with several accounts (account linking) (00:47:17).',
  'Daveed Benjamin: keep the session page header, status and outcomes in sync after a vote closes (00:45:58).',
  'Ask Mike McGuire to explain the daily review sprint idea during this cycle (00:49:30).',
  'Tell people who missed this meeting that the 30 November book club reads the front matter (01:11:39).',
  'Leandra Preston: send her Scholars Strategy Network brief to those who offered feedback (01:18:58).',
];

/** Who spoke, in order of first contribution. */
export const LISTENING_1123_SPEAKERS: readonly string[] = [
  'Daveed Benjamin (host)',
  'Leandra Preston',
  'Phahsa',
  'two participants not identified (00:13:01, 00:15:27)',
  'Rick Botelho',
  'Salwa El Mais',
  'Laura Del Campo',
  'Michelle Thuo',
  'Joel Okomoli',
  'Saramiris',
  'Renad Baomar',
];

/** Titles of the draft ballot questions (the "Decisions coming up" list). */
export const LISTENING_1123_DECISIONS: readonly string[] = [
  'What quorum should apply during the pilot?',
  'Should an option need a second before it goes into the draft ballot?',
  'Should draft ballot options be written in plain English first?',
  'Should each session open with an optional 30-second check-in?',
  'Should each session focus on one major inquiry?',
  'Should Deepi raise its hand when it has something to add?',
  'Should the Desirable Properties use opt-in text reminders?',
  'Should session transcripts be published on the session page and kept?',
  'After the front matter, how should the book club choose what to read?',
];

/** Questions raised and not resolved, with who raised them. */
export const LISTENING_1123_OPEN_QUESTIONS: readonly string[] = [
  'Who counts as the “active voting body”, and how is activity measured? Raised by Daveed Benjamin (00:37:04). The quorum question depends on it.',
  'How will one person, one vote be enforced, who may vote, and how is eligibility checked? Raised by Daveed Benjamin (00:47:17). Account linking is not in place yet.',
  'How are access barriers (devices, connectivity, verification) handled, for the meetings and for the metaweb’s own gates? Raised by Michelle Thuo (00:25:58) and listed by Daveed Benjamin (00:47:17).',
  'Does gating deserve its own desirable property, and did the book get gates right? Raised by Daveed Benjamin in the opening statement (00:10:18). Responses were general; no one proposed a change.',
  'Should the book have an extra section, official or not, with chapters on cross-cutting topics such as gates, bridges or smart tags? Raised by Daveed Benjamin (00:29:59). No one answered.',
  'What should the desirable properties say about children: what do parents need in order to trust a gated platform? Raised by Rick Botelho (00:27:39). The host was not sure what the book already says about young people (00:28:35).',
  'What exactly is the daily review sprint proposal? Raised by Mike McGuire by email; Daveed Benjamin asked for his explanation (00:49:30).',
  'What does “one major inquiry per session” mean in practice? Daveed Benjamin said it needs clarification from Markabadi (00:55:58).',
  'What is the roadmap for the council’s wider scope, the Meta-Layer Initiative and the Metaweb Academy? Raised by Phahsa (00:42:12); the host answered in part (00:42:29).',
  'How are ties, conflicting outcomes, implementation owners and reopening a decision handled? Listed by Daveed Benjamin (00:48:24); not discussed.',
  'After the first weeks, what cadence should the book club keep? Raised by Joel Okomoli (01:14:01); on next week’s agenda.',
];
