import Link from 'next/link';
import { currentSession } from '@/lib/current-session';

/** Front page: the current community session (src/lib/current-session.ts). */
export default function CurrentSessionHomePanel({ now = new Date() }: { now?: Date }) {
  const session = currentSession(now);
  return (
    <section aria-labelledby="current-session-home-heading" className="border-b border-slate-800 bg-slate-900/60">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="rounded-xl border border-cyan-500/50 bg-cyan-950/30 p-4 sm:p-5 md:flex md:items-center md:justify-between md:gap-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
              {session.upcoming ? 'Next session' : 'Current session'} · {session.dateLabel} · {session.startLabel}
            </p>
            <h2 id="current-session-home-heading" className="mt-2 text-xl font-semibold text-white sm:text-2xl">
              {session.title}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              {session.pageContents ?? 'Details and how to join.'} Monday sessions start at 10:00 a.m. Pacific.
            </p>
          </div>
          <div className="mt-4 flex shrink-0 flex-wrap items-center gap-x-5 gap-y-3 md:mt-0">
            <Link
              href={session.href}
              className="inline-flex rounded-lg bg-cyan-300 px-5 py-2.5 text-sm font-semibold text-slate-950 no-underline hover:bg-cyan-200"
            >
              Go to the session page →
            </Link>
            {session.chatHref ? (
              <Link href={session.chatHref} className="text-sm text-cyan-300 hover:text-cyan-200">
                Session chat
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
