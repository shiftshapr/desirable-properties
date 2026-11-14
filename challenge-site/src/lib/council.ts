/**
 * Desirable Properties Council: types and helpers shared by the /council pages and the
 * /api/council routes. The data comes from Gov Hub's council election API
 * (/api/councils/dp/…, spec: handoff/specs/council-elections.md).
 *
 * The DP Council is a separate body from the Version 1.1 steering committee.
 */

export const COUNCIL_SLUG = 'dp';

export type CouncilPhase =
  | 'draft'
  | 'announced'
  | 'nominations'
  | 'review'
  | 'voting'
  | 'counted'
  | 'published'
  | 'cancelled';

export type CouncilMember = {
  name: string;
  avatar_url?: string | null;
  elected_in?: string | null;
  term_ends_at?: string | null;
};

export type ElectionSummary = {
  public_id: string;
  title: string;
  phase: CouncilPhase;
  seats: number;
  nominations_open_at: string | null;
  nominations_close_at: string | null;
  voting_open_at: string | null;
  voting_close_at: string | null;
  results_published_at: string | null;
};

export type CouncilDetail = {
  slug: string;
  name: string;
  status: string;
  purpose_md: string | null;
  responsibilities: string[];
  default_seats: number;
  term_months: number | null;
  site_url: string | null;
  current_members: CouncilMember[];
  elections: ElectionSummary[];
};

export type CouncilCandidate = {
  id: string;
  name: string;
  statement_md: string | null;
  source: 'self' | 'nominated';
  nominator_count: number;
  avatar_url?: string | null;
};

export type ResultRow = {
  candidate_id: string;
  name: string;
  approvals: number;
  rank: number;
  elected: boolean;
  tied?: boolean;
};

export type ElectionResults = {
  counting: string;
  seats: number;
  ballots_cast: number;
  eligible_count: number;
  turnout: number | null;
  counted_at: string | null;
  tie?: unknown;
  tie_resolution?: { winners?: string[]; reason?: string; at?: string } | null;
  candidates: ResultRow[];
};

export type ElectionDetail = {
  public_id: string;
  council: { slug: string; name: string; site_url: string | null };
  title: string;
  phase: CouncilPhase;
  announced_at: string | null;
  nominations_open_at: string | null;
  nominations_close_at: string | null;
  voting_open_at: string | null;
  voting_close_at: string | null;
  results_published_at: string | null;
  seats: number;
  counting: string;
  eligibility_summary: string | null;
  announcement_md: string | null;
  candidates: CouncilCandidate[];
  candidate_count: number;
  ballots_cast: number | null;
  results: ElectionResults | null;
};

export type MyCandidacy = {
  id: string;
  status: 'pending_consent' | 'standing' | 'withdrawn' | 'declined' | 'rejected';
  source: 'self' | 'nominated';
  statement_md: string | null;
  needs_response: boolean;
  rejected_reason: string | null;
};

export type ElectionMe = {
  eligible: boolean;
  can_stand?: boolean;
  can_nominate: boolean;
  can_apply: boolean;
  can_vote: boolean;
  my_candidacy: MyCandidacy | null;
  has_voted: boolean;
  my_choices: string[] | null;
  my_ballot_cast_at?: string | null;
  phase: CouncilPhase;
};

/** The four public steps of an election, in order. */
export const ELECTION_STEPS = [
  { key: 'announced', label: 'Announced' },
  { key: 'nominations', label: 'Nominations' },
  { key: 'voting', label: 'Voting' },
  { key: 'results', label: 'Results' },
] as const;

export type ElectionStepKey = (typeof ELECTION_STEPS)[number]['key'];

/** Which step a phase belongs to (review sits between nominations and voting; counted waits on results). */
export function stepIndexOf(phase: CouncilPhase): number {
  switch (phase) {
    case 'announced':
      return 0;
    case 'nominations':
    case 'review':
      return 1;
    case 'voting':
      return 2;
    case 'counted':
    case 'published':
      return 3;
    default:
      return -1;
  }
}

export const PHASE_LABELS: Record<CouncilPhase, string> = {
  draft: 'Not yet announced',
  announced: 'Announced',
  nominations: 'Nominations open',
  review: 'Nominations closed, voting opens soon',
  voting: 'Voting open',
  counted: 'Voting closed, results coming',
  published: 'Results published',
  cancelled: 'Cancelled',
};

