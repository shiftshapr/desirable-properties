import SessionBallotPanel from '@/components/sessions/SessionBallotPanel';
import { readSession } from '@/lib/auth-session';
import { effectiveStatus, type BallotDefinition, type HeldBackQuestion } from '@/lib/ballots/ballot-core';
import { getBallotOverride, resolveBallot } from '@/lib/ballots/ballot-store.server';
import { pacificAndUtc } from '@/lib/sessions/session-phases';
import SessionCollapsible from './SessionCollapsible';

type Props = {
  ballot: BallotDefinition;
  /** Staging or local host with a non-production DP_ENV (session-phases previewAllowed). */
  staging: boolean;
  id?: string;
  /** Meeting-specific heading (sessionSectionLabels(meeting).vote). */
  heading?: string;
  /**
   * Staging only: render as of a later time (the page's ?asOf=). Display only: the ballot is read-only, nothing is
   * registered with the vote store and no vote can be cast (the store and the API use the real clock).
   */
  previewAt?: Date | null;
};

/**
 * "Vote": the session's ballot, on the session page. Server component.
 * - Before opensAt: production renders nothing; staging shows the questions read-only as a preview.
 * - Open: any signed-in account votes and can change its votes until the close.
 * - Closed: votes are no longer accepted; results follow once published.
 * - Published: the counts per question.
 * A screened ballot (screenedBy) shows the questions held back by the council with their reasons, not votable.
 */
export default async function SessionBallot({ ballot, staging, id = 'vote', heading = 'Vote', previewAt = null }: Props) {
  const now = staging && previewAt ? previewAt : new Date();
  const override = await getBallotOverride(ballot.slug).catch(() => null);
  const status = effectiveStatus(ballot, previewAt ? null : override, now);
  if (status === 'not_open' && !staging) return null;
  const session = await readSession().catch(() => null);
  const closesAt = (!previewAt && override?.closesAt) || ballot.closesAt;
  const extended = new Date(closesAt).getTime() !== new Date(ballot.closesAt).getTime();
  const signInHref = `/login?next=${encodeURIComponent(`${ballot.pagePath}#${id}`)}`;

  // Screened ballot: which questions reached it. Unreadable screening record: nothing is votable (fail closed).
  let votable: string[] | null = null;
  let heldBack: HeldBackQuestion[] = [];
  let screeningUnavailable = false;
  if (ballot.screenedBy && status !== 'not_open') {
    const resolved = await resolveBallot(ballot, now).catch((err) => {
      console.error('[ballot] screening outcome unreadable:', ballot.slug, err instanceof Error ? err.message : err);
      return null;
    });
    if (resolved?.state === 'ready') {
      votable = resolved.votable.questions.map((q) => q.key);
      heldBack = resolved.heldBack;
    } else {
      // Shown read-only as drafted; nothing can be cast until the screening record is readable again.
      screeningUnavailable = true;
    }
  }
  const nothingToVote = Boolean(ballot.screenedBy) && !screeningUnavailable && votable !== null && votable.length === 0;
  const unavailable = (!previewAt && override?.status === 'unavailable') || screeningUnavailable;

  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-24">
      <h2 id={`${id}-heading`} className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
        {heading}
      </h2>
      {staging ? (
        <p className="mt-4 rounded-lg border border-amber-600/60 bg-amber-950/40 px-4 py-2 text-sm text-amber-100">
          Staging review copy. Votes cast on staging are tests and are never counted. Production is unchanged until
          this ballot is released there.
          {previewAt ? <> Shown as of {pacificAndUtc(now.toISOString())} (preview, read-only).</> : null}
        </p>
      ) : null}
      <p className="mt-4 text-base text-slate-300">
        {status === 'not_open'
          ? ballot.screenedBy
            ? `Opens ${pacificAndUtc(ballot.opensAt)}, when council screening closes, with the questions the council did not hold back.`
            : `Opens ${pacificAndUtc(ballot.opensAt)}.`
          : status === 'open'
            ? nothingToVote
              ? 'The interim council held back every question, so there is nothing to vote on this week.'
              : 'Voting is open.'
            : status === 'closed'
              ? 'Voting has closed. Results will be published here.'
              : 'Voting has closed. The results are below.'}{' '}
        {status === 'published' ? null : <>Closes {pacificAndUtc(closesAt)}.</>}
        {extended && status !== 'published' ? (
          <> The close moved later because the vote store was unreachable for more than an hour while voting was open.</>
        ) : null}
      </p>
      {unavailable ? (
        <p className="mt-3 rounded-lg border border-amber-600/60 bg-amber-950/40 px-4 py-2 text-sm text-amber-100">
          Voting is paused: we can&apos;t reach the vote store right now. Votes can&apos;t be recorded until it is back;
          please try again shortly.
        </p>
      ) : null}
      {/* The same every time: closed by default, only the title shows. */}
      <SessionCollapsible id={`${id}-rules`} title="Rules for this ballot" level={3} className="mt-4">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
          {ballot.rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </SessionCollapsible>
      <SessionBallotPanel
        ballot={ballot}
        status={status}
        signedIn={Boolean(session)}
        signInHref={signInHref}
        votable={votable}
        heldBack={heldBack}
        readOnly={Boolean(previewAt) || screeningUnavailable || nothingToVote}
      />
    </section>
  );
}
