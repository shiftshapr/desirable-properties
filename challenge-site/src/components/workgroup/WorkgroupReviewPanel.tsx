'use client';

import { useCallback, useEffect, useState } from 'react';
import DiscussPatchLink from '@/components/DiscussPatchLink';
import ActivityPatchPreview from '@/components/workgroup/ActivityPatchPreview';
import type { ReviewQueueItem, ReviewQueueResponse, ReviewVote } from '@/lib/workgroup-review-types';

type Props = {
  workgroupId: string;
  workgroupSlug: string;
  dpId: string | null;
  canEdit: boolean;
  isMember: boolean;
  signedIn: boolean;
};

export default function WorkgroupReviewPanel({
  workgroupId,
  dpId,
  canEdit,
  isMember,
  signedIn,
}: Props) {
  const [data, setData] = useState<ReviewQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [commentByKey, setCommentByKey] = useState<Record<string, string>>({});
  const [whatChanged, setWhatChanged] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/review`, {
        cache: 'no-store',
      });
      const body = (await res.json()) as ReviewQueueResponse & { error?: string };
      if (!res.ok) throw new Error(body.error || `Review ${res.status}`);
      setData(body);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Review queue');
    } finally {
      setLoading(false);
    }
  }, [workgroupId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function submitEval(item: ReviewQueueItem, vote: ReviewVote) {
    setBusyKey(item.key);
    setNotice(null);
    try {
      const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/review/eval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemKey: item.key,
          vote,
          comment: commentByKey[item.key] || '',
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || 'Could not save evaluation');
      await reload();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Could not save evaluation');
    } finally {
      setBusyKey(null);
    }
  }

  async function pick(item: ReviewQueueItem, action: 'promote' | 'drop') {
    if (!item.govhubProposalId) return;
    setBusyKey(`${action}:${item.key}`);
    setNotice(null);
    try {
      const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/review/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          govhubProposalId: item.govhubProposalId,
          itemKey: item.key,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) throw new Error(body.error || 'Gov Hub update failed');
      setNotice(
        String(
          body.message ||
            (action === 'promote'
              ? 'Promoted into the next revision draft. Not live.'
              : 'Dropped'),
        ),
      );
      await reload();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Gov Hub update failed');
    } finally {
      setBusyKey(null);
    }
  }

  async function publish() {
    setBusyKey('publish');
    setNotice(null);
    try {
      const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/review/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatChanged }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) throw new Error(body.error || 'Publish failed');
      setNotice(String(body.message || 'Revision is now live'));
      setWhatChanged('');
      await reload();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : 'Publish failed');
    } finally {
      setBusyKey(null);
    }
  }

  const items = data?.items || [];
  const working = data?.workingRevision;
  const hasComposedDraft = Boolean(working?.exists && (working?.appliedCount || 0) > 0);

  return (
    <div className="space-y-5">
      <header className="space-y-2 border-b border-slate-800 pb-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-400">Review</p>
        <h2 className="text-xl font-semibold text-white">
          Passage queue{dpId ? ` · ${dpId}` : ''}
        </h2>
        <p className="max-w-3xl text-sm text-slate-400">
          Book Discuss (PATCH/INSERT) and Gov Hub draft patches for this chapter. Members say yes
          or no and may comment. Those evals stay on the workgroup.
        </p>
        <ol className="max-w-3xl list-decimal space-y-1 pl-5 text-sm text-slate-300">
          <li>
            <strong className="font-semibold text-white">Promote to revision</strong> (or drop /
            leave pending): compose the next revision draft. That does not go live.
          </li>
          <li>
            <strong className="font-semibold text-white">Publish revision</strong>: a later, separate
            release. Only then does the draft become the live book / official text.
          </li>
        </ol>
      </header>

      {canEdit && hasComposedDraft ? (
        <section className="rounded-xl border border-violet-800/50 bg-violet-950/20 p-4">
          <h3 className="text-sm font-semibold text-violet-100">Publish revision</h3>
          <p className="mt-1 text-sm text-slate-300">
            Revision draft {working?.revisionNumber || ''} has {working?.appliedCount} promoted
            proposal{working?.appliedCount === 1 ? '' : 's'}. Publishing is the release step: it
            makes that draft the live Gov Hub / book text. Promoting a proposal is not publish.
          </p>
          <label className="mt-3 block text-sm text-slate-300">
            Release note (optional)
            <input
              value={whatChanged}
              onChange={(event) => setWhatChanged(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
              placeholder="Why this revision goes live now"
            />
          </label>
          <button
            type="button"
            disabled={!working?.canPublish || busyKey === 'publish'}
            onClick={() => void publish()}
            className="mt-3 rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
          >
            {busyKey === 'publish' ? 'Publishing…' : 'Publish revision'}
          </button>
        </section>
      ) : canEdit ? (
        <p className="text-sm text-slate-500">
          Publish revision appears after at least one proposal is promoted into a revision draft.
        </p>
      ) : null}

      {notice ? (
        <p className="rounded-lg border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm text-slate-200">
          {notice}
        </p>
      ) : null}
      {loading ? <p className="text-sm text-slate-400">Loading Review queue…</p> : null}
      {error ? (
        <p className="rounded-lg border border-rose-900/50 bg-rose-950/20 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <p className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-5 text-sm text-slate-300">
          No book Discuss patches or Gov Hub draft patches in queue for this chapter yet. Propose
          PATCH/INSERT on the book, or file a Gov Hub draft patch, then return here.
        </p>
      ) : null}

      <ul className="space-y-4">
        {items.map((item) => (
          <li
            key={item.key}
            className="rounded-xl border border-slate-800 bg-slate-950/40 p-4"
          >
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide">
              {item.sources.map((source) => (
                <span
                  key={source}
                  className="rounded border border-slate-700 px-1.5 py-0.5 text-slate-300"
                >
                  {source === 'govhub' ? 'Gov Hub' : 'Book Discuss'}
                </span>
              ))}
              <span className="rounded border border-cyan-800/60 px-1.5 py-0.5 text-cyan-200">
                {item.patchMode}
              </span>
              {item.conflictCount > 1 ? (
                <span className="rounded border border-amber-800/60 px-1.5 py-0.5 text-amber-200">
                  Conflict set · {item.conflictCount}
                </span>
              ) : null}
              <span className="text-slate-500">{item.status}</span>
            </div>
            <p className="mt-2 text-sm text-slate-200">
              {item.authorName} · member evals: yes {item.evals.yes} / no {item.evals.no}
            </p>
            <ActivityPatchPreview
              removed={item.originalText || null}
              added={item.proposedText || null}
              mode={item.patchMode === 'insert' ? 'insert' : 'patch'}
            />
            {item.rationale ? (
              <p className="mt-2 text-sm text-slate-400">{item.rationale}</p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {item.hrefs.book ? (
                <DiscussPatchLink href={item.hrefs.book} className="text-cyan-300 hover:text-cyan-200">
                  Open on book Discuss
                </DiscussPatchLink>
              ) : null}
              {item.hrefs.govhub ? (
                <a
                  href={item.hrefs.govhub}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-300 hover:text-cyan-200"
                >
                  Open Gov Hub draft
                </a>
              ) : null}
            </div>

            {item.evals.comments.length ? (
              <ul className="mt-3 space-y-1 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-400">
                {item.evals.comments.map((row) => (
                  <li key={`${row.userId}-${row.updatedAt}`}>
                    <span className="text-slate-200">{row.userName}</span> ({row.vote}): {row.comment}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-slate-500">No member comments yet.</p>
            )}

            {signedIn && isMember ? (
              <div className="mt-4 space-y-2">
                <textarea
                  value={commentByKey[item.key] || ''}
                  onChange={(event) =>
                    setCommentByKey((prev) => ({ ...prev, [item.key]: event.target.value }))
                  }
                  rows={2}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                  placeholder="Optional member comment (workgroup only)"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busyKey === item.key}
                    onClick={() => void submitEval(item, 'yes')}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                      item.evals.mine === 'yes'
                        ? 'border-emerald-600 bg-emerald-950/40 text-emerald-100'
                        : 'border-slate-700 text-slate-200 hover:border-emerald-700'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    disabled={busyKey === item.key}
                    onClick={() => void submitEval(item, 'no')}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                      item.evals.mine === 'no'
                        ? 'border-rose-600 bg-rose-950/40 text-rose-100'
                        : 'border-slate-700 text-slate-200 hover:border-rose-700'
                    }`}
                  >
                    No
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-500">
                Join this workgroup to evaluate items. Evaluations stay on the workgroup; they are
                not a public book downvote.
              </p>
            )}

            {canEdit ? (
              <div className="mt-4 space-y-2 border-t border-slate-800 pt-3">
                <p className="text-xs text-slate-500">
                  Promote composes the next revision draft. It does not go live. Leave pending by
                  doing nothing.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!item.canPromote || Boolean(busyKey)}
                    onClick={() => void pick(item, 'promote')}
                    className="rounded-lg bg-cyan-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
                  >
                    Promote to revision
                  </button>
                  <button
                    type="button"
                    disabled={!item.govhubProposalId || item.status !== 'pending' || Boolean(busyKey)}
                    onClick={() => void pick(item, 'drop')}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-rose-700 disabled:opacity-50"
                  >
                    Drop
                  </button>
                </div>
                {item.promoteBlockReason ? (
                  <p className="text-xs text-amber-200">{item.promoteBlockReason}</p>
                ) : null}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
