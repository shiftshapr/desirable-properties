/**
 * Phases of a listening-session occurrence after the meeting (owner spec, dp-listening-sessions-workspace §4, §12, §13).
 * One durable page per occurrence shows the current phase and who advanced each phase and when.
 *
 * Rule: only the opening and closing of community verification are computed from the clock (entries with
 * `scheduled: true` take effect once their time has passed). Every other phase advances only when someone adds
 * an entry to the occurrence's data file. Expiry of the verification clock does not mean approval.
 */
export const SESSION_PHASES = [
  'Preparing the draft',
  'Community verification open',
  'Community verification closed',
  'Council screening',
  'Ready for voting',
  'Voting open',
  'Decision recorded',
  'Implementation and follow-up',
] as const;

export type SessionPhase = (typeof SESSION_PHASES)[number];

export type PhaseEntry = {
  phase: SessionPhase;
  /** Who advanced the phase (a person, a role, or "Clock" for the two scheduled verification transitions). */
  by: string;
  /** ISO time the phase was (or is scheduled to be) reached. */
  at: string;
  note?: string;
  /** Only allowed for the two verification transitions: takes effect when `at` has passed. */
  scheduled?: boolean;
};

export type SessionOccurrence = {
  slug: string;
  /** Series name, e.g. "DP Meta-Governance: Creating a Living Book Together". */
  title: string;
  /** What this meeting was about, e.g. "Meeting agreements: how we decide". Shown as the page title. */
  meetingTitle: string;
  /** Calendar date of the meeting, yyyy-mm-dd (Pacific). */
  date: string;
  heldFrom: string;
  heldTo: string;
  /**
   * When the draft for review becomes visible (the verification opening time). Enforced server-side. Unset while
   * the draft is pending host approval: the draft then stays hidden until the host sets it.
   */
  draftVisibleAt?: string;
  phaseHistory: readonly PhaseEntry[];
  /**
   * Later pages about this meeting (e.g. a meeting pad from a walk-through of this page), shown as short lines near
   * the top. A link to a meeting pad shows only while that pad is public (isMeetingPadPublic).
   */
  related?: readonly { label: string; href: string }[];
};

const CLOCK_PHASES: readonly SessionPhase[] = ['Community verification open', 'Community verification closed'];

export type PhaseRow = {
  phase: SessionPhase;
  state: 'done' | 'current' | 'upcoming';
  entry?: PhaseEntry;
  /** A scheduled clock transition that has not happened yet. */
  pending?: PhaseEntry;
};

/** Phase rows for the tracker at time `now`. */
export function phaseRows(occurrence: SessionOccurrence, now: Date): { rows: PhaseRow[]; current: SessionPhase | null } {
  for (const e of occurrence.phaseHistory) {
    if (e.scheduled && !CLOCK_PHASES.includes(e.phase)) {
      throw new Error(`session ${occurrence.slug}: only verification open/closed may be scheduled (${e.phase})`);
    }
  }
  const reached = new Map<SessionPhase, PhaseEntry>();
  const pending = new Map<SessionPhase, PhaseEntry>();
  for (const e of occurrence.phaseHistory) {
    if (new Date(e.at).getTime() <= now.getTime()) reached.set(e.phase, e);
    else if (e.scheduled) pending.set(e.phase, e);
  }
  let currentIndex = -1;
  SESSION_PHASES.forEach((p, i) => {
    if (reached.has(p)) currentIndex = i;
  });
  const rows = SESSION_PHASES.map<PhaseRow>((phase, i) => ({
    phase,
    state: i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'upcoming',
    entry: reached.get(phase),
    pending: pending.get(phase),
  }));
  return { rows, current: currentIndex >= 0 ? SESSION_PHASES[currentIndex] : null };
}

/**
 * Where each phase step in the tracker links on a session page. Every session page uses these ids; a page can
 * override one (for example when it has a results section). "Voting open" always jumps to the vote.
 */
export const DEFAULT_PHASE_ANCHORS: Record<SessionPhase, string> = {
  'Preparing the draft': 'summary',
  'Community verification open': 'draft',
  'Community verification closed': 'draft',
  'Council screening': 'draft-ballot',
  'Ready for voting': 'vote',
  'Voting open': 'vote',
  'Decision recorded': 'vote',
  'Implementation and follow-up': 'draft-process-text',
};

/** Phase colour: one accent per phase family, used by the tracker, the sticky header and the call to action. */
export type PhaseTone = 'draft' | 'review' | 'screen' | 'vote' | 'decided';

export function phaseTone(phase: SessionPhase | null): PhaseTone {
  switch (phase) {
    case 'Community verification open':
    case 'Community verification closed':
      return 'review';
    case 'Council screening':
      return 'screen';
    case 'Ready for voting':
    case 'Voting open':
      return 'vote';
    case 'Decision recorded':
    case 'Implementation and follow-up':
      return 'decided';
    default:
      return 'draft';
  }
}

/** The current phase's call to action, shown open under the tracker. */
export function phaseCallToAction(
  phase: SessionPhase | null,
  opts: { closesLabel?: string } = {},
): { text: string; label: string; anchor: string } | null {
  switch (phase) {
    case 'Preparing the draft':
      return { text: 'Claude is drafting the summary and ballot from the transcript.', label: 'Read the summary', anchor: 'summary' };
    case 'Community verification open':
      return { text: 'Check the meeting draft is fair and send corrections.', label: 'Review the draft', anchor: 'draft' };
    case 'Community verification closed':
    case 'Council screening':
      return { text: 'Corrections are being reconciled into the ballot.', label: 'See the draft', anchor: 'draft' };
    case 'Ready for voting':
      return { text: 'The ballot is ready and opens soon.', label: 'See the ballot', anchor: 'vote' };
    case 'Voting open':
      return {
        text: opts.closesLabel ? `Voting is open until ${opts.closesLabel}.` : 'Voting is open.',
        label: 'Go to the vote',
        anchor: 'vote',
      };
    case 'Decision recorded':
    case 'Implementation and follow-up':
      return { text: 'The vote has closed. Results are on the ballot.', label: 'See the results', anchor: 'vote' };
    default:
      return null;
  }
}

export function isDraftVisible(occurrence: SessionOccurrence, now: Date): boolean {
  if (!occurrence.draftVisibleAt) return false;
  return now.getTime() >= new Date(occurrence.draftVisibleAt).getTime();
}

/** "Tue 17 Nov, 7:00 AM PT (15:00 UTC)". */
export function pacificAndUtc(iso: string): string {
  const d = new Date(iso);
  const pt = d.toLocaleString('en-US', {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles',
  });
  const utc = d.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  return `${pt} PT (${utc} UTC)`;
}

/**
 * Staging-only preview of a later state (`?previewDraft=1`). Never on production: requires a staging or local host
 * and a non-production DP_ENV, so a forged Host header on the production server does not unlock it.
 */
export function previewAllowed(host: string): boolean {
  const env = (process.env.DP_ENV || '').toLowerCase();
  if (env === 'prod' || env === 'production') return false;
  const h = host.toLowerCase();
  return h.startsWith('staging.') || h.startsWith('localhost') || h.startsWith('127.0.0.1');
}
