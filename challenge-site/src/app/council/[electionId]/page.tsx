import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import CouncilMarkdown from '@/components/council/CouncilMarkdown';
import ElectionActions from '@/components/council/ElectionActions';
import ElectionStepper from '@/components/council/ElectionStepper';
import KeyDates from '@/components/council/KeyDates';
import LocalTime from '@/components/council/LocalTime';
import PhaseCountdown from '@/components/council/PhaseCountdown';
import { readSession } from '@/lib/auth-session';
import { PHASE_LABELS, cleanElectionId, nextBoundary, type ElectionDetail, type ElectionResults } from '@/lib/council';
import { fetchElection } from '@/lib/council.server';
import { pageOpenGraph } from '@/lib/site-metadata';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ electionId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = cleanElectionId((await params).electionId);
  const res = id ? await fetchElection(id) : null;
  const title = res?.ok ? res.data.title : 'Council election';
  const description = 'An election for the Desirable Properties Council, which stewards the living book and the Desirable Properties over time.';
  return {
    title: `${title} – Desirable Properties Council`,
    description,
    openGraph: pageOpenGraph({ title, description, path: `/council/${id ?? ''}` }),
  };
}

function percent(n: number | null | undefined) {
  if (n === null || n === undefined || Number.isNaN(n)) return '–';
  return `${Math.round(n * 1000) / 10}%`;
}

