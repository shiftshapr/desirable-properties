'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { CarriedCard, ItemCard, type Flash } from '@/components/steering/SteeringSweep';
import { useAuth } from '@/lib/auth-context';
import {
  agreesWith,
  DECISION_LABEL,
  normalizeIssues,
  REVIEW_LABEL,
  STEERING_TABS,
  steeringTab,
  type SteeringCarriedItem,
  type SteeringDecision,
  type SteeringFinding,
  type SteeringIssues as Issues,
  type SteeringItem,
  type SteeringReviewDecision,
} from '@/lib/dp-steering';

const SEVERITY_TONE: Record<string, string> = {
  high: 'border-rose-800/70 text-rose-200',
  medium: 'border-amber-700/70 text-amber-200',
  low: 'border-slate-700 text-slate-300',
};

type FindingItem = SteeringFinding['items'][number];
type FindingCarried = SteeringFinding['carried'][number];

type IssuesResult = { data: Issues } | { error: { text: string; code?: string } };

async function fetchIssues(): Promise<IssuesResult> {
  try {
    const res = await fetch('/api/steering/issues', { cache: 'no-store' });
    const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
    if (!res.ok) return { error: { text: body.error || `Steering ${res.status}`, code: body.code } };
    return { data: normalizeIssues(body) };
  } catch (err) {
    return { error: { text: err instanceof Error ? err.message : 'Steering data unavailable' } };
  }
}

/**
 * /steering/issues: Stage 2 by issue. The cross-DP check's findings in their groups; under each, the
 * fixes it filed (voted on like any proposal, each with Ask Deepi) and the accepted changes it flagged.
 */
