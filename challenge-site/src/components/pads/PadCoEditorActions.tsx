'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import ReviewReviseForm from '@/components/workgroup/ReviewReviseForm';
import type { ReviewQueueItem, ReviewQueueResponse } from '@/lib/workgroup-review-types';

type Props = {
  workgroupId: string | null;
  workgroupSlug: string | null;
  proposalId: string;
  dpId: string | null;
  open: boolean;
};

/**
 * Co-editor decisions on the pad: the same Review flow as the DP's Review tab (GET /api/workgroups/<id>/review for the
 * viewer's standing and this item, POST /review/pick to approve or decline, ReviewReviseForm for /review/revise).
 * Gov Hub checks that the viewer is a co-editor of this DP; nothing here decides on its own.
 */
export default function PadCoEditorActions({ workgroupId, workgroupSlug, proposalId, dpId, open }: Props) {
  const { user, checked } = useAuth();
  const router = useRouter();
  const [queue, setQueue] = useState<ReviewQueueResponse | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const [revising, setRevising] = useState(false);

  const load = useCallback(async () => {
    if (!workgroupId) return;
    try {
      const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/review`, { cache: 'no-store' });
      if (res.ok) setQueue((await res.json()) as ReviewQueueResponse);
    } catch {
      /* the pad still shows everything else */
    }
  }, [workgroupId]);

  useEffect(() => {
    if (!checked || !user || !open || !workgroupId) return;
    let cancelled = false;
    // Only co-editors load the Review queue (it is heavy); everyone else sees nothing here.
    fetch(`/api/pads/proposals/${encodeURIComponent(proposalId)}/viewer?wg=${encodeURIComponent(workgroupId)}`, { cache: 'no-store' })
      .then(async (res) => {
        const viewer = (await res.json().catch(() => ({}))) as { isCoEditor?: boolean };
        if (!viewer.isCoEditor || cancelled) return;
        const q = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/review`, { cache: 'no-store' });
        if (q.ok && !cancelled) setQueue((await q.json()) as ReviewQueueResponse);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [checked, user, open, workgroupId, proposalId]);

  const reviewHref = workgroupSlug ? `/workgroups/${workgroupSlug}?tab=review&proposal=${encodeURIComponent(proposalId)}` : null;
  if (!open || !queue?.isCoEditor) return null;
  const item: ReviewQueueItem | undefined = queue.items.find((i) => i.govhubProposalId === proposalId);
  if (!item) return null;
  const mineApproved = item.approvals.some((a) => a.userId && a.userId === queue.viewerGovhubUserId);

  async function pick(action: 'promote' | 'drop') {
    if (!workgroupId || !item) return;
    if (action === 'drop' && !note.trim()) {
      setResult({ ok: false, text: 'Write a decision note before declining. The author can read it.' });
      return;
    }
    setBusy(action);
    setResult(null);
    try {
      const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/review/pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, govhubProposalId: proposalId, itemKey: item.key, note: note.trim() }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) throw new Error(body.error || 'Gov Hub update failed');
      setResult({
        ok: true,
        text:
          body.message ||
          (action === 'promote' ? 'Approved. It goes into the revision draft once enough co-editors approve. Not live.' : 'Declined. The author can read your note.'),
      });
      setNote('');
      await load();
      router.refresh();
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : 'Gov Hub update failed' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-cyan-800/60 bg-cyan-950/20 p-4 sm:p-5">
      <h3 className="text-base font-semibold text-white">Your decision as a {dpId || 'DP'} co-editor</h3>
      <p className="mt-1 text-sm text-slate-400">
        Same as the Review tab: approve, revise or decline. {queue.approvalsNeeded} co-editor approvals incorporate it into the
        next revision draft (not live until published).
      </p>
      {mineApproved ? <p className="mt-2 text-sm text-emerald-200">You have approved this proposal.</p> : null}
      {!item.canPromote && item.promoteBlockReason ? <p className="mt-2 text-sm text-amber-200">{item.promoteBlockReason}</p> : null}
      <label className="mt-3 block text-sm text-slate-300">
        Decision note (optional to approve, required to decline; the author reads it)
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void pick('promote')}
          disabled={Boolean(busy) || mineApproved || !item.canPromote}
          className="rounded-lg bg-emerald-500 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {busy === 'promote' ? 'Approving…' : 'Approve'}
        </button>
        <button
          type="button"
          onClick={() => setRevising((v) => !v)}
          disabled={Boolean(busy)}
          className="rounded-lg border border-slate-600 px-4 py-1.5 text-sm text-slate-100 hover:border-cyan-500"
        >
          Revise
        </button>
        <button
          type="button"
          onClick={() => void pick('drop')}
          disabled={Boolean(busy)}
          className="rounded-lg border border-rose-700 px-4 py-1.5 text-sm text-rose-100 hover:border-rose-500"
        >
          {busy === 'drop' ? 'Declining…' : 'Decline'}
        </button>
        {reviewHref ? (
          <a href={reviewHref} className="text-sm text-cyan-300 hover:text-cyan-200">
            Open in the Review tab
          </a>
        ) : null}
      </div>
      {result ? (
        <p className={`mt-2 text-sm ${result.ok ? 'text-emerald-200' : 'text-rose-300'}`} role="status">
          {result.text}
        </p>
      ) : null}
      {revising && workgroupId ? (
        <div className="mt-4" id={`revise-${item.key}`}>
          <ReviewReviseForm
            workgroupId={workgroupId}
            item={item}
            onDone={(message) => {
              setRevising(false);
              setResult({ ok: true, text: message });
              void load();
              router.refresh();
            }}
            onCancel={() => setRevising(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
