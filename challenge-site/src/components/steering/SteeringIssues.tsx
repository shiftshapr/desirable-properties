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
  // A decision is settled once two members choose the same course.
  const settled = (f: SteeringFinding) =>
    f.needsDecision
      ? !!f.discussion.settledChoice
      : f.items.length || f.carried.length
        ? !f.items.some(isOpen) && !f.carried.some(carriedOpen)
        : false;
  const decide = (f: SteeringFinding, choice: string | null, note: string) =>
    void act(
      f.key,
      `finding:${f.key}`,
      `/api/steering/issues/${encodeURIComponent(f.key)}/decision`,
      choice ? { method: 'POST', body: JSON.stringify({ choice, note: note || undefined }) } : { method: 'DELETE' },
      (body) => {
        const d = (body.discussion || {}) as { settled_choice?: string | null };
        if (!choice) return { ok: true, text: 'Your choice is withdrawn.' };
        return {
          ok: true,
          text: d.settled_choice
            ? d.settled_choice === choice
              ? 'Choice recorded. Two members agree, so this decision is settled.'
              : 'Choice recorded. Two other members already agree on a different course.'
            : 'Choice recorded. It needs a second steering member to choose the same.',
        };
      },
    );
  const comment = (f: SteeringFinding, text: string) =>
    act(
      f.key,
      `finding:${f.key}`,
      `/api/steering/issues/${encodeURIComponent(f.key)}/comments`,
      { method: 'POST', body: JSON.stringify({ body: text }) },
      () => ({ ok: true, text: 'Comment posted.' }),
    );
  const uncomment = (f: SteeringFinding, id: string) =>
    void act(
      f.key,
      `finding:${f.key}`,
      `/api/steering/issues/${encodeURIComponent(f.key)}/comments/${encodeURIComponent(id)}`,
      { method: 'DELETE' },
      () => ({ ok: true, text: 'Comment removed.' }),
    );

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
                {f.noFixReason ? <p className="mt-2 whitespace-pre-line text-sm text-slate-400">No text fix: {f.noFixReason}</p> : null}
                <FindingDiscussion
                  finding={f}
                  readOnly={readOnly}
                  busy={busy === `finding:${f.key}`}
                  flash={flash[f.key]}
                  onDecide={decide}
                  onComment={comment}
                  onUncomment={uncomment}
                />

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