export default function SteeringIssues() {
  const [data, setData] = useState<Issues | null>(null);
  const [error, setError] = useState<{ text: string; code?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [flash, setFlash] = useState<Record<string, Flash>>({});
  const [showDecided, setShowDecided] = useState(false);

  const apply = useCallback((result: IssuesResult) => {
    if ('error' in result) setError(result.error);
    else {
      setData(result.data);
      setError(null);
    }
    setLoading(false);
  }, []);
  const load = useCallback(async () => apply(await fetchIssues()), [apply]);

  const { user, checked } = useAuth();
  useEffect(() => {
    let cancelled = false;
    void fetchIssues().then((result) => {
      if (!cancelled) apply(result);
    });
    return () => {
      cancelled = true;
    };
  }, [apply, user?.id, checked]);

  const say = (id: string, ok: boolean, text: string) => setFlash((f) => ({ ...f, [id]: { ok, text } }));

  async function act(id: string, busyKey: string, url: string, init: RequestInit, done: (body: Record<string, unknown>) => Flash) {
    setBusy(busyKey);
    say(id, true, '');
    try {
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
      const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      if (!res.ok) throw new Error(String(body.error || `Failed (${res.status})`));
      const result = done(body);
      say(id, result.ok, result.text);
      await load();
    } catch (err) {
      say(id, false, err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(null);
    }
  }

  // A fix is a proposal on its own document: the vote goes to that document.
  const vote = (ml: string) => (item: SteeringItem, decision: SteeringDecision, opts: { revisedText?: string; note?: string; agrees?: boolean | null }) =>
    act(
      item.proposalId,
      `item:${item.proposalId}`,
      `/api/steering/${encodeURIComponent(ml)}/votes`,
      {
        method: 'POST',
        body: JSON.stringify({
          proposal_id: item.proposalId,
          decision,
          revised_text: decision === 'accept_revised' ? opts.revisedText : undefined,
          agrees_with_analysis: opts.agrees ?? agreesWith(item.analysis, decision, opts.revisedText),
          note: opts.note || undefined,
        }),
      },
      (body) => {
        const outcome = body.outcome as { error?: string | null } | null | undefined;
        const state = String(body.state || '');
        if (outcome?.error) return { ok: false, text: `Vote recorded. Two members agree, but carrying it out failed: ${outcome.error}` };
        return {
          ok: true,
          text:
            state === 'done' || outcome
              ? `Vote recorded. Two members agree: ${DECISION_LABEL[decision]} is carried out.`
              : state === 'split'
                ? 'Vote recorded. The votes differ, so another member’s vote settles it.'
                : 'Vote recorded. It needs a second steering member to agree.',
        };
      },
    );
  const withdrawVote = (ml: string) => (item: SteeringItem) =>
    void act(
      item.proposalId,
      `item:${item.proposalId}`,
      `/api/steering/${encodeURIComponent(ml)}/votes/${encodeURIComponent(item.proposalId)}`,
      { method: 'DELETE' },
      () => ({ ok: true, text: 'Your vote is withdrawn.' }),
    );
  const review = (item: SteeringCarriedItem, decision: SteeringReviewDecision, note: string) =>
    void act(
      item.proposalId,
      `carried:${item.proposalId}`,
      `/api/steering/stages/current/carried/${encodeURIComponent(item.proposalId)}`,
      { method: 'POST', body: JSON.stringify({ decision, note: note || undefined, stage_key: data?.stage?.key }) },
      (body) => {
        const it = (body.item || {}) as { decision?: string | null; state?: string };
        return {
          ok: true,
          text: it.decision
            ? `Review recorded. Two members agree: ${REVIEW_LABEL[it.decision as SteeringReviewDecision] || it.decision}.`
            : it.state === 'split'
              ? 'Review recorded. The reviews differ, so another member settles it.'
              : 'Review recorded. It needs a second steering member to agree.',
        };
      },
    );
  const withdrawReview = (item: SteeringCarriedItem) =>
    void act(
      item.proposalId,
      `carried:${item.proposalId}`,
      `/api/steering/stages/current/carried/${encodeURIComponent(item.proposalId)}`,
      { method: 'DELETE' },
      () => ({ ok: true, text: 'Your review is withdrawn.' }),
    );

  const readOnly = !data?.viewerIsSteering;
  const findings = data?.groups.reduce((n, g) => n + g.findings.length, 0) || 0;
  const isOpen = (i: FindingItem) => steeringTab(i) === 'open';
  const carriedOpen = (c: FindingCarried) => c.tab === 'open';
  // A finding is settled once every fix and every flagged change under it is; one with neither stays listed.
  const settled = (f: SteeringFinding) => (f.items.length || f.carried.length ? !f.items.some(isOpen) && !f.carried.some(carriedOpen) : false);

  return (
    <div className="mt-6 space-y-8">
      <header className="space-y-3 border-b border-slate-800 pb-5">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-300">
          Steering{data?.stage ? ` · ${data.stage.title}` : ''} · by issue
        </p>
        <h1 className="text-2xl font-semibold text-white sm:text-3xl">Cross-DP issues</h1>
        <p className="max-w-3xl text-sm text-slate-300">
          The cross-DP check read every accepted change against all 28 documents. Each finding below lists the
          fixes it filed, which are voted on like any proposal, and the accepted changes it flagged. Two steering
          members must agree before a fix is carried out. A fix that touches several documents is one proposal per
          document, shown together here.
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <button type="button" onClick={() => void load()} className="text-slate-400 hover:text-slate-200">
            Refresh
          </button>
          <label className="flex items-center gap-2 text-slate-300">
            <input type="checkbox" checked={showDecided} onChange={(e) => setShowDecided(e.target.checked)} />
            Show settled findings
          </label>
          {data?.run ? (
            <span className="text-xs text-slate-500">
              Analysis {data.run.label}
              {data.run.model ? ` (${data.run.model})` : ''}
            </span>
          ) : null}
        </div>
        {data && findings ? (
          <dl className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3" aria-label="Fix totals">
            {STEERING_TABS.map((t) => (
              <div key={t.key} className="rounded-lg border border-slate-800 bg-slate-950/50 px-4 py-2 sm:min-w-32">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Fixes {t.label.toLowerCase()}</dt>
                <dd className="text-2xl font-semibold text-white">{data.totals[t.key]}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </header>

      {loading && !data ? <p className="text-sm text-slate-400">Loading…</p> : null}
      {error ? (
        <p role="alert" className="rounded-lg border border-rose-900/50 bg-rose-950/20 px-4 py-3 text-sm text-rose-200">
          {error.text}
          {error.code === 'sign_in_again' || error.code === 'sign_in' ? (
            <>
              {' '}
              <a href="/login?next=%2Fsteering%2Fissues" className="underline hover:text-rose-100">
                Sign in again
              </a>
            </>
          ) : null}
        </p>
      ) : null}

      {data && !findings ? (
        <p className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-5 text-sm text-slate-300">
          {data.stage?.kind === 'review'
            ? `No cross-DP findings have been imported for ${data.stage.title} yet.`
            : 'The cross-DP stage is not open yet.'}
        </p>
      ) : null}

      {data && findings ? (
        <nav aria-label="Issue groups" className="flex flex-wrap gap-2 text-sm">
          {data.groups.map((g) => (
            <a key={g.key} href={`#group-${g.key}`} className="rounded-full border border-slate-700 px-3 py-1 text-slate-200 hover:border-slate-500">
              {g.title} <span className="text-slate-500">({g.findings.length})</span>
            </a>
          ))}
        </nav>
      ) : null}

      {data?.groups.map((group) => {
        const shown = group.findings.filter((f) => showDecided || !settled(f));
        return (
          <section key={group.key} id={`group-${group.key}`} className="scroll-mt-24 space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-white">{group.title}</h2>
              {group.summary ? <p className="mt-1 max-w-3xl whitespace-pre-line text-sm text-slate-300">{group.summary}</p> : null}
              <p className="mt-1 text-xs text-slate-400">
                {group.findings.length} finding{group.findings.length === 1 ? '' : 's'} · {group.tabs.open} fix
                {group.tabs.open === 1 ? '' : 'es'} open · {group.tabs.accepted} accepted · {group.tabs.deferred} deferred ·{' '}
                {group.tabs.declined} declined
              </p>
            </div>
            {!shown.length ? (
              <p className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-4 text-sm text-slate-300">
                Every finding in this group is settled.
              </p>
            ) : null}
            {shown.map((f) => (
              <article key={f.key} className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {f.severity ? (
                    <span className={`rounded-full border px-2 py-0.5 ${SEVERITY_TONE[f.severity] || SEVERITY_TONE.low}`}>{f.severity}</span>
                  ) : null}
                  {f.type ? <span className="rounded-full border border-slate-700 px-2 py-0.5 text-slate-300">{f.type.replace(/_/g, ' ')}</span> : null}
                  {f.needsDecision ? (
                    <span className="rounded-full border border-violet-700/70 px-2 py-0.5 text-violet-200">Needs a steering decision</span>
                  ) : null}
                  {f.documents.length ? <span className="text-slate-400">{f.documents.join(', ')}</span> : null}
                </div>
                <h3 className="mt-2 text-lg font-semibold text-white">{f.title}</h3>
                {f.summary ? <p className="mt-1 whitespace-pre-line text-sm text-slate-300">{f.summary}</p> : null}
                {f.decision ? <p className="mt-2 whitespace-pre-line text-sm text-violet-100">To decide: {f.decision}</p> : null}
                {f.noFixReason ? <p className="mt-2 whitespace-pre-line text-sm text-slate-400">No text fix: {f.noFixReason}</p> : null}

                {f.items.length ? (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">
                      Fix{f.items.length === 1 ? '' : 'es'} ({f.items.length})
                    </h4>
                    <ul className="space-y-4">
                      {f.items.map((item) => (
                        <li key={item.proposalId} className="list-none space-y-1">
                          <DocumentLine item={item} />
                          <ul>
                            <ItemCard
                              ml={item.mlNumber}
                              item={item}
                              busy={busy}
                              flash={flash[item.proposalId]}
                              onVote={vote(item.mlNumber)}
                              onWithdraw={withdrawVote(item.mlNumber)}
                              readOnly={readOnly}
                            />
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {f.carried.length ? (
                  <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">
                      Accepted change{f.carried.length === 1 ? '' : 's'} this finding flags ({f.carried.length})
                    </h4>
                    <ul className="space-y-4">
                      {f.carried.map((item) => (
                        <li key={item.proposalId} className="list-none space-y-1">
                          <DocumentLine item={item} />
                          <ul>
                            <CarriedCard
                              ml={item.mlNumber}
                              item={item}
                              readOnly={readOnly}
                              busy={busy === `carried:${item.proposalId}`}
                              flash={flash[item.proposalId]}
                              onReview={review}
                              onWithdraw={withdrawReview}
                            />
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function DocumentLine({ item }: { item: { mlNumber: string; docKey: string | null; docTitle: string | null } }) {
  return (
    <p className="text-xs text-slate-400">
      In{' '}
      <Link href={`/steering/${item.mlNumber}`} className="text-cyan-300 hover:text-cyan-200">
        {item.docKey ? `${item.docKey} · ` : ''}
        {item.docTitle || item.mlNumber}
      </Link>
    </p>
  );
}
