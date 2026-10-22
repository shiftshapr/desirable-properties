'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import DiscussPatchLink from '@/components/DiscussPatchLink';
import WorkgroupActivityFeed from '@/components/workgroup/WorkgroupActivityFeed';
import WorkgroupCanopiStrip from '@/components/workgroup/WorkgroupCanopiStrip';
import { NOMINATE_CO_EDITOR_EVENT } from '@/components/workgroup/WorkgroupCoEditorsPanel';
import { shortDate, STALE_PROPOSAL_DAYS } from '@/data/dp-process';
import type { ActivityFeedItem } from '@/lib/activity-feed';
import { bookDiscussHref, bookIntroDiscussHref, isDpDiscoveryWorkgroup } from '@/lib/govhub';
import type { CoEditorSeatsResponse } from '@/lib/workgroup-collab-api';
import type { WorkgroupCollabTabKey } from '@/lib/workgroup-collab-tabs';
import type { ReviewQueueResponse } from '@/lib/workgroup-review-types';

/** A readiness item that does not pass yet, for this DP. */
export type OpenReadinessItem = {
  key: string;
  label: string;
  due: string;
  detail: string;
  manual: boolean;
};

export type NextStepsReadiness = {
  passed: number;
  total: number;
  open: OpenReadinessItem[];
};

type Props = {
  workgroupId: string;
  workgroupSlug: string;
  dpId: string | null;
  dpDetailHref: string | null;
  signedIn: boolean;
  isMember: boolean;
  /** From the Co-editors card; null until it loads. */
  seats: CoEditorSeatsResponse | null;
  readiness: NextStepsReadiness | null;
  initialActivity: ActivityFeedItem[];
  onSelectTab: (tab: WorkgroupCollabTabKey) => void;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function daysSince(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.max(0, Math.floor((Date.now() - t) / DAY_MS)) : 0;
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <li className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-slate-300">{children}</div>
    </li>
  );
}

const PRIMARY = 'rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600';
const SECONDARY = 'rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500';

/**
 * "Next steps": what this viewer should do now, replacing Getting Started.
 * Co-editors see the proposals waiting for their decision and the DP's open
 * readiness items; everyone else sees how to become a co-editor or propose a change.
 */
