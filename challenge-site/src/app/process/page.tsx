import Link from 'next/link';
import type { Metadata } from 'next';
import {
  CO_EDITOR_CLAIM_RULE,
  PRACTICE_TASKS,
  PROCESS_PRINCIPLES,
  PROCESS_PROTOCOL,
  PROCESS_ROLES,
  PROPOSAL_CUTOFF_DATE,
  READINESS_ITEMS,
  V1_FREEZE_LABEL,
  shortDate,
} from '@/data/dp-process';
import { DP_ROUNDUP_EVENTS, roundupDateLabel } from '@/lib/dp-roundups';
import { bookDiscussHref, GOVHUB_DP_PATCHES_URL } from '@/lib/govhub';

export const metadata: Metadata = {
  title: 'How Version 1.0 gets made – Desirable Properties',
  description:
    'Principles, protocols, roles and practices for the DP workgroups through Version 1.0 on November 13, 2026: how a change reaches the book, who decides, and what members can do each week.',
};

export const revalidate = 300;

function Section({ id, title, lead, children }: { id: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-b border-slate-800 py-12">
      <h2 className="text-3xl font-bold text-white">{title}</h2>
      {lead ? <p className="mt-3 max-w-3xl text-lg text-slate-300">{lead}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function ProcessPage() {
  const sessions = DP_ROUNDUP_EVENTS.filter((e) => e.date >= '2026-10-05');

  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/start-here" className="text-sm text-cyan-300 hover:text-cyan-200">
        ← Start Here
      </Link>
      <header className="mt-6 pb-4">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-cyan-400">Desirable Properties · Version 1.0</p>
        <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">How Version 1.0 gets made</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-300">
          Every DP workgroup takes its chapter from the open working draft (Version 0.77) to Version 1.0 by{' '}
          <strong className="font-semibold text-white">Friday 13 November 2026</strong>. The editorial freeze is{' '}
          {V1_FREEZE_LABEL}. This page is the guide for the weeks in between: the principles that decide
          close calls, the route a change takes, who decides, what members can do each week, and the
          checklist every chapter is reviewed against.
        </p>
        <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {[
            ['#principles', 'Principles'],
            ['#protocol', 'How a change reaches the book'],
            ['#roles', 'Roles'],
            ['#practices', 'This month’s tasks'],
            ['#checklist', 'Readiness checklist'],
            ['#sessions', 'Monday sessions'],
          ].map(([href, label]) => (
            <a key={href} href={href} className="text-cyan-300 hover:text-cyan-200">
              {label}
            </a>
          ))}
          <Link href="/v1-readiness" className="font-semibold text-violet-300 hover:text-violet-200">
            Readiness board →
          </Link>
        </nav>
      </header>

      <Section id="principles" title="Principles" lead="Seven principles decide close calls. When a protocol does not cover a case, apply these.">
        <ol className="grid gap-4 sm:grid-cols-2">
          {PROCESS_PRINCIPLES.map((p, i) => (
            <li key={p.title} className="rounded-xl border border-slate-800 bg-slate-950/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">{i + 1}</p>
              <h3 className="mt-1 text-lg font-semibold text-white">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{p.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        id="protocol"
        title="How a change reaches the book"
        lead="A change reaches Version 1.0 only by one route: proposed on a passage, filed into Gov Hub, approved by both co-editors, then published in a numbered revision. A single no from either co-editor declines it."
      >
        <ol className="space-y-3">
          {PROCESS_PROTOCOL.map((step, i) => (
            <li key={step.title} className="flex gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cyan-950 text-sm font-semibold text-cyan-300">
                {i + 1}
              </span>
              <div>
                <h3 className="font-semibold text-white">
                  {step.title}
                  {step.proposed ? (
                    <span className="ml-2 rounded-full border border-amber-700/60 bg-amber-950/40 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-200">
                      proposed
                    </span>
                  ) : null}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-sm text-slate-400">
          Proposed cut-off for new proposals entering Version 1.0:{' '}
          <strong className="text-slate-200">{shortDate(PROPOSAL_CUTOFF_DATE)}</strong> (Bring the Chapters
          Together). Items marked <em>proposed</em> are confirmed at the next Monday session.
        </p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <a
            href={bookDiscussHref()}
            className="rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white hover:bg-cyan-500"
          >
            Propose on the book
          </a>
          <a
            href={GOVHUB_DP_PATCHES_URL}
            className="rounded-lg border border-slate-700 px-4 py-2 font-semibold text-slate-200 hover:border-slate-500"
            target="_blank"
            rel="noopener noreferrer"
          >
            Patch on Gov Hub
          </a>
        </div>
      </Section>

      <Section
        id="roles"
        title="Roles"
        lead="Each DP workgroup has members, two co-editors and one coordinator. Both co-editor seats must be filled before anything is incorporated."
      >
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">How many</th>
                <th className="px-4 py-3">Decides</th>
                <th className="px-4 py-3">How you get it</th>
              </tr>
            </thead>
            <tbody>
              {PROCESS_ROLES.map((r) => (
                <tr key={r.role} className="border-t border-slate-800 text-slate-300">
                  <td className="px-4 py-3 font-semibold text-white">{r.role}</td>
                  <td className="px-4 py-3">{r.count}</td>
                  <td className="px-4 py-3">{r.decides}</td>
                  <td className="px-4 py-3">{r.howToGetIt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-400">
          <strong className="text-slate-200">Claiming a co-editor seat.</strong> {CO_EDITOR_CLAIM_RULE}{' '}
          Open seats are listed on the{' '}
          <Link href="/v1-readiness" className="text-cyan-300 hover:text-cyan-200">
            readiness board
          </Link>
          .
        </p>
      </Section>

      <Section
        id="practices"
        title="This month’s tasks"
        lead="Any member can take one of these in 30 to 60 minutes. Claim one on the workgroup page; the week follows the Monday session plan."
      >
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">Week of</th>
                <th className="px-4 py-3">Done when</th>
              </tr>
            </thead>
            <tbody>
              {PRACTICE_TASKS.map((t) => (
                <tr key={t.id} className="border-t border-slate-800 text-slate-300">
                  <td className="px-4 py-3 text-white">{t.task}</td>
                  <td className="px-4 py-3">{t.who}</td>
                  <td className="whitespace-nowrap px-4 py-3">{t.weeks.map(shortDate).join(', ')}</td>
                  <td className="px-4 py-3">{t.doneWhen}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        id="checklist"
        title="V1 readiness checklist"
        lead="A chapter is ready for Version 1.0 when all twelve items pass. Eight are checked automatically from Gov Hub and Canopi data; four are ticked by a co-editor or the coordinator."
      >
        <ol className="grid gap-2 text-sm sm:grid-cols-2">
          {READINESS_ITEMS.map((item, i) => (
            <li key={item.key} className="flex gap-3 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-3">
              <span className="w-5 shrink-0 font-semibold text-slate-400">{i + 1}</span>
              <span className="text-slate-300">
                {item.label}
                <span className={`block text-xs ${item.check === 'manual' ? 'text-violet-300' : 'text-slate-500'}`}>
                  {item.check === 'manual' ? 'manual' : 'automatic'} · due {shortDate(item.due)}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-5">
          <Link
            href="/v1-readiness"
            className="inline-flex rounded-lg bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-500"
          >
            Open the readiness board for all 23 DPs →
          </Link>
        </p>
      </Section>

      <Section id="sessions" title="Monday sessions" lead="One community session each Monday at 11:30 PT, each with a single job.">
        <ul className="divide-y divide-slate-800">
          {sessions.map((e) => (
            <li key={e.date} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 py-3">
              <span className="w-40 shrink-0 text-sm text-slate-400">{roundupDateLabel(e.startsAt)}</span>
              <Link href={e.href} className="font-semibold text-cyan-300 hover:text-cyan-200">
                {e.focus}
              </Link>
              <span className="text-sm text-slate-300">{e.objective}</span>
            </li>
          ))}
        </ul>
      </Section>
    </main>
  );
}
