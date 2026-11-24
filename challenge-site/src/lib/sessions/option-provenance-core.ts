/**
 * Ballot option provenance: who proposed each option on a listening-session ballot, who seconded or supported it,
 * and what became of it. The records live in src/data/sessions/option-provenance.ts (the source of truth); this
 * module holds the types and the pure helpers the pages and tests share.
 */

/** Where a claim comes from: a time in a session transcript, or a named source file (pad, chat log, agenda, draft). */
export type ProvenanceEvidence =
  | {
      kind: 'transcript';
      /** Session whose transcript holds the turn. */
      session: 'meta-governance-2026-11-16' | 'listening-2026-11-23';
      /** Start time of the speaker turn, hh:mm:ss on the recording. */
      at: string;
      quote?: string;
    }
  | {
      kind: 'source';
      /** What the source is, for people: "20 Nov walk-through with Markabadi". */
      label: string;
      /** The file that holds it, relative to challenge-site/ (or ~/ for records kept outside the repo). */
      file: string;
      /** Time inside that source when it has one (a walk-through recording, a chat log). */
      at?: string;
      quote?: string;
      /** Public page for the source, when there is one. */
      href?: string;
    };

export type ProvenancePerson = {
  name: string;
  /** 'second': said they seconded it. 'support': spoke for it without the word "second" (or +1 in the chat). */
  kind: 'second' | 'support';
  evidence: ProvenanceEvidence;
};

export type ProvenanceStatus =
  | 'proposed'
  | 'seconded'
  | 'on_draft_ballot'
  | 'screened_out'
  | 'on_ballot'
  | 'approved'
  | 'not_approved'
  | 'tie'
  | 'decided_in_meeting'
  | 'on_agenda';

export const PROVENANCE_STATUS_LABEL: Record<ProvenanceStatus, string> = {
  proposed: 'Proposed',
  seconded: 'Seconded',
  on_draft_ballot: 'On the draft ballot',
  screened_out: 'Screened out',
  on_ballot: 'On the ballot',
  approved: 'Approved',
  not_approved: 'Not approved',
  tie: 'Tie',
  decided_in_meeting: 'Decided in the meeting',
  on_agenda: 'On the agenda',
};

export type ProvenanceOutcome = {
  /** Votes for this option. */
  votes: number;
  /** Ballots cast on the question (abstentions included). */
  ballots: number;
  /** Abstentions on the question. */
  abstain: number;
  /** The question's result, as published. */
  result: 'passed' | 'failed' | 'winner' | 'tie' | 'none';
};

export type OptionProvenance = {
  /** `${session}/${question}/${option}`. */
  id: string;
  session: string;
  sessionLabel: string;
  sessionHref: string;
  /** Ballot question key (q1…); 'decided' for decisions taken in the room; 'agenda' for agenda proposals; 'raised' for ideas not on a ballot. */
  question: string;
  questionN: number | null;
  questionText: string;
  /** Option key: the ballot key (yes, no, a, b…), or a slug for decisions and agenda items. */
  option: string;
  optionLabel: string;
  /**
   * 'participant' or 'host': raised by a named person. 'drafted': written into the draft as an alternative, nobody
   * said it. 'standard': the "No" of a Yes/No question.
   */
  origin: 'participant' | 'host' | 'drafted' | 'standard';
  proposer: string | null;
  proposerEvidence: ProvenanceEvidence | null;
  /** When the proposer was not in the room: who put it forward there. */
  presentedBy?: { name: string; evidence: ProvenanceEvidence };
  /** Others who shaped the option (for example the advance notice email on the 24-hour window). */
  contributors?: { name: string; what: string; evidence: ProvenanceEvidence }[];
  seconders: ProvenancePerson[];
  status: ProvenanceStatus;
  outcome: ProvenanceOutcome | null;
  notes?: string;
};

export const provenanceId = (session: string, question: string, option: string) => `${session}/${question}/${option}`;

/**
 * Key of a draft ballot option, in the same scheme as the ballot definitions: Yes/No/Abstain by name, other options
 * a, b, c… by position. Returns null for Abstain.
 */
export function draftOptionKey(label: string, index: number): string | null {
  const l = label.trim().toLowerCase();
  if (l === 'abstain') return null;
  if (l === 'yes' || l === 'no') return l;
  return String.fromCharCode(97 + index);
}

/** Council screening per question, in the shape the session page already has (screening-core QuestionScreening). */
export type ScreeningOutcome = 'pending' | 'goes_to_ballot' | 'held_back';

/** A draft ballot option's status once council screening is final; other records unchanged. */
export function withScreening(rec: OptionProvenance, outcome: ScreeningOutcome | null | undefined): OptionProvenance {
  if (rec.status !== 'on_draft_ballot' || !outcome || outcome === 'pending') return rec;
  return { ...rec, status: outcome === 'held_back' ? 'screened_out' : 'on_ballot' };
}

/** "Approved · 11 of 24 votes" and the like. */
export function outcomeText(rec: Pick<OptionProvenance, 'status' | 'outcome'>): string {
  const label = PROVENANCE_STATUS_LABEL[rec.status];
  const o = rec.outcome;
  if (!o) return label;
  return `${label} · ${o.votes} of ${o.ballots} ${o.ballots === 1 ? 'vote' : 'votes'}`;
}

/** Everyone named on a record (for search and the name tests). */
export function namesOn(rec: OptionProvenance): string[] {
  return [
    rec.proposer,
    rec.presentedBy?.name,
    ...(rec.contributors ?? []).map((c) => c.name),
    ...rec.seconders.map((s) => s.name),
  ].filter((n): n is string => Boolean(n));
}

/** Seconds a time label: "01:14:45" or "14:45". */
export function seconds(at: string): number {
  return at.split(':').map(Number).reduce((acc, n) => acc * 60 + n, 0);
}

const SESSION_PAGE: Record<string, string> = {
  'meta-governance-2026-11-16': '/events/meta-governance-2026-11-16',
  'listening-2026-11-23': '/events/listening-2026-11-23',
};

/** Link to the evidence: the transcript turn on its session page, or the source's public page. */
export function evidenceHref(e: ProvenanceEvidence): string | null {
  if (e.kind === 'transcript') return `${SESSION_PAGE[e.session]}#t-${seconds(e.at)}`;
  return e.href ?? null;
}

/** Short label for the evidence: "16 Nov 00:53:35", "20 Nov walk-through 06:54". */
export function evidenceLabel(e: ProvenanceEvidence): string {
  if (e.kind === 'transcript') return `${e.session.endsWith('11-16') ? '16 Nov' : '23 Nov'} ${e.at}`;
  return e.at ? `${e.label} ${e.at}` : e.label;
}
