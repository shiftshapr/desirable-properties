import Link from 'next/link';
import { CHALLENGE_KEY_DATES } from '@/lib/dp-welcome-content.generated';
import { WORKGROUPS_LIST_HREF } from '@/lib/routes';

export default function StartHereHomePanel() {
  const v1Label = CHALLENGE_KEY_DATES.v1Release.label;

  return (
    <section
      aria-labelledby="start-here-home-heading"
      className="border-b-2 border-cyan-500/70 bg-gradient-to-r from-cyan-950 via-slate-900 to-violet-950"
    >
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
          New here?
        </p>
        <h2
          id="start-here-home-heading"
          className="mt-2 text-3xl font-bold text-white sm:text-4xl"
        >
          Start here
        </h2>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-200">
          Each DP needs two <strong className="font-semibold text-white">co-editors</strong>, who
          decide its proposals on the way to Version 1.0 on {v1Label}. Claim an open seat, propose
          changes in a workgroup, or comment on a chapter.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/start-here"
            className="inline-flex rounded-lg border-2 border-cyan-300 bg-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-950/50 hover:bg-cyan-500"
          >
            Open Start Here →
          </Link>
          <Link
            href={WORKGROUPS_LIST_HREF}
            className="inline-flex rounded-lg bg-violet-700 px-5 py-3 text-sm font-medium text-white hover:bg-violet-600"
          >
            Browse Collaborate pages
          </Link>
        </div>
      </div>
    </section>
  );
}
