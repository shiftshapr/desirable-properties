import type { Metadata } from 'next';
import Link from 'next/link';
import { pageOpenGraph } from '@/lib/site-metadata';
import { dpDetailHref } from '@/lib/dp-links';
import { dpWorkgroupSlug } from '@/lib/dp-workgroup-slugs';
import { VERSION_MARKER_LABEL } from '@/lib/dp-v11';
import { loadOpenItems, type OpenItem, type OpenItemsDoc } from '@/lib/dp-v11-open-items.server';
import { padHref } from '@/lib/pads/proposal-pad-core';
import { storedTitles } from '@/lib/pads/proposal-pad.server';

// Rendered on request, not at build time: the Gov Hub sweep (28 lists, 4 at a time, one retry) can pass Next's
// 60-second static build limit when Gov Hub is slow, which failed the 22 Nov 2026 production deploy. The Gov Hub
// fetches still cache for 120 s (next.revalidate) and the loader keeps the last good copy in memory.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Version 1.1 open items | Desirable Properties',
  description:
    'Every open proposal for Version 1.1 of The Layered Web, by Desirable Property, including the Version 1.0 proposals reopened for co-editors to decide.',
  openGraph: pageOpenGraph({
    title: 'Version 1.1 open items',
    description: 'Every open proposal for Version 1.1, by Desirable Property. Co-editors decide them.',
    path: '/improve/open-items',
  }),
};

const KIND: Record<string, string> = {
  replace: 'Change',
  insert: 'Insert',
  insert_before: 'Insert',
  insert_after: 'Insert',
  editorial_bundle: 'Style bundle',
  dedup_bundle: 'Duplicate-text bundle',
};

const ANCHOR_NOTE: Record<string, string> = {
  'needs-review': 'Needs re-anchoring: its passage is only in an earlier revision',
  obsolete: 'Passage not found in the current chapter',
};

function snippet(text: string, max = 220): string {
  const flat = (text || '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function shortDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function reviewHref(doc: OpenItemsDoc, item?: OpenItem): string | null {
  const slug = doc.dpId ? dpWorkgroupSlug(doc.dpId) : null;
  if (!slug) return null;
  return `/workgroups/${slug}?tab=review${item ? `&proposal=${encodeURIComponent(item.id)}` : ''}`;
}

function ItemRow({ doc, item, title }: { doc: OpenItemsDoc; item: OpenItem; title: string | null }) {
  const href = padHref(item.id);
  const review = reviewHref(doc, item);
  return (
    <li className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2.5">
      <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span className="rounded border border-amber-600/80 px-1.5 py-0.5 text-amber-200">Open</span>
        {item.marker ? (
          <span className="rounded border border-sky-700/70 px-1.5 py-0.5 text-sky-200">{VERSION_MARKER_LABEL[item.marker]}</span>
        ) : null}
        <span className="rounded border border-slate-700 px-1.5 py-0.5 text-slate-300">{KIND[item.patchMode] || 'Change'}</span>
        {ANCHOR_NOTE[item.applicability] ? (
          <span className="rounded border border-slate-700 px-1.5 py-0.5 text-slate-400">{ANCHOR_NOTE[item.applicability]}</span>
        ) : null}
        <span className="ml-auto shrink-0 text-slate-500">{shortDate(item.createdAt)}</span>
      </span>
      <Link href={href} className="mt-1 block text-sm text-slate-200 hover:text-white">
        {title ? <span className="font-medium text-white">{title}: </span> : null}
        {snippet(item.proposedText || item.rationale) || 'Proposal'}
      </Link>
      <span className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500">
        <span>
          {item.authorName}
          {item.approvals ? ` · ${item.approvals} co-editor ${item.approvals === 1 ? 'approval' : 'approvals'} so far` : ''}
        </span>
        <Link href={href} className="text-cyan-300 hover:text-cyan-200">
          Open pad
        </Link>
        {review ? (
          <Link href={review} className="text-cyan-300 hover:text-cyan-200">
            Review tab
          </Link>
        ) : null}
      </span>
    </li>
  );
}

export default async function OpenItemsPage() {
  const [docs, storedTitle] = await Promise.all([loadOpenItems(), storedTitles()]);
  const withItems = docs.filter((d) => d.items.length);
  const total = withItems.reduce((n, d) => n + d.items.length, 0);
  const reopened = withItems.reduce((n, d) => n + d.items.filter((i) => i.marker === 'reopened_v11').length, 0);
  const missing = docs.filter((d) => !d.loaded);

  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <Link href="/improve" className="text-sm text-cyan-300 hover:text-cyan-200">
        ← Help shape Version 1.1
      </Link>
      <header className="mt-4 border-b border-slate-800 pb-6">
        <p className="text-sm font-medium uppercase tracking-[0.15em] text-sky-300">Version 1.1</p>
        <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">Open items</h1>
        <p className="mt-4 max-w-3xl text-base text-slate-300">
          Every proposal still open on the book, by Desirable Property. Each DP&apos;s co-editors decide its proposals
          through the normal review. Proposals marked <span className="text-sky-200">{VERSION_MARKER_LABEL.reopened_v11}</span>{' '}
          were carried to Version 1.1 by the steering committee on 11 to 12 November 2026 and are open again.
        </p>
        <p className="mt-4 text-sm text-slate-400">
          {total} open {total === 1 ? 'proposal' : 'proposals'} on {withItems.length}{' '}
          {withItems.length === 1 ? 'document' : 'documents'}
          {reopened ? `, ${reopened} of them reopened from Version 1.0` : ''}. Live from Gov Hub.
        </p>
        {missing.length ? (
          <p className="mt-2 text-sm text-amber-200">
            Gov Hub did not answer for {missing.map((d) => d.key).join(', ')}; reload to try again.
          </p>
        ) : null}
      </header>

      {withItems.length ? (
        <div className="mt-8 space-y-8">
          {withItems.map((doc) => (
            <section key={doc.mlNumber} aria-labelledby={`open-${doc.mlNumber}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id={`open-${doc.mlNumber}`} className="text-lg font-semibold text-white">
                  {doc.dpId ? <Link href={dpDetailHref(doc.dpId)} className="hover:text-cyan-200">{doc.label}</Link> : doc.label}
                  <span className="ml-2 text-sm font-normal text-slate-400">{doc.items.length}</span>
                </h2>
                {reviewHref(doc) ? (
                  <Link href={reviewHref(doc) as string} className="text-sm text-cyan-300 hover:text-cyan-200">
                    Review with the co-editors →
                  </Link>
                ) : null}
              </div>
              <ul className="mt-3 space-y-2">
                {doc.items.map((item) => (
                  <ItemRow key={item.id} doc={doc} item={item} title={storedTitle(item.id)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <p className="mt-8 text-slate-300">{missing.length ? 'Open items could not be loaded.' : 'No open proposals right now.'}</p>
      )}
    </main>
  );
}
