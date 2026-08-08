'use client';

import { useEffect, useMemo, useState } from 'react';
import ActivityPatchPreview from '@/components/workgroup/ActivityPatchPreview';
import {
  isActivityCommentOrPatch,
  type ActivityFeedItem,
} from '@/lib/activity-feed';
import { formatActivityDate } from '@/lib/govhub';

type FilterMode = 'all' | 'comments_patches';

type Props = {
  workgroupSlug: string;
  dpId?: string | null;
  initialItems?: ActivityFeedItem[];
};

function badgeClass(badge: string): string {
  const b = badge.toLowerCase();
  if (b === 'patch') return 'border-amber-800/60 bg-amber-950/40 text-amber-200';
  if (b === 'insert') return 'border-violet-800/60 bg-violet-950/40 text-violet-200';
  return 'border-slate-700 bg-slate-900 text-slate-300';
}

function sourceLabel(item: ActivityFeedItem): string {
  if (item.source === 'canopi') return 'Canopi';
  if (item.kind === 'govhub_proposal') return 'Gov Hub patch';
  if (item.kind.startsWith('workgroup_')) return 'Workgroup';
  return 'Gov Hub';
}

export default function WorkgroupActivityFeed({
  workgroupSlug,
  dpId,
  initialItems = [],
}: Props) {
  const [items, setItems] = useState<ActivityFeedItem[]>(initialItems);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [loading, setLoading] = useState(initialItems.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/workgroups/by-slug/${encodeURIComponent(workgroupSlug)}/activity`,
          { cache: 'no-store' },
        );
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error || `Activity ${res.status}`);
        }
        const data = (await res.json()) as { items?: ActivityFeedItem[] };
        if (!cancelled) {
          setItems(data.items || []);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load activity');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workgroupSlug]);

  const visible = useMemo(() => {
    if (filter === 'comments_patches') {
      return items.filter((item) => isActivityCommentOrPatch(item));
    }
    return items;
  }, [items, filter]);

  const commentsPatchesCount = useMemo(
    () => items.filter((item) => isActivityCommentOrPatch(item)).length,
    [items],
  );

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">
            {dpId ? `${dpId} activity` : 'Workgroup activity'}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-400">
            Workgroup chat on this page, Gov Hub draft patches, plus Canopi discuss on this
            DP&apos;s book chapter. Comments &amp; patches filters to discuss posts, draft
            proposals, and chat – hides joins, leaves, and invites.
          </p>
        </div>
        <div
          className="inline-flex shrink-0 rounded-lg border border-slate-700 bg-slate-950/60 p-0.5 text-sm"
          role="group"
          aria-label="Activity filter"
        >
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-md px-3 py-1.5 ${
              filter === 'all'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('comments_patches')}
            className={`rounded-md px-3 py-1.5 ${
              filter === 'comments_patches'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Comments &amp; patches ({commentsPatchesCount})
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-5 text-sm text-slate-500">Loading activity…</p>
      ) : error ? (
        <p className="mt-5 text-sm text-rose-300">{error}</p>
      ) : visible.length === 0 ? (
        <p className="mt-5 text-sm text-slate-400">
          {filter === 'comments_patches'
            ? 'No comments or patches yet for this DP. Switch to All to see invites and membership events.'
            : 'No activity yet for this DP. Chat, invites, draft patches, and book discuss posts will show up here.'}
        </p>
      ) : (
        <ul className="mt-5 divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/40">
          {visible.map((item) => (
            <li key={item.id} className="px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <p className="text-slate-200">
                  {item.badge ? (
                    <span
                      className={`mr-2 inline-flex rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${badgeClass(item.badge)}`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                  <a href={item.href} className="hover:text-cyan-300">
                    {item.text}
                  </a>
                </p>
                <div className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                  <span className="rounded border border-slate-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                    {sourceLabel(item)}
                  </span>
                  {item.resolved ? (
                    <span className="text-emerald-500/90">Resolved</span>
                  ) : null}
                  <time>{formatActivityDate(item.createdAt)}</time>
                </div>
              </div>
              {item.diff ? (
                <ActivityPatchPreview
                  removed={item.diff.removed}
                  added={item.diff.added}
                  mode={item.diff.mode}
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
