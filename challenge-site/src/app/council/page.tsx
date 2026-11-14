import type { Metadata } from 'next';
import Link from 'next/link';
import CouncilMarkdown from '@/components/council/CouncilMarkdown';
import ElectionStepper from '@/components/council/ElectionStepper';
import KeyDates from '@/components/council/KeyDates';
import LocalTime from '@/components/council/LocalTime';
import { readSession } from '@/lib/auth-session';
import { PHASE_LABELS, isLive, type CouncilDetail, type ElectionSummary } from '@/lib/council';
import { fetchCouncil } from '@/lib/council.server';
import { pageOpenGraph } from '@/lib/site-metadata';

const DESCRIPTION =
  'The Desirable Properties Council stewards the living book and the Desirable Properties over time. Its members are elected in open elections.';

export const metadata: Metadata = {
  title: 'The Desirable Properties Council – Desirable Properties',
  description: DESCRIPTION,
  openGraph: pageOpenGraph({ title: 'The Desirable Properties Council', description: DESCRIPTION, path: '/council' }),
};

export const dynamic = 'force-dynamic';

const FALLBACK_PURPOSE =
  'The Desirable Properties Council is responsible for stewarding the living book and the Desirable Properties over time.';

function currentElection(elections: ElectionSummary[]): ElectionSummary | null {
  const visible = elections.filter((e) => e.phase !== 'cancelled' && e.phase !== 'draft');
  return visible.find((e) => isLive(e.phase)) ?? null;
}

function FirstElectionPending() {
  return (
    <section className="rounded-xl border border-violet-900/50 bg-violet-950/20 p-6 sm:p-8">
      <p className="text-xs font-medium uppercase tracking-[0.15em] text-violet-300">Elections</p>
      <h2 className="mt-2 text-2xl font-semibold text-white">The first election will be announced here</h2>
      <p className="mt-3 max-w-2xl text-slate-300">
        When it is announced, this page will show the dates, how to stand or nominate someone, and how to vote.
        Anyone eligible can stand, nominate and vote with their Desirable Properties account.
      </p>
      <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Announced', 'The election, its seats and its dates are published here.'],
          ['Nominations', 'Stand yourself with a short statement, or nominate someone else.'],
          ['Voting', 'Approve as many candidates as you like. Your ballot is secret.'],
          ['Results', 'The count is published, with turnout and who was elected.'],
        ].map(([title, text], i) => (
          <li key={title} className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="text-sm font-semibold text-white">
              <span className="text-violet-300">{i + 1}.</span> {title}
            </p>
            <p className="mt-1 text-sm text-slate-400">{text}</p>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-sm text-slate-300">Until then, the best way to take part is to help shape the next version:</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Link
          href="/improve"
          className="inline-flex items-center rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600"
        >
          Help shape Version 1.1 →
        </Link>
        <Link
          href="/participate"
          className="inline-flex items-center rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 hover:border-slate-500"
        >
          More ways to contribute
        </Link>
      </div>
    </section>
  );
}

function NoElectionOpen() {
  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <h2 className="text-xl font-semibold text-white">No election is open right now</h2>
      <p className="mt-2 text-slate-300">The next election will be announced here.</p>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link href="/improve" className="text-cyan-300 hover:text-cyan-200">
          Help shape Version 1.1 →
        </Link>
        <Link href="/participate" className="text-cyan-300 hover:text-cyan-200">
          More ways to contribute →
        </Link>
      </div>
    </section>
  );
}

