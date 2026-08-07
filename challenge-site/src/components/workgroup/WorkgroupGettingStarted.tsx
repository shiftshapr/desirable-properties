import Link from 'next/link';
import DiscussPatchLink from '@/components/DiscussPatchLink';
import { MESSAGE_A_SECTIONS } from '@/lib/dp-welcome-content';
import { DESIRABLE_PROPERTIES_BOOK_DISCUSSION_URL, bookViewerHref, govhubUrl } from '@/lib/govhub';

type Props = {
  workgroupName: string;
  workgroupSlug: string;
  dpId: string | null;
  dpDetailHref: string | null;
};

function bookDiscussHref(dpId: string | null): string {
  if (!dpId) return DESIRABLE_PROPERTIES_BOOK_DISCUSSION_URL;
  return bookViewerHref({ dpId });
}

export default function WorkgroupGettingStarted({
  workgroupName,
  workgroupSlug,
  dpId,
  dpDetailHref,
}: Props) {
  const welcomeHref = `/welcome/member?wg=${encodeURIComponent(workgroupSlug)}`;
  const govHubHref = govhubUrl(`/workgroups/${workgroupSlug}/`);
  const discussHref = bookDiscussHref(dpId);
  const a = MESSAGE_A_SECTIONS;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
      <h2 className="text-xl font-semibold text-white">Getting started</h2>
      <p className="mt-2 max-w-3xl text-sm text-slate-400">
        This page adds chat and AI invites on top of the existing Desirable Properties workgroup
        experience — welcome guide, DP detail, and Gov Hub drafting all remain available.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        {dpDetailHref ? (
          <Link
            href={dpDetailHref}
            className="rounded-lg bg-violet-800 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
          >
            {dpId ? `${dpId} detail page` : 'DP detail page'}
          </Link>
        ) : null}
        <Link
          href={welcomeHref}
          className="rounded-lg bg-cyan-800 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700"
        >
          Member welcome guide
        </Link>
        <DiscussPatchLink
          href={discussHref}
          className="rounded-lg bg-violet-800 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          Discuss &amp; patch this chapter →
        </DiscussPatchLink>
        <a
          href={govHubHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
        >
          Open on Gov Hub
        </a>
        <Link
          href="/workgroups/join#workgroups"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
        >
          All workgroups
        </Link>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-400">
            {a.missionTitle}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">{a.missionBody}</p>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-cyan-400">
            {a.askTitle}
          </h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-300 marker:text-cyan-500">
            {a.askItems.slice(0, 4).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-6 text-sm text-slate-400">
        Workgroup: <span className="font-medium text-slate-200">{workgroupName}</span>
      </p>
    </section>
  );
}
