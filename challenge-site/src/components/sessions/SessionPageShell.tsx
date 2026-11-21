import type { ReactNode } from 'react';
import { meetingLongDate, meetingShortDate, type MeetingRef } from '@/lib/sessions/session-labels';
import type { PhaseTone } from '@/lib/sessions/session-phases';
import SessionAnchors from './SessionAnchors';
import SessionBreadcrumbs from './SessionBreadcrumbs';
import SessionStickyHeader from './SessionStickyHeader';
import { PHASE_TONE } from './phase-tone';

type Props = {
  meeting: MeetingRef;
  /** Link for the date crumb (the event's /roundups/<date> page). */
  dateHref?: string | null;
  /** "10:00–11:30 a.m. Pacific Time · Zoom" */
  whenLine?: ReactNode;
  /** One line under the title. */
  intro?: ReactNode;
  phaseLabel: string | null;
  tone: PhaseTone;
  /** Call to action in the compact header, e.g. "Vote" while voting is open. */
  stickyCta?: { label: string; href: string } | null;
  /** Above the breadcrumbs (staging notices). */
  banner?: ReactNode;
  /** Under the intro, inside the header (short notes such as "not video recorded"). */
  headerExtra?: ReactNode;
  className?: string;
  children: ReactNode;
};

/**
 * Frame for every session page (the occurrence page and /roundups/<date> for community sessions): breadcrumbs,
 * a header with the specific meeting title and its series, a compact sticky header on scroll, readable type
 * (`.session-page` in globals.css) and deep links that open collapsed sections.
 */
export default function SessionPageShell({
  meeting,
  dateHref,
  whenLine,
  intro,
  phaseLabel,
  tone,
  stickyCta,
  banner,
  headerExtra,
  className = 'max-w-4xl',
  children,
}: Props) {
  const t = PHASE_TONE[tone];
  return (
    <main id="top" className={`session-page mx-auto w-full min-w-0 px-4 py-8 text-slate-200 sm:px-6 sm:py-12 ${className}`}>
      <SessionAnchors />
      <SessionStickyHeader
        watchId="session-page-header"
        dateLabel={meetingShortDate(meeting.date)}
        meetingTitle={meeting.meetingTitle}
        phaseLabel={phaseLabel}
        tone={tone}
        cta={stickyCta}
      />
      {banner}
      <SessionBreadcrumbs meeting={meeting} dateHref={dateHref} />
      <header id="session-page-header" className="mt-6">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-medium text-cyan-300">
          <span className="uppercase tracking-[0.12em]">{meetingLongDate(meeting.date)}</span>
          {phaseLabel ? (
            <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold normal-case tracking-normal ${t.pill}`}>
              {phaseLabel}
            </span>
          ) : null}
        </p>
        <h1 className="mt-3 text-3xl font-bold leading-tight text-white sm:text-5xl">{meeting.meetingTitle}</h1>
        <p className="mt-3 text-base text-slate-300">
          <span className="text-slate-400">Series:</span> {meeting.seriesTitle}
        </p>
        {whenLine ? <p className="mt-1 text-base text-slate-300">{whenLine}</p> : null}
        {intro ? <p className="mt-4 text-lg text-slate-100">{intro}</p> : null}
        {headerExtra}
      </header>
      {children}
    </main>
  );
}
