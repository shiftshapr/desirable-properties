import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DP_ROUNDUP_EVENTS, ROUNDUP_TIME_LABEL, roundupDateLabel } from '@/lib/dp-roundups';
import { tasksForWeek } from '@/data/dp-process';

type Props = { params: Promise<{ date: string }> };
export function generateStaticParams() { return DP_ROUNDUP_EVENTS.map(({ date }) => ({ date })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const event = DP_ROUNDUP_EVENTS.find(e => e.date === date);
  return event ? { title: `${event.title} | Desirable Properties`, description: event.objective } : { title: 'Event not found' };
}
export default async function RoundupEventPage({ params }: Props) {
  const { date } = await params;
  const event = DP_ROUNDUP_EVENTS.find(e => e.date === date);
  if (!event) notFound();
  const tasks = tasksForWeek(event.date);
  return <main className="mx-auto max-w-3xl px-4 py-12 text-slate-300 sm:px-6">
    <Link href="/roundups" className="text-cyan-300 underline">All DP Roundups</Link>
    <p className="mt-8 text-sm uppercase tracking-widest text-cyan-400">{event.launch ? 'Version 1.0 launch' : 'Meta-Layer Monday'}</p>
    <h1 className="mt-3 text-4xl font-bold text-white">{event.title}</h1>
    <p className="mt-5 text-xl">{roundupDateLabel(event.startsAt)}</p><p className="mt-2">{ROUNDUP_TIME_LABEL} · Zoom</p>
    <p className="mt-6 text-xl">{event.objective}</p>
    <a href={event.lumaUrl} className="mt-6 inline-flex rounded-lg bg-cyan-300 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-200">RSVP on Luma →</a>
    <section className="mt-8 rounded-xl border border-slate-700 p-6"><h2 className="text-xl font-semibold text-white">Meeting access</h2><p className="mt-3">Register on Luma to receive the Zoom meeting details. Use the Zoom link, meeting ID, and passcode in your invitation. If the invitation link does not open Zoom, copy and paste its full Zoom URL into your browser’s address bar.</p><p className="mt-3">Need help joining? <Link href="/support" className="text-cyan-300 underline">Contact support</Link>.</p></section>
    <section className="mt-8"><h2 className="text-2xl font-semibold text-white">{event.launch ? 'Celebrating the work' : 'What to expect'}</h2><p className="mt-3">{event.launch ? 'Join the community to present the V1 release, review chapter outcomes and the contribution record, and discuss what comes next.' : 'After initiative news, a progress overview, and a short DP focus, choose a workgroup breakout. Get direction, meet collaborators, learn how to contribute, and work on chapter questions or proposals. Final rooms depend on attendance, with the main room available for orientation.'}</p>{!event.launch && <p className="mt-3">You do not need a task chosen in advance. Bring your experience or one question. To offer a breakout, tell Daveed the workgroup and objective through the invitation or at the meeting.</p>}</section>
    {tasks.length > 0 && <section className="mt-8 rounded-xl border border-slate-700 p-6"><h2 className="text-xl font-semibold text-white">This week&apos;s tasks</h2><p className="mt-2 text-sm text-slate-400">Any member can take one in 30 to 60 minutes. Claim it on your workgroup page.</p><ul className="mt-4 space-y-3">{tasks.map(t => <li key={t.id}><p className="text-white">{t.task}</p><p className="text-sm text-slate-400">{t.who} · about {t.minutes} min · done when: {t.doneWhen}</p></li>)}</ul><p className="mt-4 text-sm"><Link href="/process#practices" className="text-cyan-300 underline">All tasks and the process</Link> · <Link href="/v1-readiness" className="text-cyan-300 underline">Readiness board</Link></p></section>}
    <div className="mt-8 flex flex-wrap gap-5 text-cyan-300"><Link href="/roundups" className="underline">Meeting structure and calendar</Link><Link href="/start-here" className="underline">Start Here</Link><Link href="/workgroups" className="underline">Choose a workgroup</Link></div>
  </main>;
}
