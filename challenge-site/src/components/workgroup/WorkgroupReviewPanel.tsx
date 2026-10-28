'use client';

import { useCallback, useEffect, useState } from 'react';
import DiscussPatchLink from '@/components/DiscussPatchLink';
import ActivityPatchPreview from '@/components/workgroup/ActivityPatchPreview';
import ReviewCommentsSection from '@/components/workgroup/ReviewCommentsSection';
import PrepublishCheck from '@/components/workgroup/PrepublishCheck';
import ReviewAskDeepi from '@/components/workgroup/ReviewAskDeepi';
import ReviewReviseForm from '@/components/workgroup/ReviewReviseForm';
import WorkingRevisionEmail from '@/components/workgroup/WorkingRevisionEmail';
import type {
  ReviewQueueItem,
  ReviewQueueResponse,
  ReviewStyleCheck,
  ReviewVote,
} from '@/lib/workgroup-review-types';
import { STYLE_GUIDE, STYLE_GUIDE_VERSION } from '@/data/dp-style-guide';

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
  /** Co-editor decision note per item: optional to approve, required to decline. */
  const [noteByKey, setNoteByKey] = useState<Record<string, string>>({});
  const [whatChanged, setWhatChanged] = useState('');
  /** The pre-publish check has read the current working revision (required to publish when Claude is on). */
  const [checkCurrent, setCheckCurrent] = useState(false);
  /** The item whose Revise form is open (co-editors only). */
  const [revisingKey, setRevisingKey] = useState<string | null>(null);
  /** Set when Revise was opened from Claude's anchor flag, so the form starts at the suggested passage. */
  const [moveKey, setMoveKey] = useState<string | null>(null);
  /** Declined proposals start collapsed; these are the ones opened with the chevron. */
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(() => new Set());
  const toggleExpanded = (key: string) =>
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const [notice, setNotice] = useState<string | null>(null);
  /** Result of the last Approve/Decline on an item, shown next to it. */
  const [resultByKey, setResultByKey] = useState<Record<string, { ok: boolean; text: string }>>({});
  /** Style checks fetched this session, keyed by item; 'pending' while running, string on error. */
  const [styleByKey, setStyleByKey] = useState<Record<string, ReviewStyleCheck | 'pending' | { error: string }>>({});

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

  // Check up to 8 unchecked pending items, one at a time, when a member opens the tab.
  useEffect(() => {
    if (!data?.isMember || !data.styleCheckEnabled) return;
    const todo = data.items.filter((i) => i.styleCheckable && !i.styleCheck).slice(0, 8);
    if (!todo.length) return;
    let cancelled = false;
    (async () => {
      for (const item of todo) {
        if (cancelled) return;
        await runStyleCheckFor(item.key, () => cancelled);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  async function runStyleCheckFor(itemKey: string, isCancelled: () => boolean = () => false) {
    setStyleByKey((prev) => ({ ...prev, [itemKey]: 'pending' }));
    try {
      const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/review/style-check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemKey }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        check?: { id: string; createdAt: string; model: string | null; helpful: boolean | null; result: Omit<ReviewStyleCheck, 'id' | 'createdAt' | 'model' | 'helpful'> };
      };
      if (isCancelled()) return;
      if (!res.ok || !body.check?.result) throw new Error(body.error || 'Style check failed');
      const { id, createdAt, model, helpful, result } = body.check;
      setStyleByKey((prev) => ({ ...prev, [itemKey]: { id, createdAt, model, helpful, ...result } }));
    } catch (err) {
      if (!isCancelled()) {
        setStyleByKey((prev) => ({ ...prev, [itemKey]: { error: err instanceof Error ? err.message : 'Style check failed' } }));
      }
    }
  }

  async function rateStyle(itemKey: string, check: ReviewStyleCheck, helpful: boolean) {
    setStyleByKey((prev) => ({ ...prev, [itemKey]: { ...check, helpful } }));
    await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/review/style-check/rate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkId: check.id, helpful }),
    }).catch(() => undefined);
  }

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
    const note = (noteByKey[item.key] || '').trim();
    if (action === 'drop' && !note) return;
    setBusyKey(`${action}:${item.key}`);
    setNotice(null);
    setResultByKey((prev) => ({ ...prev, [item.key]: { ok: true, text: '' } }));
    try {
      const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/review/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          govhubProposalId: item.govhubProposalId,
          itemKey: item.key,
          note,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) throw new Error(body.error || 'Gov Hub update failed');
      const text = String(
        body.message ||
          (action === 'promote'
            ? 'Approved. It goes into the next revision draft once every co-editor approves. Not live.'
            : 'Declined. The author can read your note.'),
      );
      setResultByKey((prev) => ({ ...prev, [item.key]: { ok: true, text } }));
      setNoteByKey((prev) => ({ ...prev, [item.key]: '' }));
      await reload();
    } catch (err) {
      const text = err instanceof Error ? err.message : 'Gov Hub update failed';
      setResultByKey((prev) => ({ ...prev, [item.key]: { ok: false, text } }));
    } finally {
      setBusyKey(null);
    }
  }

  /** A co-editor keeps the proposal where it is: Claude's anchor flag is dismissed. */
  async function keepAnchor(item: ReviewQueueItem) {
    setBusyKey(item.key);
    try {
      const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/review/anchor-dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ govhubProposalId: item.govhubProposalId }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error || `Failed (${res.status})`);
      await reload();
    } catch (err) {
      setResultByKey((m) => ({ ...m, [item.key]: { ok: false, text: err instanceof Error ? err.message : 'Failed' } }));
    } finally {
      setBusyKey(null);
    }
  }

  async function withdraw(item: ReviewQueueItem) {
    if (!item.govhubProposalId) return;
    const note = (noteByKey[`withdraw:${item.key}`] || '').trim();
    setBusyKey(`withdraw:${item.key}`);
    setNotice(null);
    try {
      const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/review/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ govhubProposalId: item.govhubProposalId, note }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) throw new Error(body.error || 'Gov Hub update failed');
      setNotice(String(body.message || 'Proposal withdrawn.'));
      await reload();
    } catch (err) {
      setNotice(`Withdraw failed: ${err instanceof Error ? err.message : 'Gov Hub update failed'}`);
    } finally {
      setBusyKey(null);
    }
  }

  async function publish(skipCheck = false) {
    setBusyKey('publish');
    setNotice(null);
    try {
      const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/review/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatChanged, skipCheck }),
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
  const counts = reviewCounts(items);
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
            <strong className="font-semibold text-white">Approve or decline</strong>: co-editors
            decide. A proposal goes into the next revision draft when all of the DP&apos;s co-editors approve it.
            Declining needs a note the author can read. Nothing goes live yet.
          </li>
          <li>
            <strong className="font-semibold text-white">Publish revision</strong>: a later, separate
            release. Only then does the draft become the live book / official text.
          </li>
        </ol>
        <p className="max-w-3xl text-sm text-slate-400">
          Proposals are read against the{' '}
          <a href="/style-guide" target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline hover:text-cyan-200">
            DP style guide
          </a>{' '}
          (v{STYLE_GUIDE_VERSION}). Co-editors: see{' '}
          <a href="/style-guide#co-editors" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-300">
            the guide&apos;s notes for co-editors
          </a>
          .
        </p>
      </header>

      {!canEdit && isMember && hasComposedDraft ? (
        <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
          <h3 className="text-sm font-semibold text-white">Working revision</h3>
          <p className="mt-1 text-sm text-slate-300">
            {working?.appliedCount} approved change{working?.appliedCount === 1 ? '' : 's'} merged in, not yet
            published.
          </p>
          <div className="mt-2">
            <WorkingRevisionEmail workgroupId={workgroupId} canEmailWorkgroup={false} />
          </div>
        </section>
      ) : null}

      {canEdit && hasComposedDraft ? (
        <section className="rounded-xl border border-violet-800/50 bg-violet-950/20 p-4">
          <h3 className="text-sm font-semibold text-violet-100">Publish revision</h3>
          <p className="mt-1 text-sm text-slate-300">
            Revision draft {working?.revisionNumber || ''} has {working?.appliedCount} promoted
            proposal{working?.appliedCount === 1 ? '' : 's'}. Publishing is the release step: it
            makes that draft the live Gov Hub / book text. Promoting a proposal is not publish.
          </p>
          <div className="mt-2">
            <WorkingRevisionEmail workgroupId={workgroupId} canEmailWorkgroup />
          </div>
          {data?.askEnabled ? (
            <PrepublishCheck workgroupId={workgroupId} onCurrent={setCheckCurrent} onEdited={() => void reload()} />
          ) : null}
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
            disabled={!working?.canPublish || busyKey === 'publish' || (Boolean(data?.askEnabled) && !checkCurrent)}
            title={data?.askEnabled && !checkCurrent ? 'Run the pre-publish check first' : undefined}
            onClick={() => void publish()}
            className="mt-3 rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-600 disabled:opacity-50"
          >
            {busyKey === 'publish' ? 'Publishing…' : 'Publish revision'}
          </button>
          {data?.askEnabled && !checkCurrent ? (
            <p className="mt-2 text-xs text-slate-400">
              Run the pre-publish check first.{' '}
              <button
                type="button"
                disabled={!working?.canPublish || busyKey === 'publish'}
                onClick={() => {
                  if (window.confirm('Publish without the pre-publish check?')) void publish(true);
                }}
                className="text-slate-500 underline hover:text-slate-300"
              >
                Publish without it
              </button>
            </p>
          ) : null}
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

      <ReviewCommentsSection
        workgroupId={workgroupId}
        canAct={Boolean(signedIn && isMember)}
        onFiled={() => void reload()}
      />

      {!loading && !error && items.length === 0 ? (
        <p className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-5 text-sm text-slate-300">
          No book Discuss patches or Gov Hub draft patches in queue for this chapter yet. Propose
          PATCH/INSERT on the book, or file a Gov Hub draft patch, then return here.
        </p>
      ) : null}

      {items.length ? <ReviewSummary counts={counts} /> : null}

      <ul className="space-y-4">
        {/* Closed proposals (declined, considered, orphaned) go last, collapsed; the order is otherwise the queue's. */}
        {[...items].sort((a, b) => Number(isClosed(a)) - Number(isClosed(b))).map((item) => {
          const declined = isClosed(item);
          const open = !declined || expandedKeys.has(item.key);
          return (
          <li
            key={item.key}
            className={`rounded-xl border border-slate-800 p-4 ${declined ? 'bg-slate-950/20' : 'bg-slate-950/40'}`}
          >
            {declined ? (
              <button
                type="button"
                aria-expanded={open}
                onClick={() => toggleExpanded(item.key)}
                className="flex w-full items-start gap-2 text-left"
              >
                <span
                  aria-hidden
                  className={`mt-0.5 inline-block text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}
                >
                  ›
                </span>
                <span className="min-w-0 flex-1 text-sm">
                  <span className={isDeclined(item) ? 'text-rose-200' : 'text-slate-300'}>
                    {CLOSED_LABEL[String(item.status).toLowerCase()] || item.status}
                  </span>
                  <span className="text-slate-400"> · {item.authorName} · {kindLabel(item)}</span>
                  {!open ? (
                    <span className="mt-1 block truncate text-slate-500">
                      {item.decision?.note ? `Note: ${item.decision.note}` : snippet(item.proposedText)}
                    </span>
                  ) : null}
                </span>
              </button>
            ) : null}
            {open ? (
            <>
            <div className={`flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide ${declined ? 'mt-3' : ''}`}>
              {item.sources.map((source) => (
                <span
                  key={source}
                  className="rounded border border-slate-700 px-1.5 py-0.5 text-slate-300"
                >
                  {source === 'govhub' ? 'Gov Hub' : 'Book Discuss'}
                </span>
              ))}
              <span className="rounded border border-cyan-800/60 px-1.5 py-0.5 text-cyan-200">
                {kindLabel(item)}
              </span>
              {item.conflictCount > 1 ? (
                <span className="rounded border border-amber-800/60 px-1.5 py-0.5 text-amber-200">
                  Conflict set · {item.conflictCount}
                </span>
              ) : null}
              <span className="text-slate-500">
                {item.status === 'canopi_only'
                  ? 'Canopi only'
                  : item.status === 'filed_elsewhere'
                    ? 'Filed in another chapter'
                    : item.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-200">
              {item.authorName}
              {item.revisedBy ? <span className="text-violet-200"> · revised by {item.revisedBy}</span> : null} · member
              evals: yes {item.evals.yes} / no {item.evals.no}
            </p>
            {item.patchMode === 'bundle' ? (
              <StylePassEdits item={item} />
            ) : item.patchMode === 'dedup' ? (
              <DedupEdits item={item} />
            ) : (
              <ActivityPatchPreview
                removed={item.originalText || null}
                added={item.proposedText || null}
                mode={item.patchMode === 'insert' ? 'insert' : 'patch'}
                insertPosition={item.insertPosition}
              />
            )}
            {item.rationale ? (
              <p className="mt-2 whitespace-pre-line text-sm text-slate-400">
                <span className="text-slate-500">Rationale: </span>
                {item.rationale}
              </p>
            ) : null}
            {item.styleCheckable ? (
              <StyleNotes
                state={styleByKey[item.key] ?? item.styleCheck}
                canAct={Boolean(signedIn && isMember)}
                onRun={() => void runStyleCheckFor(item.key)}
                onRate={(check, helpful) => void rateStyle(item.key, check, helpful)}
              />
            ) : null}
            {item.anchorEval && item.status === 'pending' ? (
              <AnchorFlag
                item={item}
                canAct={Boolean(data?.isCoEditor) && !busyKey}
                onMove={() => {
                  setMoveKey(item.key);
                  setRevisingKey(item.key);
                }}
                onKeep={() => void keepAnchor(item)}
              />
            ) : null}
            {data?.askEnabled && signedIn && (isMember || data.isCoEditor) ? (
              <ReviewAskDeepi workgroupId={workgroupId} itemKey={item.key} />
            ) : null}
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {item.hrefs.book ? (
                <DiscussPatchLink href={item.hrefs.book} className="text-cyan-300 hover:text-cyan-200">
                  Open on book Discuss
                </DiscussPatchLink>
              ) : null}
{/* Gov Hub buttons hidden for now (owner, 2026-10-19: people find them confusing).
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
*/}
            </div>

            <Decisions
              item={item}
              viewerGovhubUserId={data?.viewerGovhubUserId || null}
              needed={data?.approvalsNeeded || 2}
            />

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

            {item.status === 'pending' &&
            item.govhubProposalId &&
            item.patchMode !== 'bundle' &&
            item.patchMode !== 'dedup' &&
            data?.viewerGovhubUserId &&
            item.authorGovhubUserId === data.viewerGovhubUserId ? (
              <div className="mt-4 space-y-2 border-t border-slate-800 pt-3">
                <p className="text-xs text-slate-500">
                  This is your proposal. You can withdraw it while it is pending; it closes without a co-editor decision.
                </p>
                <label className="block text-xs text-slate-400">
                  Why (optional, shown with the proposal)
                  <input
                    value={noteByKey[`withdraw:${item.key}`] || ''}
                    onChange={(event) =>
                      setNoteByKey((prev) => ({ ...prev, [`withdraw:${item.key}`]: event.target.value }))
                    }
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                    placeholder="For example: folded into the dedup bundle"
                  />
                </label>
                <button
                  type="button"
                  disabled={Boolean(busyKey)}
                  onClick={() => void withdraw(item)}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-amber-600 disabled:opacity-50"
                >
                  {busyKey === `withdraw:${item.key}` ? 'Withdrawing…' : 'Withdraw my proposal'}
                </button>
              </div>
            ) : null}

            {data?.isCoEditor ? (
              <div className="mt-4 space-y-2 border-t border-slate-800 pt-3">
                <p className="text-xs text-slate-500">
                  Both co-editors must approve before a proposal goes into the next revision draft
                  (not live). Decide within 7 days of filing.
                </p>
                <label className="block text-xs text-slate-400">
                  Decision note{' '}
                  <span className="text-slate-500">
                    (required to decline; the author sees it ·{' '}
                    <a href="/style-guide#co-editors" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-300">
                      style guide
                    </a>
                    )
                  </span>
                  <textarea
                    value={noteByKey[item.key] || ''}
                    onChange={(event) =>
                      setNoteByKey((prev) => ({ ...prev, [item.key]: event.target.value }))
                    }
                    rows={2}
                    className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                    placeholder="Why this decision?"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  {(() => {
                    const mine = Boolean(
                      data?.viewerGovhubUserId && item.approvals.some((a) => a.userId === data.viewerGovhubUserId),
                    );
                    return (
                      <button
                        type="button"
                        disabled={mine || !item.canPromote || Boolean(busyKey)}
                        title={mine ? 'You approved this proposal' : undefined}
                        onClick={() => void pick(item, 'promote')}
                        className="rounded-lg bg-cyan-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
                      >
                        {mine ? 'Approved by you' : busyKey === `promote:${item.key}` ? 'Approving…' : 'Approve'}
                      </button>
                    );
                  })()}
                  <button
                    type="button"
                    disabled={
                      !item.govhubProposalId ||
                      item.status !== 'pending' ||
                      !(noteByKey[item.key] || '').trim() ||
                      Boolean(busyKey)
                    }
                    title={(noteByKey[item.key] || '').trim() ? undefined : 'Write a decision note first'}
                    onClick={() => void pick(item, 'drop')}
                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-rose-700 disabled:opacity-50"
                  >
                    Decline
                  </button>
                  {item.govhubProposalId && item.status === 'pending' && item.patchMode !== 'bundle' && item.patchMode !== 'dedup' ? (
                    <button
                      type="button"
                      disabled={Boolean(busyKey)}
                      aria-expanded={revisingKey === item.key}
                      onClick={() => {
                        setMoveKey(null);
                        setRevisingKey(revisingKey === item.key ? null : item.key);
                      }}
                      className="rounded-lg border border-violet-800/70 px-3 py-1.5 text-sm text-violet-100 hover:border-violet-500 disabled:opacity-50"
                    >
                      Revise
                    </button>
                  ) : null}
                </div>
                {revisingKey === item.key ? (
                  <ReviewReviseForm
                    workgroupId={workgroupId}
                    item={item}
                    suggestion={moveKey === item.key ? item.anchorEval : null}
                    onCancel={() => setRevisingKey(null)}
                    onDone={(message) => {
                      setRevisingKey(null);
                      setNotice(message);
                      void reload();
                    }}
                  />
                ) : null}
                {resultByKey[item.key]?.text ? (
                  <p
                    role="status"
                    className={`text-sm ${resultByKey[item.key].ok ? 'text-emerald-200' : 'text-rose-200'}`}
                  >
                    {resultByKey[item.key].text}
                  </p>
                ) : null}
                {item.promoteBlockReason ? (
                  <p className="text-xs text-amber-200">{item.promoteBlockReason}</p>
                ) : null}
              </div>
            ) : signedIn && item.status === 'pending' && item.govhubProposalId ? (
              <p className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-500">
                Only this DP&apos;s co-editors approve or decline proposals. Claim an open seat at the top of the
                workgroup page.
              </p>
            ) : null}
            </>
            ) : null}
          </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Who approved (visible to everyone), or the recorded decision once the proposal is closed. */
function Decisions({
  item,
  viewerGovhubUserId,
  needed,
}: {
  item: ReviewQueueItem;
  viewerGovhubUserId: string | null;
  needed: number;
}) {
  if (item.approvals.length) {
    return (
      <div className="mt-3 rounded-lg border border-emerald-900/50 bg-emerald-950/20 px-3 py-2 text-sm">
        <p className="text-emerald-200">
          Approved by{' '}
          {item.approvals
            .map((a) => (a.userId === viewerGovhubUserId ? `${a.userName} (you)` : a.userName))
            .join(' and ')}{' '}
          · {item.approvals.length} of {needed} co-editor approvals
        </p>
        {item.approvals
          .filter((a) => a.note)
          .map((a) => (
            <p key={a.userId} className="mt-1 text-slate-300">
              <span className="text-slate-400">{a.userName}:</span> {a.note}
            </p>
          ))}
      </div>
    );
  }
  if (item.decision && (item.decision.by || item.decision.note)) {
    return (
      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300">
        <span className="capitalize text-slate-200">{item.status}</span>
        {item.decision.by ? <> by {item.decision.by}</> : null}
        {item.decision.note ? <>: {item.decision.note}</> : null}
      </div>
    );
  }
  return null;
}

const STYLE_RULE_LABELS: Record<string, string> = {
  non_normative_label: '“(Non-Normative)” label removed',
  meta_layer_case: 'Meta-Layer',
  en_dash: 'en dash',
  section_ref: '§ → Section',
};

/** Claude's anchor evaluation found a better place; co-editors move it (via Revise) or keep it. */
function AnchorFlag({
  item,
  canAct,
  onMove,
  onKeep,
}: {
  item: ReviewQueueItem;
  canAct: boolean;
  onMove: () => void;
  onKeep: () => void;
}) {
  const flag = item.anchorEval!;
  return (
    <div className="mt-3 rounded-lg border border-amber-800/60 bg-amber-950/20 px-3 py-2 text-sm">
      <p className="font-medium text-amber-100">Claude suggests a better place for this</p>
      <p className="mt-1 text-slate-300">{flag.reason}</p>
      <p className="mt-2 text-xs text-slate-400">
        Suggested: {flag.suggestedMode === 'insert' ? 'above' : 'below'} “{snippet(flag.suggestedPassage.replace(/^#{1,6}\s+/, ''), 180)}”
      </p>
      {canAct ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onMove}
            className="rounded-lg border border-amber-700 px-3 py-1 text-sm text-amber-100 hover:border-amber-400"
          >
            Move to suggested passage
          </button>
          <button
            type="button"
            onClick={onKeep}
            className="rounded-lg px-3 py-1 text-sm text-slate-400 hover:text-slate-200"
          >
            Keep it where it is
          </button>
        </div>
      ) : (
        <p className="mt-1 text-xs text-slate-500">Co-editors decide whether to move it.</p>
      )}
    </div>
  );
}

function kindLabel(item: ReviewQueueItem): string {
  if (item.patchMode === 'bundle') return 'style pass';
  if (item.patchMode === 'dedup') return 'dedup';
  return item.patchMode;
}

/** A dedup bundle: deletions and merges grouped by finding, each with its reason. All or nothing. */
function DedupEdits({ item }: { item: ReviewQueueItem }) {
  const groups: Array<{ finding: string; edits: ReviewQueueItem['edits'] }> = [];
  for (const edit of item.edits) {
    const finding = edit.rule || 'Other';
    const last = groups[groups.length - 1];
    if (last && last.finding === finding) last.edits.push(edit);
    else groups.push({ finding, edits: [edit] });
  }
  return (
    <div className="mt-3 space-y-3 text-sm">
      <p className="text-slate-300">
        {item.originalText} Approving applies every edit below together. If the chapter has changed under any of
        them, nothing is applied.
      </p>
      {groups.map((group, g) => (
        <section key={g} className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
          <h4 className="text-xs uppercase tracking-wide text-slate-400">{group.finding}</h4>
          <ol className="mt-2 space-y-3">
            {group.edits.map((edit, i) => (
              <li key={i} className="space-y-1">
                {edit.note ? <p className="text-slate-300">{edit.note}</p> : null}
                <p className="whitespace-pre-wrap rounded bg-rose-950/30 px-2 py-1 text-rose-100">
                  <span className="mr-1 text-rose-300">{edit.proposedText.trim() ? '−' : 'Delete'}</span>
                  <span className={edit.proposedText.trim() ? '' : 'line-through decoration-rose-400/70'}>
                    {edit.originalText}
                  </span>
                </p>
                {edit.proposedText.trim() ? (
                  <p className="whitespace-pre-wrap rounded bg-emerald-950/30 px-2 py-1 text-emerald-100">
                    <span className="mr-1 text-emerald-300">+</span>
                    {edit.proposedText}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

/** A style-pass bundle: every line edit, before and after, approved together. */
function StylePassEdits({ item }: { item: ReviewQueueItem }) {
  return (
    <div className="mt-3 space-y-2">
      <p className="text-sm text-slate-300">
        {item.originalText}{' '}
        <a href="/style-guide" target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline hover:text-cyan-200">
          Style guide
        </a>
      </p>
      <details className="rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm">
        <summary className="cursor-pointer text-slate-200">
          Show all {item.edits.length} line edit{item.edits.length === 1 ? '' : 's'}
        </summary>
        <ol className="mt-3 space-y-3">
          {item.edits.map((edit, i) => (
            <li key={i} className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                {(edit.rule || '')
                  .split(',')
                  .filter(Boolean)
                  .map((r) => STYLE_RULE_LABELS[r] || r)
                  .join(' · ')}
              </p>
              <p className="rounded bg-rose-950/30 px-2 py-1 text-rose-100">
                <span className="mr-1 text-rose-300">−</span>
                {edit.originalText}
              </p>
              <p className="rounded bg-emerald-950/30 px-2 py-1 text-emerald-100">
                <span className="mr-1 text-emerald-300">+</span>
                {edit.proposedText}
              </p>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}

const SECTION_TITLES: Record<string, string> = Object.fromEntries(STYLE_GUIDE.map((sec) => [sec.id, sec.title]));

/** AI style notes on a proposal, for co-editors. Advisory: co-editors decide. */
function StyleNotes({
  state,
  canAct,
  onRun,
  onRate,
}: {
  state: ReviewStyleCheck | 'pending' | { error: string } | null | undefined;
  canAct: boolean;
  onRun: () => void;
  onRate: (check: ReviewStyleCheck, helpful: boolean) => void;
}) {
  if (!state) {
    return canAct ? (
      <button type="button" onClick={onRun} className="mt-3 text-xs text-cyan-300 underline hover:text-cyan-200">
        Check against the style guide
      </button>
    ) : null;
  }
  if (state === 'pending') {
    return <p className="mt-3 text-xs text-slate-500">Checking against the style guide…</p>;
  }
  if ('error' in state) {
    return (
      <p className="mt-3 text-xs text-slate-500">
        Style check unavailable ({state.error}).{' '}
        {canAct ? (
          <button type="button" onClick={onRun} className="underline hover:text-slate-300">
            Try again
          </button>
        ) : null}
      </p>
    );
  }
  const check = state;
  return (
    <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm">
      <p className="text-xs uppercase tracking-wide text-slate-500">
        Style notes · AI, advisory{check.model ? ` · ${check.model}` : ''}
      </p>
      <p className={`mt-1 ${check.verdict === 'ok' ? 'text-emerald-200' : 'text-slate-200'}`}>{check.summary}</p>
      {check.notes.length ? (
        <ul className="mt-2 space-y-1.5">
          {check.notes.map((n, i) => (
            <li key={i} className="text-slate-300">
              <a
                href={`/style-guide#${n.section}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mr-1 text-xs text-cyan-300 underline hover:text-cyan-200"
              >
                {SECTION_TITLES[n.section] || n.section}
              </a>
              {n.issue} <span className="text-slate-400">→ {n.fix}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {check.suggestedText ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-slate-400">Suggested wording</summary>
          <p className="mt-1 whitespace-pre-wrap rounded bg-emerald-950/30 px-2 py-1 text-emerald-100">
            {check.suggestedText}
          </p>
        </details>
      ) : null}
      {canAct ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          Were these notes helpful?
          <button
            type="button"
            onClick={() => onRate(check, true)}
            className={`rounded border px-2 py-0.5 ${check.helpful === true ? 'border-emerald-600 text-emerald-200' : 'border-slate-700 hover:border-emerald-700'}`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onRate(check, false)}
            className={`rounded border px-2 py-0.5 ${check.helpful === false ? 'border-rose-600 text-rose-200' : 'border-slate-700 hover:border-rose-700'}`}
          >
            No
          </button>
        </p>
      ) : null}
    </div>
  );
}

function isDeclined(item: ReviewQueueItem): boolean {
  return String(item.status).toLowerCase() === 'declined';
}

/** Closed without going in: declined, considered, orphaned (its passage is gone), or withdrawn by its author. These start collapsed. */
function isClosed(item: ReviewQueueItem): boolean {
  return ['declined', 'considered', 'orphaned', 'withdrawn'].includes(String(item.status).toLowerCase());
}

const CLOSED_LABEL: Record<string, string> = {
  declined: 'Declined',
  considered: 'Considered',
  orphaned: 'Original text not found',
  withdrawn: 'Withdrawn by author',
};

function snippet(text: string, max = 140): string {
  const flat = (text || '').replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

type ReviewCounts = {
  total: number;
  open: number;
  declined: number;
  considered: number;
  orphaned: number;
  approved: number;
};

/** Open = waiting for a co-editor decision (or not yet filed); approved = in or headed for the revision. */
function reviewCounts(items: ReviewQueueItem[]): ReviewCounts {
  const status = (i: ReviewQueueItem) => String(i.status).toLowerCase();
  return {
    total: items.length,
    open: items.filter((i) => ['pending', 'canopi_only'].includes(status(i))).length,
    declined: items.filter(isDeclined).length,
    considered: items.filter((i) => status(i) === 'considered').length,
    orphaned: items.filter((i) => status(i) === 'orphaned').length,
    approved: items.filter((i) => ['accepted', 'incorporated'].includes(status(i))).length,
  };
}

function ReviewSummary({ counts }: { counts: ReviewCounts }) {
  const cells: Array<{ label: string; value: number; tone: string }> = [
    { label: 'Total', value: counts.total, tone: 'text-white' },
    { label: 'Open', value: counts.open, tone: counts.open ? 'text-amber-200' : 'text-white' },
    { label: 'Declined', value: counts.declined, tone: 'text-rose-200' },
  ];
  if (counts.considered) cells.push({ label: 'Considered', value: counts.considered, tone: 'text-slate-300' });
  if (counts.orphaned) cells.push({ label: 'Text not found', value: counts.orphaned, tone: 'text-slate-300' });
  if (counts.approved) cells.push({ label: 'Approved', value: counts.approved, tone: 'text-emerald-200' });
  return (
    <dl className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3" aria-label="Proposal counts">
      {cells.map((c) => (
        <div key={c.label} className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-2 sm:min-w-28">
          <dt className="text-xs uppercase tracking-wide text-slate-500">{c.label}</dt>
          <dd className={`text-2xl font-semibold ${c.tone}`}>{c.value}</dd>
        </div>
      ))}
    </dl>
  );
}