export default function WorkgroupNextSteps({
  workgroupId,
  workgroupSlug,
  dpId,
  dpDetailHref,
  signedIn,
  isMember,
  seats,
  readiness,
  initialActivity,
  onSelectTab,
}: Props) {
  const isDiscovery = isDpDiscoveryWorkgroup(workgroupSlug);
  const hasSeats = Boolean(seats?.enabled) && !isDiscovery;
  const [review, setReview] = useState<ReviewQueueResponse | null>(null);

  useEffect(() => {
    if (isDiscovery) return;
    let cancelled = false;
    fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/review`, { credentials: 'include', cache: 'no-store' })
      .then((res) => (res.ok ? (res.json() as Promise<ReviewQueueResponse>) : null))
      .then((data) => {
        if (!cancelled) setReview(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [workgroupId, isDiscovery, signedIn]);

  const dp = dpId || 'this DP';
  const isCoEditor = Boolean(seats?.viewer_is_co_editor || review?.isCoEditor);
  const openSeats = hasSeats ? (seats?.open_seats ?? 0) : 0;
  const pending = (review?.items ?? []).filter((i) => i.status === 'pending');
  const me = review?.viewerGovhubUserId ?? null;
  const waitingOnMe = pending.filter((i) => !i.approvals.some((a) => a.userId === me));
  const oldest = waitingOnMe.reduce((max, i) => Math.max(max, daysSince(i.createdAt)), 0);
  const discussHref = isDiscovery ? bookIntroDiscussHref() : bookDiscussHref(dpId ? { dpId } : undefined);

  function nominate() {
    window.dispatchEvent(new Event(NOMINATE_CO_EDITOR_EVENT));
  }

  function becomeCoEditor() {
    document.getElementById('co-editors')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-300">Next steps</p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">
          {isDiscovery
            ? 'DP Discovery looks for properties the current 23 may have missed. Propose one on the book, and discuss it with the group in Chat.'
            : `This workgroup takes ${dp} from the Community Review Draft to Version 1.0. Anyone can propose a change; the two co-editors decide which go in.`}
        </p>
      </div>

      <ol className="grid gap-4 md:grid-cols-2">
        {isCoEditor ? (
          <Step title="Decide the proposals waiting for you">
            {!review ? (
              <p className="text-slate-400">Loading the Review queue…</p>
            ) : waitingOnMe.length ? (
              <p>
                <span className="font-semibold text-amber-200">
                  {waitingOnMe.length} proposal{waitingOnMe.length === 1 ? '' : 's'}
                </span>{' '}
                waiting for your decision; the oldest is {oldest} day{oldest === 1 ? '' : 's'} old. Decide each
                within {STALE_PROPOSAL_DAYS} days.
              </p>
            ) : (
              <p>Nothing is waiting for you. New proposals show up on the Review tab.</p>
            )}
            <ul className="list-disc space-y-1 pl-5 text-slate-400">
              <li>Approve: a change goes in once both co-editors approve it.</li>
              <li>Decline: write a sentence the author can read.</li>
              <li>When changes are approved, publish them as the next revision on Review.</li>
            </ul>
            <button type="button" onClick={() => onSelectTab('review')} className={PRIMARY}>
              Open Review
            </button>
          </Step>
        ) : null}

        {hasSeats && openSeats > 0 ? (
          <Step title={isCoEditor ? `${dp} needs another co-editor` : `Become a co-editor of ${dp}`}>
            <p>
              {openSeats === 1 ? 'One co-editor seat is open.' : `${openSeats} co-editor seats are open.`} Co-editors
              decide each proposal within {STALE_PROPOSAL_DAYS} days: both approve a change before it goes in, and
              every &ldquo;no&rdquo; carries a short reason for the author.
            </p>
            <div className="flex flex-wrap gap-3">
              {!isCoEditor ? (
                <button type="button" onClick={becomeCoEditor} className={PRIMARY}>
                  Become a co-editor
                </button>
              ) : null}
              <button type="button" onClick={nominate} className={isCoEditor ? PRIMARY : SECONDARY}>
                Nominate someone
              </button>
            </div>
          </Step>
        ) : null}

        {!isCoEditor ? (
          <Step title="Propose a change">
            <p>
              Open the chapter in the book, select a passage, and use Patch (replace it) or Insert (add text above
              it) in the Go Meta panel. Your proposal goes to the co-editors on the Review tab, where members can
              comment and vote.
            </p>
            <div className="flex flex-wrap gap-3">
              <DiscussPatchLink href={discussHref} className={PRIMARY}>
                {isDiscovery ? 'Discuss on the book' : 'Discuss & patch this chapter'}
              </DiscussPatchLink>
              {!isDiscovery ? (
                <button type="button" onClick={() => onSelectTab('review')} className={SECONDARY}>
                  {pending.length
                    ? `See ${pending.length} open proposal${pending.length === 1 ? '' : 's'}`
                    : 'Open Review'}
                </button>
              ) : null}
            </div>
            {!signedIn ? <p className="text-slate-400">Sign in first so your name goes with the proposal.</p> : null}
            {signedIn && !isMember ? (
              <p className="text-slate-400">Join the workgroup (top of the page) to post in Chat.</p>
            ) : null}
          </Step>
        ) : null}

        {readiness && readiness.open.length && !isDiscovery ? (
          <Step title={`V1 readiness · ${readiness.passed} of ${readiness.total} pass`}>
            <ul className="space-y-1.5">
              {readiness.open.map((item) => (
                <li key={item.key}>
                  {item.label}
                  <span className="text-slate-500">
                    {' '}
                    · {item.detail || 'open'} · due {shortDate(item.due)}
                  </span>
                </li>
              ))}
            </ul>
            {isCoEditor && readiness.open.some((i) => i.manual) ? (
              <p className="text-slate-400">Tick the manual items on the readiness board when they are done.</p>
            ) : null}
            <Link href="/v1-readiness" className="inline-block text-cyan-300 hover:text-cyan-200">
              Readiness board →
            </Link>
          </Step>
        ) : null}
      </ol>

      <p className="text-sm text-slate-400">
        The full process, roles and weekly tasks are on{' '}
        <Link href="/process" className="text-cyan-300 hover:text-cyan-200">
          How V1 gets made
        </Link>
        {dpDetailHref ? (
          <>
            {' · '}
            <Link href={dpDetailHref} className="text-cyan-300 hover:text-cyan-200">
              {dpId} detail page
            </Link>
          </>
        ) : null}
        {' · '}
        <Link href="/editorial-synthesis" className="text-cyan-300 hover:text-cyan-200">
          Astra synthesis for every chapter
        </Link>
        .
      </p>

      <WorkgroupCanopiStrip workgroupSlug={workgroupSlug} dpId={dpId} compact />

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Recent activity</h3>
        <div className="mt-3">
          <WorkgroupActivityFeed workgroupSlug={workgroupSlug} dpId={dpId} initialItems={initialActivity} />
        </div>
      </section>
    </div>
  );
}