function CurrentElectionCard({ election }: { election: ElectionSummary }) {
  return (
    <section className="rounded-xl border border-cyan-900/60 bg-slate-900/40 p-6 sm:p-8">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-xs font-medium uppercase tracking-[0.15em] text-cyan-300">Current election</p>
        <span className="rounded-full border border-cyan-800 bg-cyan-950/40 px-3 py-0.5 text-xs font-medium text-cyan-200">
          {PHASE_LABELS[election.phase]}
        </span>
      </div>
      <h2 className="mt-2 text-2xl font-semibold text-white">{election.title}</h2>
      <p className="mt-1 text-sm text-slate-400">
        {election.seats} {election.seats === 1 ? 'seat' : 'seats'}
      </p>
      <div className="mt-6">
        <ElectionStepper phase={election.phase} />
      </div>
      <div className="mt-6">
        <KeyDates election={election} />
      </div>
      <Link
        href={`/council/${encodeURIComponent(election.public_id)}`}
        className="mt-6 inline-flex items-center rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600"
      >
        {election.phase === 'nominations'
          ? 'Stand, nominate or see the candidates →'
          : election.phase === 'voting'
            ? 'See the candidates and vote →'
            : 'Open the election →'}
      </Link>
    </section>
  );
}

export default async function CouncilPage() {
  const session = await readSession();
  const res = await fetchCouncil(session?.idToken);
  const council: CouncilDetail | null = res.ok ? res.data : null;
  const elections = council?.elections ?? [];
  const current = currentElection(elections);
  const past = elections.filter((e) => e !== current && (e.phase === 'published' || e.phase === 'cancelled'));
  const members = council?.current_members ?? [];

  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="border-b border-slate-800 pb-8">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-violet-300">Desirable Properties</p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">{council?.name || 'Desirable Properties Council'}</h1>
        <CouncilMarkdown text={council?.purpose_md || FALLBACK_PURPOSE} className="mt-4 max-w-3xl text-base sm:text-lg" />
        {council?.responsibilities?.length ? (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/40 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">What the council does</h2>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-slate-200">
              {council.responsibilities.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {council.term_months ? (
              <p className="mt-4 text-sm text-slate-400">
                Members are elected for {council.term_months} months
                {council.default_seats ? `; the council usually has ${council.default_seats} seats` : ''}.
              </p>
            ) : null}
          </div>
        ) : null}
        <p className="mt-5 max-w-3xl text-sm text-slate-400">
          The council is separate from the{' '}
          <Link href="/steering" className="text-cyan-300 hover:text-cyan-200">
            steering committee
          </Link>
          , which moves proposals through each release and signs off each version.
        </p>
      </header>

      {!council ? (
        <p className="mt-8 rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 text-sm text-amber-100">
          The council details could not be loaded from Gov Hub just now. Please try again in a moment.
        </p>
      ) : null}

      <section className="mt-10">
        <h2 className="text-xl font-semibold text-white">Members</h2>
        {members.length ? (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => (
              <li key={`${m.name}-${m.elected_in}`} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                {m.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-300">
                    {m.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium text-white">{m.name}</p>
                  {m.term_ends_at ? (
                    <p className="text-xs text-slate-400">
                      Term ends {new Date(m.term_ends_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-slate-400">The council has no members yet. Its first members will be elected here.</p>
        )}
      </section>

      <div className="mt-10">
        {current ? (
          <CurrentElectionCard election={current} />
        ) : !council ? null : past.some((e) => e.phase === 'published') ? (
          <NoElectionOpen />
        ) : (
          <FirstElectionPending />
        )}
      </div>

      {past.length ? (
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-white">Past elections</h2>
          <ul className="mt-4 space-y-3">
            {past.map((e) => (
              <li key={e.public_id}>
                <Link
                  href={`/council/${encodeURIComponent(e.public_id)}`}
                  className="flex flex-col gap-1 rounded-xl border border-slate-800 bg-slate-900/40 p-4 hover:border-cyan-700 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-medium text-white">{e.title}</span>
                  <span className="text-sm text-slate-400">
                    {e.phase === 'cancelled' ? (
                      'Cancelled'
                    ) : e.results_published_at ? (
                      <>
                        Results published <LocalTime iso={e.results_published_at} inline />
                      </>
                    ) : (
                      PHASE_LABELS[e.phase]
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
