import type { Metadata } from 'next';
import Link from 'next/link';
import { DP_ROUNDUP_EVENTS, ROUNDUP_AGENDA, ROUNDUP_TIME_LABEL, roundupDateLabel, nextRoundup } from '@/lib/dp-roundups';
import { fetchReadinessBoard } from '@/lib/v1-readiness.server';
import { openProposalCountsByDp } from '@/lib/open-proposals.server';
import { coEditorCountFromDetail } from '@/lib/workgroup-roster-nudge';
import { DP_WORKGROUP_SLUGS } from '@/lib/dp-workgroup-slugs';

const SEATS_PER_DP = 2;

/** Live co-editor staffing and open proposals, from the readiness board (Gov Hub) and the Review queue sources. */
async function coEditorStatus() {
  const board = await fetchReadinessBoard();
  if (!board.dps.length) return null;
  const rows = board.dps.map((dp) => ({
    dp: dp.dp,
    seats: Math.min(SEATS_PER_DP, coEditorCountFromDetail(dp.checks.co_editors?.detail) ?? 0),
  }));
  const open = await openProposalCountsByDp(board.dps).catch(() => new Map<string, number>());
  const byNumber = (a: { dp: string }, b: { dp: string }) => Number(a.dp.slice(2)) - Number(b.dp.slice(2));
  return {
    seatsFilled: rows.reduce((sum, r) => sum + r.seats, 0),
    seatsTotal: rows.length * SEATS_PER_DP,
    needsCoEditor: rows.filter((r) => r.seats < SEATS_PER_DP).sort(byNumber),
    openProposals: open.size ? [...open.values()].reduce((a, b) => a + b, 0) : null,
    openByDp: open,
  };
}

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'DP Roundups | Meta-Layer Monday',
  description: 'Find your workgroup, get direction, and help bring the Desirable Properties to Version 1.0. Mondays September 28–November 9, with the V1 launch November 13, 2026.',
};