function when(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/**
 * Under a finding: for one that needs a steering decision, its options (with the review's
 * recommendation) and each member's choice; two matching choices settle it. Any finding takes comments.
 */
function FindingDiscussion({
  finding,
  readOnly,
  busy,
  flash,
  onDecide,
  onComment,
  onUncomment,
}: {
  finding: SteeringFinding;
  readOnly: boolean;
  busy: boolean;
  flash?: Flash;
  onDecide: (f: SteeringFinding, choice: string | null, note: string) => void;
  onComment: (f: SteeringFinding, text: string) => Promise<void>;
  onUncomment: (f: SteeringFinding, id: string) => void;
}) {
  const d = finding.discussion;
  const [choice, setChoice] = useState<string>(d.myChoice || '');
  const [note, setNote] = useState<string>(d.myNote || '');
  const [draft, setDraft] = useState('');
  const label = (key: string) => d.choices.find((c) => c.key === key)?.label || key;
  const short = (key: string) => (key.startsWith('option-') ? `Option ${key.slice(7)}` : key === 'defer' ? 'Defer to 1.1' : 'Something else');
  const changed = choice !== (d.myChoice || '') || (note.trim() || '') !== (d.myNote || '');
  const needsNote = choice === 'other' && !note.trim();

  return (
    <div className="mt-4 space-y-4">
      {finding.needsDecision ? (
        <div className="rounded-xl border border-violet-800/60 bg-violet-950/20 p-4">
          <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-violet-200">Steering decision</h4>
          {d.settledChoice ? (
            <p className="mt-2 rounded-lg border border-emerald-700/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-100">
              Settled: {short(d.settledChoice)}. {label(d.settledChoice)}
            </p>
          ) : null}
          {finding.decision?.recommended ? (
            <p className="mt-2 whitespace-pre-line text-sm text-violet-100">
              <span className="font-semibold">Review recommends:</span> {finding.decision.recommended}
            </p>
          ) : null}
          <fieldset className="mt-3 space-y-2" disabled={readOnly || busy}>
            <legend className="sr-only">Choose a course</legend>
            {d.choices.map((c) => {
              const n = d.tally[c.key] || 0;
              return (
                <label
                  key={c.key}
                  className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2 text-sm ${
                    choice === c.key ? 'border-violet-500 bg-violet-900/30 text-white' : 'border-slate-700 text-slate-200'
                  } ${readOnly ? 'cursor-default' : ''}`}
                >
                  <input
                    type="radio"
                    name={`choice-${finding.key}`}
                    value={c.key}
                    checked={choice === c.key}
                    onChange={() => setChoice(c.key)}
                    className="mt-1 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-semibold">{short(c.key)}.</span> {c.label}
                    {n ? (
                      <span className="ml-2 whitespace-nowrap text-xs text-violet-200">
                        {n} vote{n === 1 ? '' : 's'}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </fieldset>
          {!readOnly ? (
            <div className="mt-3 space-y-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                maxLength={4000}
                placeholder={choice === 'other' ? 'Say what steering should do instead (required)' : 'Note on your choice (optional)'}
                className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy || !choice || needsNote || !changed}
                  onClick={() => onDecide(finding, choice, note.trim())}
                  className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40"
                >
                  {d.myChoice ? 'Change my choice' : 'Record my choice'}
                </button>
                {d.myChoice ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setChoice('');
                      setNote('');
                      onDecide(finding, null, '');
                    }}
                    className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-400 disabled:opacity-40"
                  >
                    Withdraw my choice
                  </button>
                ) : null}
                <span className="text-xs text-slate-400">Two members choosing the same course settle it.</span>
              </div>
            </div>
          ) : null}
          {d.votes.length ? (
            <ul className="mt-3 space-y-1 text-sm text-slate-300">
              {d.votes.map((v) => (
                <li key={v.id}>
                  <span className="font-medium text-slate-100">{v.mine ? 'You' : v.voterName || 'A steering member'}</span>: {short(v.choice)}
                  {v.note ? <span className="text-slate-400"> · {v.note}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
          {finding.decision?.note ? (
            <details className="mt-3 text-sm text-slate-400">
              <summary className="cursor-pointer text-slate-300">Second-pass reviewer’s note</summary>
              <p className="mt-1 whitespace-pre-line">{finding.decision.note}</p>
            </details>
          ) : null}
        </div>
      ) : null}

      {d.comments.length || !readOnly ? (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-400">
            Comments{d.comments.length ? ` (${d.comments.length})` : ''}
          </h4>
          {d.comments.length ? (
            <ul className="space-y-2">
              {d.comments.map((c) => (
                <li key={c.id} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-sm">
                  <p className="text-xs text-slate-400">
                    <span className="font-medium text-slate-200">{c.mine ? 'You' : c.authorName || 'A steering member'}</span>
                    {when(c.createdAt) ? ` · ${when(c.createdAt)}` : ''}
                    {c.mine && !readOnly ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onUncomment(finding, c.id)}
                        className="ml-2 text-xs text-slate-400 underline hover:text-slate-200 disabled:opacity-40"
                      >
                        Remove
                      </button>
                    ) : null}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-slate-200">{c.body}</p>
                </li>
              ))}
            </ul>
          ) : null}
          {!readOnly ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                maxLength={4000}
                placeholder="Add a comment for the steering committee"
                className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
              />
              <button
                type="button"
                disabled={busy || !draft.trim()}
                onClick={() => void onComment(finding, draft.trim()).then(() => setDraft(''))}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-slate-100 hover:border-slate-400 disabled:opacity-40"
              >
                Post comment
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      {flash?.text ? <p className={`text-sm ${flash.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{flash.text}</p> : null}
    </div>
  );
}
