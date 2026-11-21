import Link from 'next/link';
import { meetingShortDate, type MeetingRef } from '@/lib/sessions/session-labels';

/** Sessions › 16 Nov 2026 › Meeting agreements: how we decide */
export default function SessionBreadcrumbs({ meeting, dateHref }: { meeting: MeetingRef; dateHref?: string | null }) {
  const sep = (
    <span aria-hidden="true" className="px-1.5 text-slate-500">
      ›
    </span>
  );
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-y-1 text-slate-300">
        <li className="flex items-center">
          <Link href="/events" className="text-cyan-300 hover:text-cyan-200">
            Sessions
          </Link>
          {sep}
        </li>
        <li className="flex items-center">
          {dateHref ? (
            <Link href={dateHref} className="text-cyan-300 hover:text-cyan-200">
              {meetingShortDate(meeting.date)}
            </Link>
          ) : (
            <span>{meetingShortDate(meeting.date)}</span>
          )}
          {sep}
        </li>
        <li aria-current="page" className="min-w-0 text-slate-100">
          {meeting.meetingTitle}
        </li>
      </ol>
    </nav>
  );
}
