/**
 * Meeting pads: one durable page per meeting (a call, a walk-through, a review) with a synthesis, a tracker of what
 * was raised and what became of it, follow-ups, an invite panel and a chat. Each pad is one typed data file under
 * src/data/meeting-pads/, registered in src/data/meeting-pads/index.ts, and rendered by /pads/meetings/[slug].
 *
 * Consent: a private call is published only with the participants' consent. Until then a pad names them by a
 * pseudonym, carries no transcript, video or quotes, and paraphrases what was said. Once a participant consents to
 * it, the pad may carry their name, short verbatim quotes (MeetingPadItem.quote) and a transcript (registered in
 * src/data/meeting-pads/transcripts.ts); a participant who has not consented is still never named or quoted.
 * Pure types (no runtime imports), so tests can load the data files with node --experimental-strip-types.
 */

/** Where an item stands. Built: shipped, with a link. Planned: agreed and scheduled. To decide: needs an owner call. Kept: no change wanted. */
export type MeetingPadItemStatus = 'built' | 'planned' | 'to_decide' | 'kept';

export type MeetingPadLink = { label: string; href: string };

/** A verbatim line from the call: what was said, who said it (as shown on the pad) and where, "mm:ss". */
export type MeetingPadQuote = { text: string; by: string; at: string };

/** One speaker turn of a pad's transcript; "at" is "mm:ss" into the call. */
export type MeetingPadTranscriptTurn = { at: string; speaker: string; text: string };

export type MeetingPadTranscript = { note: string; turns: MeetingPadTranscriptTurn[] };

export type MeetingPadItem = {
  /** Stable number within the pad (matches the meeting's findings list). */
  n: number;
  /** Position in the recording, "mm:ss" or "mm:ss–mm:ss". */
  at: string;
  /** What was raised, paraphrased. Never a quote from a participant who has not consented. */
  raised: string;
  /**
   * A short verbatim line from the call, only from a participant who consented to being quoted. Profanity and
   * crude examples are never quoted.
   */
  quote?: MeetingPadQuote;
  /** One short line for an agenda (e.g. "Raised between sessions" on a session page); defaults to `raised`. */
  agendaLine?: string;
  /** What we do about it: the change, or where the idea goes next. */
  response: string;
  status: MeetingPadItemStatus;
  /** ISO date the status was last set. */
  statusDate: string;
  /** What shipped (a PR, a page) or where it is tracked. */
  links?: MeetingPadLink[];
  note?: string;
};

export type MeetingPadFollowUp = {
  text: string;
  /** Who said they would look into it (a team member, never an unconsented participant). */
  owner: string;
  status: 'open' | 'in_progress' | 'done';
  note?: string;
  links?: MeetingPadLink[];
};

export type MeetingPadParticipant = {
  /** What the page shows. A real name only once consent is recorded. */
  shownAs: string;
  role: string;
  /** "consented" shows shownAs as a name; "pending" and "declined" keep a pseudonym. */
  consent: 'consented' | 'pending' | 'declined';
};

export type MeetingPad = {
  /** URL slug: /pads/meetings/<slug>. Starts with the ISO date. */
  slug: string;
  /** ISO date of the meeting. */
  date: string;
  /** e.g. "20 Nov 2026". */
  dateLabel: string;
  title: string;
  /** e.g. "Fri 20 Nov 2026, 2:02 PM PT". */
  heldLabel: string;
  durationMinutes: number;
  format: string;
  visibility: 'private' | 'public';
  /** One line on visibility and consent, shown on the pad. */
  visibilityNote: string;
  participants: MeetingPadParticipant[];
  /** What the meeting looked at. */
  reviewed: MeetingPadLink & { note?: string };
  /** A few plain sentences: what the meeting was and what came of it. */
  synthesis: string[];
  keyPoints: string[];
  /** Tracker groups, e.g. "On the page" and "For the process". */
  groups: { id: string; title: string; intro: string; items: MeetingPadItem[] }[];
  followUps: { title: string; items: MeetingPadFollowUp[] };
  nextSteps: string[];
  /** Short invite copy (InviteContent.summary): plain, no participant names unless consented. */
  inviteSummary: string;
  chatStarters: string[];
};

export const MEETING_PAD_STATUS_LABEL: Record<MeetingPadItemStatus, string> = {
  built: 'Built',
  planned: 'Planned',
  to_decide: 'To decide',
  kept: 'Kept',
};

export const FOLLOW_UP_STATUS_LABEL: Record<MeetingPadFollowUp['status'], string> = {
  open: 'Open',
  in_progress: 'In progress',
  done: 'Done',
};

/**
 * The public rule, in one place: a pad is public when its visibility is 'public' AND every participant other than the
 * host (role "host") has consented to being named. A public pad is served everywhere, production included, whatever
 * MEETING_PADS_PREVIEW says; it is indexable, listed on /pads and its invite panel works. Every other pad is a staging
 * preview (src/lib/meeting-pads/flag.ts).
 */
export function isMeetingPadPublic(pad: MeetingPad): boolean {
  if (pad.visibility !== 'public') return false;
  return pad.participants.filter((p) => p.role !== 'host').every((p) => p.consent === 'consented');
}

export function meetingPadHref(slug: string): string {
  return `/pads/meetings/${slug}`;
}

/** Status counts across all tracker groups, in label order. */
export function meetingPadCounts(pad: MeetingPad): { status: MeetingPadItemStatus; count: number }[] {
  const order: MeetingPadItemStatus[] = ['built', 'planned', 'to_decide', 'kept'];
  const all = pad.groups.flatMap((g) => g.items);
  return order.map((status) => ({ status, count: all.filter((i) => i.status === status).length })).filter((c) => c.count > 0);
}

/** The pad as Markdown for the scoped chat (Deepi): the same text the page shows, nothing more. */
export function meetingPadChatContext(pad: MeetingPad): string {
  const lines: string[] = [
    `# Meeting pad: ${pad.dateLabel} · ${pad.title}`,
    `${pad.heldLabel}, ${pad.durationMinutes} min, ${pad.format}. Reviewed: ${pad.reviewed.label} (${pad.reviewed.href}).`,
    `Participants: ${pad.participants.map((p) => `${p.shownAs} (${p.role})`).join(', ')}.`,
    `Visibility: ${pad.visibilityNote}`,
    '',
    '## Synthesis',
    ...pad.synthesis,
  ];
  for (const g of pad.groups) {
    lines.push('', `## ${g.title}`, g.intro);
    for (const i of g.items) {
      const quote = i.quote ? ` Quote (${i.quote.by}, ${i.quote.at}): "${i.quote.text}"` : '';
      lines.push(`- ${i.n}. [${MEETING_PAD_STATUS_LABEL[i.status]}] ${i.raised}${quote} Response: ${i.response}${i.note ? ` (${i.note})` : ''}`);
    }
  }
  lines.push('', `## ${pad.followUps.title}`);
  for (const f of pad.followUps.items) lines.push(`- [${FOLLOW_UP_STATUS_LABEL[f.status]}] ${f.text}${f.note ? ` (${f.note})` : ''}`);
  lines.push('', '## Next steps', ...pad.nextSteps.map((s) => `- ${s}`));
  return lines.join('\n');
}