export default async function RoundupsPage() {
  const next = nextRoundup();
  const status = await coEditorStatus().catch(() => null);
  return <main className="mx-auto max-w-5xl px-4 py-12 text-slate-300 sm:px-6">
    <p className="text-sm font-medium uppercase tracking-widest text-cyan-400">Meta-Layer Monday</p>
    <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">DP Roundups</h1>
    <p className="mt-5 max-w-3xl text-xl">Help bring the Desirable Properties to Version 1.0. Each chapter needs two co-editors who review its proposals independently. Each week, fill open seats, move pending proposals to a decision, and work together on the chapters before the November 13 launch.</p>
    <p className="mt-4">Mondays, September 28–November 9, 2026. {ROUNDUP_TIME_LABEL}. We meet on Zoom with workgroup breakouts. Daveed is the series producer.</p>
    {next ? <section className="mt-8 rounded-xl border border-cyan-800 bg-cyan-950/30 p-6">
      <h2 className="text-sm uppercase tracking-widest text-cyan-300">Next gathering</h2>
      <Link href={next.href} className="mt-2 block text-2xl font-semibold text-white underline decoration-cyan-600 underline-offset-4">{next.title}</Link>
      <p className="mt-3">{roundupDateLabel(next.startsAt)} · {ROUNDUP_TIME_LABEL}</p>
      <p className="mt-2">{next.objective}</p>
      <a href={next.lumaUrl} className="mt-5 inline-flex rounded-lg bg-cyan-300 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-200">RSVP on Luma →</a>
      <p className="mt-3 text-sm">Register on Luma to receive the Zoom meeting details. Need help joining? <Link href="/support" className="text-cyan-300 underline">Contact support</Link>.</p>
    </section> : <p className="mt-8">The 2026 Roundup series has concluded. Browse the session calendar below.</p>}
    <div className="mt-6 flex flex-wrap gap-5 text-cyan-300"><Link href="/start-here" className="underline">Start Here</Link><Link href="/workgroups" className="underline">Find a workgroup</Link><a href="#calendar" className="underline">Series calendar</a></div>
    <section className="mt-12" aria-labelledby="progress"><h2 id="progress" className="text-2xl font-bold text-white">Where the work stands</h2>
      {status ? <>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-700 p-4"><dt className="text-sm text-slate-400">Co-editor seats filled</dt><dd className="mt-1 text-3xl font-bold text-white">{status.seatsFilled} / {status.seatsTotal}</dd></div>
          <div className="rounded-xl border border-slate-700 p-4"><dt className="text-sm text-slate-400">Open proposals waiting for co-editors</dt><dd className="mt-1 text-3xl font-bold text-white">{status.openProposals ?? '—'}</dd></div>
        </dl>
        <p className="mt-4">A proposal goes into a chapter only when both of its DP&apos;s co-editors approve it, so open seats are what hold the work back. {status.needsCoEditor.length ? 'These DPs have an open co-editor seat:' : 'Every co-editor seat is filled.'}</p>
        {status.needsCoEditor.length ? <ul className="mt-3 flex flex-wrap gap-2">{status.needsCoEditor.map((r) => {
          const slug = DP_WORKGROUP_SLUGS[r.dp];
          const waiting = status.openByDp.get(r.dp);
          return <li key={r.dp}><Link href={slug ? `/workgroups/${slug}` : '/workgroups'} className="inline-flex rounded-lg border border-cyan-800 px-3 py-1.5 text-sm text-cyan-200 hover:bg-cyan-950">{r.dp} · {SEATS_PER_DP - r.seats} open{waiting ? ` · ${waiting} waiting` : ''}</Link></li>;
        })}</ul> : null}
      </> : <p className="mt-3">Live co-editor and proposal numbers are unavailable right now; see the <Link href="/v1-readiness" className="text-cyan-300 underline">readiness board</Link>.</p>}
      <p className="mt-4"><Link href="/v1-readiness" className="text-cyan-300 underline">Readiness board</Link> · <Link href="/workgroups" className="text-cyan-300 underline">All workgroups</Link> · <Link href="/process" className="text-cyan-300 underline">How co-editing works</Link></p>
    </section>
    <section className="mt-12"><h2 className="text-2xl font-bold text-white">How you can participate</h2><dl className="mt-5 grid gap-6 sm:grid-cols-2">
      <div><dt className="font-semibold text-cyan-300">Co-edit a DP</dt><dd className="mt-2">Claim an open co-editor seat at the top of the DP&apos;s workgroup page, with a short statement (accounts at least 7 days old). Or nominate someone you trust; they are seated when they accept. Co-editors review each proposal independently, approve or decline it with a note the author can read, and decide within 7 days.</dd></div>
      <div><dt className="font-semibold text-cyan-300">Review</dt><dd className="mt-2">Bring a question, example, source, critique, or suggested passage.</dd></div>
      <div><dt className="font-semibold text-cyan-300">Join</dt><dd className="mt-2">Choose a workgroup and learn where your experience can help. No preparation or previous attendance is required.</dd></div>
      <div><dt className="font-semibold text-cyan-300">Host</dt><dd className="mt-2">Offer to facilitate one breakout. Tell Daveed the date, workgroup, and a one-sentence objective through the invitation or at the meeting.</dd></div>
    </dl></section>
    <section className="mt-12"><h2 className="text-2xl font-bold text-white">The Monday meeting</h2><p className="mt-3">All times Pacific. The meeting lasts 90 minutes, including 75 minutes for the DP Roundup.</p><div className="mt-5 overflow-x-auto"><table className="w-full text-left"><caption className="sr-only">Weekly Monday agenda in Pacific Time</caption><thead><tr className="border-b border-slate-700 text-cyan-300"><th scope="col" className="p-3">Time</th><th scope="col" className="p-3">Activity</th></tr></thead><tbody>{ROUNDUP_AGENDA.map(([time, activity]) => <tr key={time} className="border-b border-slate-800"><td className="whitespace-nowrap p-3">{time}</td><td className="p-3">{activity}</td></tr>)}</tbody></table></div></section>
    <section className="mt-12"><h2 className="text-2xl font-bold text-white">Breakouts help people get started and work together</h2>
      <p className="mt-3">Co-editors use breakouts to work through their DP&apos;s pending proposals on the Review tab, with members weighing in. The groups that meet depend on who attends. Choose a room when we announce the available hosts and topics. The main room stays available for orientation and help finding a first task.</p>
      <p className="mt-3">A 40-minute breakout can use five minutes for introductions, ten for direction and contribution tools, twenty for working together or organizing a task, and five for follow-through. New groups can spend more time establishing direction and working relationships.</p>
      <p className="mt-3">Leave knowing what to do next, where to contribute, and whom to work with. A first-task plan and a working partnership count as progress.</p>
      <h3 className="mt-6 text-xl font-semibold text-white">Reportback</h3><p className="mt-3">Each room records the DP and chapter or proposal link, what it addressed, the outcome or unresolved question, and a next action with an owner, reviewer, and due date. Record where the group will coordinate. Flag any DP that still has an open co-editor seat. A breakout recommendation still needs both co-editors&apos; decisions on the Review tab.</p>
    </section>
    <section id="calendar" className="mt-12 scroll-mt-24"><h2 className="text-2xl font-bold text-white">Series calendar</h2><p className="mt-3">{ROUNDUP_TIME_LABEL} for every gathering, including the Friday launch. Weekly themes guide the work; any workgroup can meet when participants and a host attend.</p><ul className="mt-5 divide-y divide-slate-800">{DP_ROUNDUP_EVENTS.map(event => <li key={event.date} className="py-5"><p className="text-sm text-slate-400">{roundupDateLabel(event.startsAt)}</p><Link className="mt-1 block text-xl font-semibold text-cyan-300 underline" href={event.href}>{event.title}</Link><p className="mt-2">{event.objective}</p><a href={event.lumaUrl} className="mt-3 inline-flex rounded-lg border border-cyan-500 px-4 py-2 font-semibold text-cyan-300 hover:bg-cyan-950">RSVP on Luma →</a></li>)}</ul></section>
    <section className="mt-12 border-t border-slate-800 pt-8"><h2 className="text-2xl font-bold text-white">From review to V1</h2><p className="mt-3">Each DP&apos;s two co-editors decide its proposals: both must approve before a change is incorporated, and every decline or &ldquo;considered&rdquo; decision carries a note the author can read. Proposals pending more than 7 days come to the Monday session, and the steering group handles anything unresolved. The co-editors then record readiness against the <Link href="/v1-readiness" className="text-cyan-300 underline">V1 checklist</Link>: both seats filled, every proposal decided with a note, integrated changes in a numbered ML-Draft, neighbouring DPs checked, and contributors acknowledged.</p><p className="mt-3">Editorial freeze: <strong>November 9, 2026 at 1 p.m. PT</strong>. November 10–12 are for controlled corrections and release preparation. The V1 launch gathering is <strong>Friday, November 13, 11:30 a.m.–1 p.m. PT</strong>.</p></section>
  </main>;
}
