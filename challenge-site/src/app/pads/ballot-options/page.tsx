import type { Metadata } from 'next';
import Link from 'next/link';
import OptionProvenanceLine from '@/components/sessions/OptionProvenanceLine';
import { SESSION_SCREENINGS } from '@/data/sessions/2026-11-23-screening';
import { readPublicParticipation } from '@/lib/ballots/participation.server';
import { participationLine } from '@/lib/ballots/participation-core';
import { readScreeningView } from '@/lib/screening/screening-store.server';
import { readAllProposals } from '@/lib/next-proposals/store.server';
import { sessionDayLabel } from '@/components/sessions/ProposeForNextSession';
import { pacificAndUtc } from '@/lib/sessions/session-phases';
import { allProvenance } from '@/lib/sessions/option-provenance';
import {
  namesOn,
  PROVENANCE_STATUS_LABEL,
  withScreening,
  type OptionProvenance,
  type ProvenanceStatus,
} from '@/lib/sessions/option-provenance-core';
import { pageOpenGraph } from '@/lib/site-metadata';
import { BALLOT_OPTIONS_HREF, PADS_INDEX_HREF } from '@/lib/siteNav';

// Per request: council screening outcomes and voter participation are read live.
export const dynamic = 'force-dynamic';

const DESCRIPTION =
  'Every option on every listening-session ballot: who proposed it, who seconded or supported it, and whether it was approved. Plus who has been voting.';