/** The next phase boundary to count down to, or null. */
export function nextBoundary(e: Pick<
  ElectionDetail,
  'phase' | 'nominations_open_at' | 'nominations_close_at' | 'voting_open_at' | 'voting_close_at'
>): { at: string; label: string } | null {
  switch (e.phase) {
    case 'announced':
      return e.nominations_open_at ? { at: e.nominations_open_at, label: 'Nominations open in' } : null;
    case 'nominations':
      return e.nominations_close_at ? { at: e.nominations_close_at, label: 'Nominations close in' } : null;
    case 'review':
      return e.voting_open_at ? { at: e.voting_open_at, label: 'Voting opens in' } : null;
    case 'voting':
      return e.voting_close_at ? { at: e.voting_close_at, label: 'Voting closes in' } : null;
    default:
      return null;
  }
}

export function isLive(phase: CouncilPhase): boolean {
  return ['announced', 'nominations', 'review', 'voting', 'counted'].includes(phase);
}

/** Plain-language messages for Gov Hub's council error codes. */
const ERROR_MESSAGES: Record<string, string> = {
  authentication_required: 'Please sign in to continue.',
  AUTHENTICATION_REQUIRED: 'Please sign in to continue.',
  sign_in_again: 'Your sign-in has expired. Please sign in again.',
  account_required: 'You need a Gov Hub account to take part. Sign in once on Gov Hub, then try again.',
  agent_forbidden: 'Agents cannot act in council elections.',
  not_eligible: 'You are not eligible to take part in this election.',
  already_candidate: 'You are already standing in this election.',
  candidacy_rejected: 'Your candidacy in this election was not accepted by the election admins.',
  not_nominations: 'Nominations are not open right now.',
  nominations_closed: 'Nominations can no longer be answered: voting has started or the election has closed.',
  not_voting: 'Voting is not open right now.',
  voting_closed: 'Voting has closed, so candidacies can no longer change.',
  election_closed: 'This election has closed.',
  use_apply: 'To stand yourself, use “Stand for the council” with a statement.',
  nominee_required: 'Enter the email address of the person you want to nominate.',
  statement_md_required: 'Please write a short statement.',
  statement_md_too_long: 'Your statement is too long (3,000 characters at most).',
  note_too_long: 'Your note is too long (1,000 characters at most).',
  already_responded: 'This nomination has already been answered.',
  accept_required: 'Choose accept or decline.',
  forbidden: 'Only the person concerned can do that.',
  not_active: 'This candidacy is no longer active.',
  choices_required: 'Tick at least one candidate.',
  duplicate_choice: 'Each candidate can be approved once.',
  invalid_choice: 'One of your choices is no longer standing. Reload the page and try again.',
  ballot_conflict: 'Another ballot was recorded at the same moment. Please try again.',
  no_ballot: 'You have no ballot in this election.',
  tie_unresolved: 'There is a tie for the last seat. The results will be published once the election admins settle it.',
  not_counted: 'The votes have not been counted yet.',
  election_not_found: 'This election could not be found.',
  council_not_found: 'This council could not be found.',
  candidate_not_found: 'This candidate could not be found.',
  UPSTREAM_TIMEOUT: 'Gov Hub took too long to answer. Please try again.',
  UPSTREAM_UNAVAILABLE: 'Gov Hub could not be reached. Please try again in a moment.',
};

export function friendlyCouncilError(code: unknown, fallback?: unknown): string {
  const key = typeof code === 'string' ? code : '';
  if (key && ERROR_MESSAGES[key]) return ERROR_MESSAGES[key];
  const text = typeof fallback === 'string' && fallback.trim() ? fallback.trim() : '';
  return text || 'Something went wrong. Please try again.';
}

export function isSignInError(status: number, code: unknown): boolean {
  return (
    status === 401 ||
    code === 'sign_in_again' ||
    code === 'authentication_required' ||
    code === 'AUTHENTICATION_REQUIRED'
  );
}

/** A safe election id for URLs (Gov Hub public ids are short hex). */
export function cleanElectionId(raw: string | null | undefined): string | null {
  const id = String(raw || '').trim();
  return /^[A-Za-z0-9_-]{4,64}$/.test(id) ? id : null;
}

export function cleanCandidateId(raw: string | null | undefined): string | null {
  const id = String(raw || '').trim();
  return /^[A-Za-z0-9_-]{4,64}$/.test(id) ? id : null;
}

export function councilApiPaths(electionId?: string) {
  const base = `/api/councils/${COUNCIL_SLUG}`;
  const e = electionId ? `${base}/elections/${encodeURIComponent(electionId)}` : '';
  return {
    council: () => `${base}/`,
    election: () => `${e}/`,
    me: () => `${e}/me`,
    apply: () => `${e}/apply`,
    nominate: () => `${e}/nominate`,
    ballot: () => `${e}/ballot`,
    respond: (cid: string) => `${e}/candidates/${encodeURIComponent(cid)}/respond`,
    withdraw: (cid: string) => `${e}/candidates/${encodeURIComponent(cid)}/withdraw`,
  };
}
