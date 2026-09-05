'use client';

import DiscussPatchLink from '@/components/DiscussPatchLink';
import { getCanopiAppBase } from '@/lib/canopi-api';
import { bookDiscussHref, bookIntroDiscussHref, isDpDiscoveryWorkgroup } from '@/lib/govhub';

type Props = {
  workgroupSlug: string;
  dpId: string | null;
  compact?: boolean;
};

/** Canopi discuss + app links for workgroup editorial tabs. */
export default function WorkgroupCanopiStrip({ workgroupSlug, dpId, compact = false }: Props) {
  const isDiscovery = isDpDiscoveryWorkgroup(workgroupSlug);
  const discussHref = isDiscovery
    ? bookIntroDiscussHref()
    : bookDiscussHref(dpId ? { dpId } : undefined);
  const canopiAppHref = getCanopiAppBase();

  return (
    <div
      className={`rounded-xl border border-violet-800/50 bg-violet-950/25 ${
        compact ? 'p-4' : 'p-5 sm:p-6'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Canopi</p>
      <p className={`mt-2 text-sm leading-relaxed text-slate-300 ${compact ? 'max-w-2xl' : 'max-w-3xl'}`}>
        Use the <span className="font-medium text-violet-100">Go Meta</span> tab (bottom-right) to
        open Canopi Discuss on this page while you are on Getting Started, Astra, or Edit. You can also
        discuss chapter comments and patches on the book reader.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <DiscussPatchLink
          href={discussHref}
          className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600"
        >
          {isDiscovery ? 'Discuss on the book' : 'Discuss this chapter'}
        </DiscussPatchLink>
        <a
          href={canopiAppHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-violet-700/60 px-4 py-2 text-sm font-medium text-violet-100 hover:border-violet-500 hover:bg-violet-950/50"
        >
          Open Canopi app
        </a>
      </div>
    </div>
  );
}
