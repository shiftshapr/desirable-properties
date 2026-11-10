import type { Metadata } from 'next';
import Link from 'next/link';
import LaunchBriefingPanel from '@/components/workgroup/LaunchBriefingPanel';
import { challengeMeta } from '@/lib/challengeTimeline';
import { fetchWorkgroupBySlug, getRequestedWorkgroupSlug } from '@/lib/dp-welcome-workgroup';
import { isLaunchBriefingEnabled } from '@/lib/dp-launch-briefing';
import { notFound } from 'next/navigation';

export const metadata: Metadata = {
  title: 'What shipped on September 16 – Desirable Properties Challenge',
  description:
    'A briefing for Desirable Properties workgroup members and coordinators on the Community Review Draft milestone – what it included, what it did not, and how to keep participating.',
};

type Props = {
  searchParams: Promise<{ wg?: string | string[] }>;
};

export default async function LaunchBriefingPage({ searchParams }: Props) {
  if (!isLaunchBriefingEnabled()) {
    notFound();
  }

  const params = await searchParams;
  const slug = getRequestedWorkgroupSlug(params.wg);
  const workgroup = slug ? await fetchWorkgroupBySlug(slug) : null;
  return (
    <main className="border-b border-slate-800">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <Link
          href={workgroup ? `/workgroups/${encodeURIComponent(workgroup.slug)}` : '/workgroups'}
          className="text-sm text-cyan-300 hover:text-cyan-200"
        >
          {workgroup ? `← ${workgroup.name}` : '← Workgroups'}
        </Link>

        <header className="mt-8 border-b border-slate-800 pb-10">
          <p className="text-sm font-medium uppercase tracking-[0.15em] text-amber-300">
            September 16, 2026 · Community Review Draft
          </p>
          <h1 className="mt-3 text-4xl font-bold text-white sm:text-5xl">What shipped on September 16</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-300">
            A briefing for Desirable Properties workgroup members and coordinators on the Community
            Review Draft milestone – what it included, what it did not, and how to keep
            participating.
          </p>
          <p className="mt-3 text-sm text-slate-500">{challengeMeta.book_launch_title}</p>
          <p className="mt-4 text-base leading-relaxed text-slate-300">
            Version 1.0 was not part of that milestone. V1.0 releases Friday, November 13, 2026,
            10–11 AM PT.
          </p>
        </header>

        <nav className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-5 text-sm">
          <p className="font-medium text-slate-200">On this page</p>
          <ul className="mt-3 grid gap-2 text-cyan-300 sm:grid-cols-2">
            <li>
              <a href="#what-happened" className="hover:text-cyan-200">
                What happened
              </a>
            </li>
            <li>
              <a href="#what-this-is-not" className="hover:text-cyan-200">
                What this is not
              </a>
            </li>
            <li>
              <a href="#members" className="hover:text-cyan-200">
                What members can do
              </a>
            </li>
            <li>
              <a href="#coordinators" className="hover:text-cyan-200">
                Coordinators and leads
              </a>
            </li>
            <li>
              <a href="#links" className="hover:text-cyan-200">
                Related links
              </a>
            </li>
          </ul>
        </nav>

        <div className="mt-10">
          <LaunchBriefingPanel
            workgroupSlug={workgroup?.slug ?? slug}
            workgroupName={workgroup?.name ?? null}
          />
        </div>
      </div>
    </main>
  );
}
