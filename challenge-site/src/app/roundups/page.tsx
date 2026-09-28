import type { Metadata } from 'next';
import Link from 'next/link';
import { DP_ROUNDUP_EVENTS, ROUNDUP_AGENDA, ROUNDUP_TIME_LABEL, roundupDateLabel, nextRoundup } from '@/lib/dp-roundups';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'DP Roundups | Meta-Layer Monday',
  description: 'Find your workgroup, get direction, and help bring the Desirable Properties to Version 1.0. Mondays September 28–November 9, with the V1 launch November 13, 2026.',
};

export default function RoundupsPage() {
  const next = nextRoundup();
  return <main className="mx-auto max-w-5xl px-4 py-12 text-slate-300 sm:px-6">
    <p className="text-sm font-medium uppercase tracking-widest text-cyan-400">Meta-Layer Monday</p>
    <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">DP Roundups</h1>
    <p className="mt-5 max-w-3xl text-xl">Help bring the Desirable Properties to Version 1.0. Each week, get direction, find collaborators, and work together on the chapters before the November 13 launch.</p>
    <p className="mt-4">Mondays, September 28–November 9, 2026. {ROUNDUP_TIME_LABEL}. We meet on Zoom with workgroup breakouts. Daveed is the series producer.</p>
    {next ? <section className="mt-8 rounded-xl border border-cyan-800 bg-cyan-950/30 p-6">
      <h2 className="text-sm uppercase tracking-widest text-cyan-300">Next gathering</h2>
      <Link href={next.href} className="mt-2 block text-2xl font-semibold text-white underline decoration-cyan-600 underline-offset-4">{next.title}</Link>
      <p className="mt-3">{roundupDateLabel(next.startsAt)} · {ROUNDUP_TIME_LABEL}</p>
      <p className="mt-2">{next.objective}</p>
      <p className="mt-3 text-sm">Use the Zoom access details in your invitation. Need help finding the invitation? <Link href="/support" className="text-cyan-300 underline">Contact support</Link>.</p>
    </section> : <p className="mt-8">The 2026 Roundup series has concluded. Browse the session calendar below.</p>}
    <div className="mt-6 flex flex-wrap gap-5 text-cyan-300"><Link href="/start-here" className="underline">Start Here</Link><Link href="/workgroups" className="underline">Find a workgroup</Link><a href="#calendar" className="underline">Series calendar</a></div>
    <section className="mt-12" aria-labelledby="progress"><h2 id="progress" className="text-2xl font-bold text-white">Where the work stands</h2>
      <p className="mt-3">The current Community Review Draft is Version 0.77. There are 23 property workgroups plus DP Discovery. Each group aims for at least three members.</p>
      <p className="mt-3"><Link href="/workgroups" className="text-cyan-300 underline">See current membership and recruitment needs</Link>. Open proposal totals, recorded resolution totals, and editor-confirmed V1 readiness: <strong>not yet reported here</strong>. Membership alone does not establish chapter readiness.</p>
    </section>
    <section className="mt-12"><h2 className="text-2xl font-bold text-white">How you can participate</h2><dl className="mt-5 grid gap-6 sm:grid-cols-3">
      <div><dt className="font-semibold text-cyan-300">Review</dt><dd className="mt-2">Bring a question, example, source, critique, or suggested passage.</dd></div>
      <div><dt className="font-semibold text-cyan-300">Join</dt><dd className="mt-2">Choose a workgroup and learn where your experience can help. No preparation or previous attendance is required.</dd></div>
      <div><dt className="font-semibold text-cyan-300">Host</dt><dd className="mt-2">Offer to facilitate one breakout. Tell Daveed the date, workgroup, and a one-sentence objective through the invitation or at the meeting.</dd></div>
    </dl></section>
    <section className="mt-12"><h2 className="text-2xl font-bold text-white">The Monday meeting</h2><p className="mt-3">All times Pacific. The meeting lasts 90 minutes, including 75 minutes for the DP Roundup.</p><div className="mt-5 overflow-x-auto"><table className="w-full text-left"><caption className="sr-only">Weekly Monday agenda in Pacific Time</caption><thead><tr className="border-b border-slate-700 text-cyan-300"><th scope="col" className="p-3">Time</th><th scope="col" className="p-3">Activity</th></tr></thead><tbody>{ROUNDUP_AGENDA.map(([time, activity]) => <tr key={time} className="border-b border-slate-800"><td className="whitespace-nowrap p-3">{time}</td><td className="p-3">{activity}</td></tr>)}</tbody></table></div></section>
    <section className="mt-12"><h2 className="text-2xl font-bold text-white">Breakouts help people get started and work together</h2>
      <p className="mt-3">The groups that meet depend on who attends. Choose a room when we announce the available hosts and topics. The main room stays available for orientation and help finding a first task.</p>
      <p className="mt-3">A 40-minute breakout can use five minutes for introductions, ten for direction and contribution tools, twenty for working together or organizing a task, and five for follow-through. New groups can spend more time establishing direction and working relationships.</p>
      <p className="mt-3">Leave knowing what to do next, where to contribute, and whom to work with. A first-task plan and a working partnership count as progress.</p>
      <h3 className="mt-6 text-xl font-semibold text-white">Reportback</h3><p className="mt-3">Each room records the DP and chapter or proposal link, what it addressed, the outcome or unresolved question, and a next action with an owner, reviewer, and due date. Record where the group will coordinate. A breakout recommendation still needs the applicable review and decision process.</p>
    </section>
    <section id="calendar" className="mt-12 scroll-mt-24"><h2 className="text-2xl font-bold text-white">Series calendar</h2><p className="mt-3">{ROUNDUP_TIME_LABEL} for every gathering, including the Friday launch. Weekly themes guide the work; any workgroup can meet when participants and a host attend.</p><ul className="mt-5 divide-y divide-slate-800">{DP_ROUNDUP_EVENTS.map(event => <li key={event.date} className="py-5"><p className="text-sm text-slate-400">{roundupDateLabel(event.startsAt)}</p><Link className="mt-1 block text-xl font-semibold text-cyan-300 underline" href={event.href}>{event.title}</Link><p className="mt-2">{event.objective}</p></li>)}</ul></section>
    <section className="mt-12 border-t border-slate-800 pt-8"><h2 className="text-2xl font-bold text-white">From review to V1</h2><p className="mt-3">Named chapter editors record readiness against the adopted checklist: clear scope, reviewed evidence, recorded proposal dispositions, integrated changes, visible disagreements, checked attribution, and a linked release draft with reviewer names and date.</p><p className="mt-3">Editorial freeze: <strong>November 9, 2026 at 1 p.m. PT</strong>. November 10–12 are for controlled corrections and release preparation. The V1 launch gathering is <strong>Friday, November 13, 11:30 a.m.–1 p.m. PT</strong>.</p></section>
  </main>;
}
