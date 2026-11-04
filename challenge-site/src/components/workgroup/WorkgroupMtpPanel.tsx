'use client';

import { useEffect, useState } from 'react';
import WorkgroupReviewPanel from '@/components/workgroup/WorkgroupReviewPanel';
import type { MtpResponse } from '@/lib/dp-mtp';

type Props = {
  workgroupId: string;
  workgroupSlug: string;
  dpId: string | null;
  canEdit: boolean;
  isMember: boolean;
  signedIn: boolean;
};

function day(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const DECISION: Record<string, string> = {
  accepted: 'Approved',
  incorporated: 'Approved',
  declined: 'Declined',
  considered: 'Replaced by a revised wording',
  withdrawn: 'Withdrawn',
  orphaned: 'Closed',
};

/**
 * The chapter's Massive Transformational Purpose: the current lines, the proposals to change them
 * (members support or not and comment; every co-editor approves, or one steering member after the
 * freeze) and the record of past wordings.
 */
export default function WorkgroupMtpPanel(props: Props) {
  const [data, setData] = useState<MtpResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/workgroups/${encodeURIComponent(props.workgroupId)}/mtp`, { cache: 'no-store' })
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body.error || 'MTP unavailable');
        if (live) setData(body as MtpResponse);
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : 'MTP unavailable'));
    return () => {
      live = false;
    };
  }, [props.workgroupId]);

  const current = data?.current;
  return (
    <div className="space-y-6">
      <header className="space-y-2 border-b border-slate-800 pb-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-cyan-400">MTP</p>
        <h2 className="text-xl font-semibold text-white">
          Massive Transformational Purpose{props.dpId ? ` · ${props.dpId}` : ''}
        </h2>
        <p className="max-w-3xl text-sm text-slate-400">
          One line on the change in the world this property is for, and the same in plain words. It sits
          under the chapter&apos;s tagline. Members say whether they support a proposed wording and comment;
          it becomes the chapter&apos;s MTP when every co-editor approves it (after the 9 November freeze, one
          steering committee member), and appears in the book with the next published revision.
        </p>
      </header>

      {error ? (
        <p className="rounded-lg border border-rose-900/50 bg-rose-950/20 px-4 py-3 text-sm text-rose-200">{error}</p>
      ) : null}

      <section className="rounded-xl border border-cyan-900/60 bg-cyan-950/20 p-5">
        <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-cyan-300">Current</h3>
        {!data && !error ? <p className="mt-2 text-sm text-slate-400">Loading…</p> : null}
        {data && !current ? (
          <p className="mt-2 text-sm text-slate-300">
            No MTP approved yet{data.pendingCount ? ': the proposed wording is below.' : '.'}
          </p>
        ) : null}
        {current ? (
          <div className="mt-2 space-y-2">
            <p className="text-lg font-semibold text-white">{current.mtp}</p>
            {current.plain ? <p className="text-sm text-slate-300">{current.plain}</p> : null}
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-white">Proposed wordings</h3>
        <WorkgroupReviewPanel
          workgroupId={props.workgroupId}
          workgroupSlug={props.workgroupSlug}
          dpId={props.dpId}
          canEdit={props.canEdit}
          isMember={props.isMember}
          signedIn={props.signedIn}
          only="mtp"
        />
      </section>

      {data?.history.length ? (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-white">History</h3>
          <ol className="space-y-3">
            {data.history.map((h) => (
              <li key={h.proposalId} className="rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-sm">
                <p className="font-medium text-white">{h.mtp}</p>
                {h.plain ? <p className="mt-1 text-slate-300">{h.plain}</p> : null}
                <p className="mt-2 text-xs text-slate-500">
                  {DECISION[h.status] || h.status}
                  {h.decidedAt ? ` ${day(h.decidedAt)}` : ''}
                  {h.approvers.length ? ` · approved by ${h.approvers.join(', ')}` : ''}
                  {h.authorName ? ` · proposed by ${h.authorName}` : ''}
                  {h.proposedAt ? ` on ${day(h.proposedAt)}` : ''}
                </p>
                {h.note ? <p className="mt-1 text-xs text-slate-400">Note: {h.note}</p> : null}
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