export const metadata: Metadata = {
  title: 'Ballot options: who proposed what | Desirable Properties',
  description: DESCRIPTION,
  openGraph: pageOpenGraph({ title: 'Ballot options: who proposed what', description: DESCRIPTION, path: BALLOT_OPTIONS_HREF }),
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const linkClass = 'text-cyan-300 hover:text-cyan-200';

async function screenedRecords(): Promise<OptionProvenance[]> {
  const views = new Map(
    await Promise.all(
      Object.keys(SESSION_SCREENINGS).map(async (slug) => [slug, await readScreeningView(slug).catch(() => null)] as const),
    ),
  );
  return allProvenance().map((rec) => {
    const view = views.get(rec.session);
    return view ? withScreening(rec, view.questions.find((q) => q.key === rec.question)?.outcome) : rec;
  });
}

export default async function BallotOptionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = one(params.status) as ProvenanceStatus | '';
  const person = one(params.person).trim().slice(0, 80);
  const [records, voters, siteProposals] = await Promise.all([screenedRecords(), readPublicParticipation(), readAllProposals().catch(() => [])]);

  const statuses = (Object.keys(PROVENANCE_STATUS_LABEL) as ProvenanceStatus[]).filter((s) => records.some((r) => r.status === s));
  const needle = person.toLowerCase();
  const shown = records.filter(
    (r) =>
      (!status || r.status === status) && (!needle || namesOn(r).some((n) => n.toLowerCase().includes(needle))),
  );
  const sessions = [...new Map(shown.map((r) => [r.session, r])).values()];
  const total = records.filter((r) => r.origin !== 'standard');

  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="pb-6">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-sky-300">
          <Link href={PADS_INDEX_HREF} className="hover:text-sky-200">Pads</Link>
        </p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Ballot options: who proposed what</h1>
        <p className="mt-4 max-w-3xl text-base text-slate-300">
          Every option on every listening-session ballot, with who proposed it, who seconded or supported it, and what
          became of it. Times link to the moment in the session transcript. {total.length} proposed options and
          decisions; {total.filter((r) => r.proposer).length} with a named proposer.
        </p>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          “Seconded” means someone said they seconded it. “Supported” means someone spoke for it without the word
          (or +1 in the chat). Where the record does not show who proposed an option, it says so. Corrections: post
          in the session chat on the session page.
        </p>
        <nav aria-label="On this page" className="mt-4 flex flex-wrap gap-2 text-sm">
          <a href="#options" className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:border-cyan-500">Options</a>
          <a href="#site-proposals" className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:border-cyan-500">Proposed on the site</a>
          <a href="#voters" className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:border-cyan-500">Voters</a>
        </nav>
      </header>

      <section id="options" aria-labelledby="options-heading" className="scroll-mt-24">
        <h2 id="options-heading" className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          Options
          <span className="ml-2 text-base font-normal text-slate-400">{shown.length}</span>
        </h2>
        <form method="get" action={BALLOT_OPTIONS_HREF} className="mt-4 flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1 text-slate-300">
            Status
            <select name="status" defaultValue={status} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-100">
              <option value="">All</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {PROVENANCE_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-slate-300">
            Person
            <input
              type="search"
              name="person"
              defaultValue={person}
              placeholder="Name"
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-slate-100"
            />
          </label>
          <button type="submit" className="rounded-lg bg-cyan-500 px-4 py-1.5 font-semibold text-slate-950 hover:bg-cyan-400">
            Filter
          </button>
          {status || person ? (
            <Link href={BALLOT_OPTIONS_HREF} className={linkClass}>
              Clear
            </Link>
          ) : null}
        </form>

        <div className="mt-6 space-y-10">
          {sessions.map((s) => {
            const recs = shown.filter((r) => r.session === s.session);
            const questions = [...new Map(recs.map((r) => [r.question, r])).values()];
            return (
              <div key={s.session}>
                <h3 className="text-xl font-semibold text-white">
                  <Link href={s.sessionHref} className="hover:text-cyan-200">
                    {s.sessionLabel}
                  </Link>
                </h3>
                <ol className="mt-3 space-y-3">
                  {questions.map((q) => (
                    <li key={q.question} className="rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3">
                      <p className="font-semibold text-white">
                        {q.questionN ? `${q.questionN}. ` : ''}
                        {q.questionText}
                      </p>
                      <ul className="mt-2 space-y-2">
                        {recs
                          .filter((r) => r.question === q.question)
                          .map((r) => (
                            <li key={r.id} className="text-sm text-slate-200">
                              {r.optionLabel}
                              <OptionProvenanceLine rec={r} className="mt-0.5" />
                              {r.notes ? <span className="mt-0.5 block text-xs text-slate-500">{r.notes}</span> : null}
                            </li>
                          ))}
                      </ul>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
          {!shown.length ? <p className="text-slate-300">No options match.</p> : null}
        </div>
      </section>

      <section id="site-proposals" aria-labelledby="site-proposals-heading" className="mt-14 scroll-mt-24">
        <h2 id="site-proposals-heading" className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          Proposed on the site for a session
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-400">
          Proposals people added from a session page for the next session&apos;s agenda, with who supported them. When one
          becomes a draft ballot option, it joins the list above with the same proposer and supporters.
        </p>
        {siteProposals.length ? (
          siteProposals.map(({ session, proposals }) => (
            <div key={session.date} className="mt-5">
              <h3 className="text-lg font-semibold text-white">
                <Link href={`${session.href}#proposals`} className="hover:text-cyan-200">{sessionDayLabel(session.date)} session</Link>
              </h3>
              <ul className="mt-2 space-y-2">
                {proposals.map((p) => (
                  <li key={p.id} className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-sm text-slate-200">
                    {p.status === 'hidden' ? (
                      <span className="text-slate-400">Hidden by {p.hidden?.by}: {p.hidden?.reason}</span>
                    ) : (
                      <>
                        <strong className="text-white">{p.title}</strong>
                        <span className="text-slate-400">
                          {' '}· Proposed by {p.name} ({pacificAndUtc(p.createdAt)})
                          {p.supporters.length ? ` · Supported by ${p.supporters.map((x) => x.name).join(', ')}` : ''}
                          {p.status === 'withdrawn' ? ' · Withdrawn' : ''}
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="mt-3 text-slate-300">None yet.</p>
        )}
      </section>

      <section id="voters" aria-labelledby="voters-heading" className="mt-14 scroll-mt-24">
        <h2 id="voters-heading" className="border-b border-slate-800 pb-2 text-2xl font-bold text-white">
          Voters
          <span className="ml-2 text-base font-normal text-slate-400">{voters.voters}</span>
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-slate-400">
          Who has been voting on the weekly session ballots: participation only, never how anyone voted. The weekly
          streak counts the session ballots in a row that someone voted on, up to the most recent closed one; a week
          without a ballot does not break it. Hide your name on your{' '}
          <Link href="/account#participation" className={linkClass}>account page</Link>.
          {voters.stale ? ' (The vote store is not answering right now; this is the last list we had.)' : null}
        </p>
        {voters.listed.length ? (
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {voters.listed.map((v) => (
              <li key={v.name} className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
                <span className="block text-sm font-medium text-slate-100">{v.name}</span>
                <span className="block text-xs text-slate-400">{participationLine(v)}</span>
              </li>
            ))}
          </ol>
        ) : null}
        {voters.others ? (
          <p className="mt-3 text-sm text-slate-300">
            {voters.listed.length ? 'And' : ''} {voters.others} {voters.others === 1 ? 'other voter' : 'other voters'}.
          </p>
        ) : null}
        {!voters.voters ? <p className="mt-4 text-slate-300">No votes yet.</p> : null}
      </section>
    </main>
  );
}