function Results({ results }: { results: ElectionResults }) {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-5 sm:p-6">
      <h2 className="text-xl font-semibold text-white">Results</h2>
      <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
        {[
          ['Ballots cast', results.ballots_cast.toLocaleString()],
          ['Eligible voters', results.eligible_count.toLocaleString()],
          ['Turnout', percent(results.turnout)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
            <dd className="text-xl font-bold text-white sm:text-2xl">{value}</dd>
            <dt className="mt-1 text-xs text-slate-400">{label}</dt>
          </div>
        ))}
      </dl>
      <ol className="mt-5 space-y-2">
        {results.candidates.map((row) => (
          <li
            key={row.candidate_id}
            className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
              row.elected ? 'border-emerald-800/70 bg-emerald-950/20' : 'border-slate-800 bg-slate-950/40'
            }`}
          >
            <span className="flex min-w-0 items-start gap-3">
              <span className="w-6 shrink-0 text-right text-sm tabular-nums text-slate-500">{row.rank}.</span>
              <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                <span className="break-words text-slate-100">{row.name}</span>
                {row.elected ? (
                  <span className="shrink-0 rounded-full bg-emerald-900/60 px-2 py-0.5 text-xs font-medium text-emerald-200">
                    Elected
                  </span>
                ) : null}
              </span>
            </span>
            <span className="shrink-0 text-sm tabular-nums text-slate-300">
              {row.approvals.toLocaleString()} {row.approvals === 1 ? 'approval' : 'approvals'}
            </span>
          </li>
        ))}
      </ol>
      {results.tie_resolution?.reason ? (
        <p className="mt-4 rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-sm text-slate-300">
          <strong className="text-white">Tie for the last seat.</strong> The election admins decided it: {results.tie_resolution.reason}
        </p>
      ) : null}
    </section>
  );
}

export default async function ElectionPage({ params }: Props) {
  const id = cleanElectionId((await params).electionId);
  if (!id) notFound();
  const session = await readSession();
  const res = await fetchElection(id, session?.idToken);
  if (!res.ok && res.status === 404) notFound();

  if (!res.ok) {
    return (
      <main className="mx-auto w-full min-w-0 max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <Link href="/council" className="text-sm text-cyan-300 hover:text-cyan-200">
          ← The Desirable Properties Council
        </Link>
        <p className="mt-8 rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 text-sm text-amber-100">
          This election could not be loaded from Gov Hub just now. Please try again in a moment.
        </p>
      </main>
    );
  }

  const e: ElectionDetail = res.data;
  const boundary = nextBoundary(e);
  const showCandidates = ['nominations', 'review', 'voting', 'counted', 'published'].includes(e.phase);

  return (
    <main className="mx-auto w-full min-w-0 max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/council" className="text-sm text-cyan-300 hover:text-cyan-200">
        ← {e.council?.name || 'The Desirable Properties Council'}
      </Link>

      <header className="mt-6 border-b border-slate-800 pb-8">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.15em] text-violet-300">Council election</p>
          <span
            className={`rounded-full border px-3 py-0.5 text-xs font-medium ${
              e.phase === 'cancelled'
                ? 'border-rose-900 bg-rose-950/40 text-rose-200'
                : 'border-cyan-800 bg-cyan-950/40 text-cyan-200'
            }`}
          >
            {PHASE_LABELS[e.phase]}
          </span>
        </div>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{e.title}</h1>
        <p className="mt-2 text-slate-400">
          {e.seats} {e.seats === 1 ? 'seat' : 'seats'} · approval voting
          {e.candidate_count ? ` · ${e.candidate_count} ${e.candidate_count === 1 ? 'candidate' : 'candidates'}` : ''}
        </p>

        {e.phase !== 'cancelled' ? (
          <div className="mt-6">
            <ElectionStepper phase={e.phase} />
          </div>
        ) : (
          <p className="mt-6 rounded-xl border border-rose-900/60 bg-rose-950/20 p-4 text-sm text-rose-100">
            This election was cancelled. No results will be published.
          </p>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <KeyDates election={e} />
          </div>
          {boundary ? <PhaseCountdown target={boundary.at} label={boundary.label} /> : null}
        </div>

        {e.eligibility_summary ? (
          <p className="mt-4 text-sm text-slate-400">
            <strong className="font-medium text-slate-300">Who can take part:</strong> {e.eligibility_summary}
          </p>
        ) : null}
      </header>

      <div className="mt-8 space-y-8">
        {e.announcement_md ? (
          <section>
            <h2 className="sr-only">Announcement</h2>
            <CouncilMarkdown text={e.announcement_md} />
          </section>
        ) : null}

        {e.phase === 'voting' ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-slate-200">
            <strong className="text-white">{(e.ballots_cast ?? 0).toLocaleString()}</strong>{' '}
            {e.ballots_cast === 1 ? 'ballot has' : 'ballots have'} been cast so far. Counts per candidate stay hidden
            until voting closes and the results are published.
          </p>
        ) : null}

        {e.phase === 'counted' ? (
          <p className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-slate-200">
            Voting has closed with <strong className="text-white">{(e.ballots_cast ?? 0).toLocaleString()}</strong>{' '}
            {e.ballots_cast === 1 ? 'ballot' : 'ballots'} cast. The results will be published here once the election
            admins have reviewed the count.
          </p>
        ) : null}

        {e.phase === 'published' && e.results ? <Results results={e.results} /> : null}

        <ElectionActions
          electionId={e.public_id}
          phase={e.phase}
          candidates={e.candidates}
          votingCloseAt={e.voting_close_at}
          nominationsOpenAt={e.nominations_open_at}
          nominationsCloseAt={e.nominations_close_at}
          votingOpenAt={e.voting_open_at}
          eligibilitySummary={e.eligibility_summary}
          signedIn={Boolean(session?.userId && session.idToken)}
        />

        {showCandidates ? (
          <section>
            <h2 className="text-xl font-semibold text-white">
              {e.phase === 'published' ? 'Candidates' : 'Standing candidates'}
            </h2>
            {e.phase === 'voting' ? (
              <p className="mt-1 text-sm text-slate-400">Shown in your ballot order, which is shuffled for each voter.</p>
            ) : null}
            {e.candidates.length ? (
              <ul className="mt-4 space-y-4">
                {e.candidates.map((c) => (
                  <li key={c.id} className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                    <div className="flex items-center gap-3">
                      {c.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-300">
                          {c.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-white">{c.name}</p>
                        <p className="text-xs text-slate-400">
                          {c.source === 'nominated' ? 'Nominated' : 'Self-nominated'}
                          {c.nominator_count
                            ? ` · ${c.nominator_count} ${c.nominator_count === 1 ? 'nominator' : 'nominators'}`
                            : ''}
                        </p>
                      </div>
                    </div>
                    <CouncilMarkdown text={c.statement_md} className="mt-3 text-sm" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-slate-400">
                {e.phase === 'nominations' ? 'No one is standing yet. Be the first.' : 'No candidates are standing.'}
              </p>
            )}
          </section>
        ) : null}

        {e.phase === 'announced' && e.nominations_open_at ? (
          <p className="text-sm text-slate-400">
            Candidates will be listed here once nominations open on <LocalTime iso={e.nominations_open_at} inline />.
          </p>
        ) : null}
      </div>
    </main>
  );
}
