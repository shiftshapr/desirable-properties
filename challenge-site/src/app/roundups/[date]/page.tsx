import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DP_ROUNDUP_EVENTS, gatheringKindLabel, gatheringTimeLabel, roundupDateLabel } from '@/lib/dp-roundups';
import { tasksForWeek } from '@/data/dp-process';
import SessionCollapsible from '@/components/sessions/SessionCollapsible';
import SessionInvite from '@/components/sessions/SessionInvite';
import SessionPageShell from '@/components/sessions/SessionPageShell';
import { meetingLongDate, type MeetingRef } from '@/lib/sessions/session-labels';
import type { PhaseTone } from '@/lib/sessions/session-phases';

type Props = { params: Promise<{ date: string }> };
/** Hourly, so a session's RSVP link drops once it has ended. */
export const revalidate = 3600;
export function generateStaticParams() { return DP_ROUNDUP_EVENTS.map(({ date }) => ({ date })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  const event = DP_ROUNDUP_EVENTS.find(e => e.date === date);
  if (!event) return { title: 'Event not found' };
  const title = event.meetingTitle ? `${event.meetingTitle} (${event.seriesTitle})` : event.title;
  return { title: `${title} | Desirable Properties`, description: event.objective };
}
export default async function RoundupEventPage({ params }: Props) {
  const { date } = await params;
  const event = DP_ROUNDUP_EVENTS.find(e => e.date === date);
  if (!event) notFound();
  const tasks = event.kind === 'roundup' ? tasksForWeek(event.date) : [];
  const isRoundup = event.kind === 'roundup';
  // Community sessions (not V1 Roundups or the launch) point to their own session page and /events, not /roundups.
  const isSession = !isRoundup && !event.launch;
  const ended = new Date(event.endsAt) <= new Date();
  const live = !ended && new Date(event.startsAt) <= new Date();
  if (isSession) return <CommunitySessionPage event={event} ended={ended} live={live} />;
  return <main className="mx-auto max-w-3xl px-4 py-12 text-slate-300 sm:px-6">
    {isRoundup || event.launch ? <Link href="/roundups" className="text-cyan-300 underline">All DP Roundups</Link> : <Link href="/events" className="text-cyan-300 underline">All events</Link>}
    <p className="mt-8 text-sm uppercase tracking-widest text-cyan-400">{gatheringKindLabel(event)}</p>
    <h1 className="mt-3 text-4xl font-bold text-white">{event.title}</h1>
    <p className="mt-5 text-xl">{roundupDateLabel(event.startsAt)}</p><p className="mt-2">{gatheringTimeLabel(event)} · Zoom</p>
    <p className="mt-6 text-xl">{event.objective}</p>
    {isSession && event.pageHref ? <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3"><Link href={event.pageHref} className="inline-flex rounded-lg bg-cyan-300 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-200">Go to the session page →</Link>{!ended ? <a href={event.lumaUrl} className="text-cyan-300 underline">RSVP on Luma</a> : null}<Link href="/events" className="text-cyan-300 underline">All events</Link></div>
    : event.recordingHref ? <Link href={event.recordingHref} className="mt-6 inline-flex rounded-lg bg-cyan-300 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-200">Watch the recording, summary and transcript →</Link> : <a href={event.lumaUrl} className="mt-6 inline-flex rounded-lg bg-cyan-300 px-6 py-3 font-semibold text-slate-950 hover:bg-cyan-200">RSVP on Luma →</a>}
    {isSession && ended ? null : <section className="mt-8 rounded-xl border border-slate-700 p-6"><h2 className="text-xl font-semibold text-white">Meeting access</h2><p className="mt-3">Register on Luma to receive the Zoom meeting details. Use the Zoom link, meeting ID, and passcode in your invitation. If the invitation link does not open Zoom, copy and paste its full Zoom URL into your browser’s address bar.</p><p className="mt-3">Need help joining? <Link href="/support" className="text-cyan-300 underline">Contact support</Link>.</p></section>}
    <section className="mt-8"><h2 className="text-2xl font-semibold text-white">{event.launch ? 'Celebrating the work' : 'What to expect'}</h2><p className="mt-3">{event.details ?? (event.launch ? 'Join the community to present the V1 release, review chapter outcomes and the contribution record, and discuss what comes next.' : 'After initiative news, a progress overview, and a short DP focus, choose a workgroup breakout. Get direction, meet collaborators, learn how to contribute, and work on chapter questions or proposals. Final rooms depend on attendance, with the main room available for orientation.')}</p>{isRoundup && <p className="mt-3">Each DP needs two co-editors, who decide its proposals on the workgroup&apos;s Review tab. If your DP has an open seat, claim it or nominate someone before the meeting; co-editors use the breakout to move pending proposals to a decision. <Link href="/roundups#progress" className="text-cyan-300 underline">See which DPs need a co-editor</Link>.</p>}
    {isRoundup && <p className="mt-3">You do not need a task chosen in advance. Bring your experience or one question. To offer a breakout, tell Daveed the workgroup and objective through the invitation or at the meeting.</p>}</section>
    {tasks.length > 0 && <section className="mt-8 rounded-xl border border-slate-700 p-6"><h2 className="text-xl font-semibold text-white">This week&apos;s tasks</h2><p className="mt-2 text-sm text-slate-400">Any member can take one in 30 to 60 minutes. Claim it on your workgroup page.</p><ul className="mt-4 space-y-3">{tasks.map(t => <li key={t.id}><p className="text-white">{t.task}</p><p className="text-sm text-slate-400">{t.who} · about {t.minutes} min · done when: {t.doneWhen}</p></li>)}</ul><p className="mt-4 text-sm"><Link href="/process#practices" className="text-cyan-300 underline">All tasks and the process</Link> · <Link href="/v1-readiness" className="text-cyan-300 underline">Readiness board</Link></p></section>}
    <div className="mt-8 flex flex-wrap gap-5 text-cyan-300">{isSession ? <>{event.pageHref ? <Link href={event.pageHref} className="underline">Go to the session page</Link> : null}<Link href="/events" className="underline">All events</Link></> : <Link href="/roundups" className="underline">Meeting structure and calendar</Link>}<Link href="/start-here" className="underline">Start Here</Link><Link href="/workgroups" className="underline">Choose a workgroup</Link></div>
  </main>;
}

type SessionEvent = (typeof DP_ROUNDUP_EVENTS)[number];

/**
 * A community session's page before it has an occurrence page of its own (and its /roundups/<date> page after):
 * the shared session frame (SessionPageShell) with breadcrumbs, the meeting's own title and series, a sticky
 * header and readable type, so every session page looks and reads the same.
 */
function CommunitySessionPage({ event, ended, live }: { event: SessionEvent; ended: boolean; live: boolean }) {
  const meeting: MeetingRef = { date: event.date, meetingTitle: event.meetingTitle ?? event.title, seriesTitle: event.seriesTitle };
  const [phaseLabel, tone]: [string, PhaseTone] = ended ? ['Meeting held', 'decided'] : live ? ['Happening now', 'review'] : ['Upcoming', 'screen'];
  const primary = event.pageHref
    ? { label: 'Go to the session page', href: event.pageHref }
    : !ended
      ? { label: 'RSVP on Luma', href: event.lumaUrl }
      : null;
  const link = 'text-cyan-300 underline hover:text-cyan-200';
  return (
    <SessionPageShell
      meeting={meeting}
      dateHref={null}
      whenLine={<>{gatheringTimeLabel(event)} · Zoom</>}
      intro={event.objective}
      phaseLabel={phaseLabel}
      tone={tone}
      stickyCta={primary ? { label: primary.label.replace('Go to the session page', 'Session page'), href: primary.href } : null}
      className="max-w-3xl"
    >
      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        {primary ? (
          <a href={primary.href} className="inline-flex rounded-lg bg-cyan-300 px-6 py-3 font-semibold text-slate-950 no-underline hover:bg-cyan-200">
            {primary.label} →
          </a>
        ) : null}
        {event.pageHref && !ended ? <a href={event.lumaUrl} className={link}>RSVP on Luma</a> : null}
      </div>

      {ended ? null : (
        <section id="access" className="mt-8 scroll-mt-24 rounded-xl border border-slate-700 p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-white">Joining on {meetingLongDate(event.date)}</h2>
          <p className="mt-2">
            Register on Luma and the Zoom link comes to you. If the link does not open Zoom, paste the full Zoom URL
            into your browser. <Link href="/support" className={link}>Need help?</Link>
          </p>
        </section>
      )}

      <section id="this-week" className="mt-8 scroll-mt-24">
        <h2 className="border-b border-slate-700 pb-2 text-2xl font-semibold text-white">What this meeting covers</h2>
        <p className="mt-3">{event.thisWeek ?? event.details ?? event.objective}</p>
      </section>

      <SessionInvite path={event.pageHref ?? event.href} className="mt-8" />

      {event.seriesAbout ? (
        <SessionCollapsible id="series" title={`About the series: ${event.seriesTitle}`} className="mt-8">
          <p>{event.seriesAbout}</p>
        </SessionCollapsible>
      ) : null}

      <div className="mt-10 flex flex-wrap gap-5">
        {event.pageHref ? <Link href={event.pageHref} className={link}>Session page</Link> : null}
        <Link href="/events" className={link}>All sessions and events</Link>
        <Link href="/start-here" className={link}>Start Here</Link>
      </div>
    </SessionPageShell>
  );
}
