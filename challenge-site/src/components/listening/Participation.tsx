'use client';

import { useMemo, useRef, useState } from 'react';
import { questionStates } from '@/lib/listening/reducer';
import { CONTRIBUTION_KIND_TEXT, LIMITS, type Contribution, type ContributionKind } from '@/lib/listening/types';
import { ContributionLine } from '@/components/listening/SharedUnderstanding';
import { buttonClass, panelClass, primaryButtonClass, useWorkspace, type Target } from '@/components/listening/ui';

const ACTIONS: { kind: ContributionKind; label: string; placeholder: string }[] = [
  { kind: 'question', label: 'Ask Claude', placeholder: 'Ask a question about the discussion. Everyone on this page sees it.' },
  { kind: 'comment', label: 'Add a comment', placeholder: 'Add a comment for the group.' },
  { kind: 'suggested_option', label: 'Suggest an option', placeholder: 'Describe an option the group has not considered, and why.' },
  { kind: 'correction_request', label: 'Request a correction', placeholder: 'What is wrong in the record, and why?' },
];

const newNonce = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

export default function Participation({ target, onClearTarget }: { target: Target; onClearTarget: () => void }) {
  return (
    <div className="space-y-4" data-testid="participation">
      <h3 className="text-lg font-semibold text-white">Participation</h3>
      <Composer target={target} onClearTarget={onClearTarget} />
      <QuestionQueue />
      <Feed />
    </div>
  );
}

function Composer({ target, onClearTarget }: { target: Target; onClearTarget: () => void }) {
  const { state, act, login } = useWorkspace();
  const [kind, setKind] = useState<ContributionKind>('comment');
  const [text, setText] = useState('');
  const [proposed, setProposed] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // One nonce per piece of text: a retry after a network error cannot post twice.
  const nonce = useRef<string>(newNonce());
  const action = ACTIONS.find((a) => a.kind === kind)!;
  // A target picked with a specific action (e.g. Request a correction on a line) preselects it; the text stays.
  const [seenTarget, setSeenTarget] = useState(target);
  if (seenTarget !== target) {
    setSeenTarget(target);
    if (target.kind) setKind(target.kind);
  }
  const signedIn = state.viewer.signedIn;
  const correctionNeedsTarget = kind === 'correction_request' && target.type === 'meeting';

  const submit = async () => {
    if (!text.trim() || correctionNeedsTarget) return;
    setBusy(true);
    setMsg(null);
    const r = await act('contribution.add', {
      kind,
      targetType: target.type,
      targetId: target.id,
      body: text,
      proposedText: kind === 'correction_request' ? proposed : undefined,
      nonce: nonce.current,
    });
    setBusy(false);
    if (r.ok) {
      setText('');
      setProposed('');
      nonce.current = newNonce();
      setMsg({ ok: true, text: kind === 'question' ? 'Posted. Your question is in the shared queue for Claude.' : 'Posted.' });
    } else {
      setMsg({ ok: false, text: r.message });
    }
  };

  return (
    <div className={`${panelClass} p-3`} data-testid="composer">
      <div role="tablist" aria-label="What do you want to do?" className="flex flex-wrap gap-1">
        {ACTIONS.map((a) => (
          <button
            key={a.kind}
            type="button"
            role="tab"
            aria-selected={kind === a.kind}
            data-testid={`compose-${a.kind}`}
            onClick={() => setKind(a.kind)}
            className={`rounded-lg px-2.5 py-1 text-xs ${kind === a.kind ? 'bg-cyan-500 font-semibold text-slate-950' : 'border border-slate-700 text-slate-300'}`}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400" data-testid="composer-target">
        <span>About:</span>
        <span className="rounded border border-slate-700 px-1.5 py-0.5 text-slate-200" data-testid="composer-target-label">
          {target.type === 'meeting' ? 'The whole meeting' : `${target.type === 'segment' ? 'Transcript' : target.type === 'topic' ? 'Topic' : 'Card'}: ${target.label}`}
        </span>
        {target.type !== 'meeting' ? (
          <button type="button" className="text-cyan-300 hover:text-cyan-200" onClick={onClearTarget}>
            change to whole meeting
          </button>
        ) : (
          <span className="text-slate-500">Use Respond on a card or a transcript line to point at it.</span>
        )}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={LIMITS.body}
        rows={4}
        placeholder={action.placeholder}
        aria-label={action.label}
        data-testid="composer-text"
        className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-sm text-slate-100 placeholder:text-slate-600"
      />
      {kind === 'correction_request' ? (
        <textarea
          value={proposed}
          onChange={(e) => setProposed(e.target.value)}
          maxLength={LIMITS.body}
          rows={2}
          placeholder="Corrected wording (optional). The original stays in the record."
          aria-label="Corrected wording"
          className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-sm text-slate-100 placeholder:text-slate-600"
        />
      ) : null}

      {kind === 'question' ? (
        <p className="mt-2 text-xs text-amber-200/90" data-testid="questions-shared-note">
          Questions are shared: everyone on this page sees your question and its answer. Claude is not connected yet, so
          questions wait in the queue.
        </p>
      ) : null}
      {correctionNeedsTarget ? (
        <p className="mt-2 text-xs text-slate-400">Point at what needs correcting: use Respond on a transcript line or a card.</p>
      ) : null}

      <div className="mt-2 flex items-center gap-2">
        {signedIn ? (
          <button type="button" className={primaryButtonClass} disabled={busy || !text.trim() || correctionNeedsTarget} onClick={submit} data-testid="composer-submit">
            {busy ? 'Posting…' : 'Post'}
          </button>
        ) : (
          <button type="button" className={primaryButtonClass} onClick={login}>
            Sign in to take part
          </button>
        )}
        <span className="text-[11px] text-slate-500">
          Posted as {state.viewer.name ?? 'you'}. Your words are kept as written.
        </span>
      </div>
      {msg ? (
        <p className={`mt-2 text-xs ${msg.ok ? 'text-emerald-300' : 'text-rose-300'}`} data-testid="composer-msg">
          {msg.text}
        </p>
      ) : null}
    </div>
  );
}

function QuestionQueue() {
  const { state, act } = useWorkspace();
  const facilitator = state.viewer.role === 'facilitator' || state.viewer.role === 'administrator';
  const qs = useMemo(() => questionStates(state), [state]);
  const questions = state.contributions.filter((c) => c.kind === 'question');
  const open = questions.filter((q) => !qs.get(q.id)?.combinedInto && !qs.get(q.id)?.answered);
  const combinedUnder = (id: string) => questions.filter((q) => qs.get(q.id)?.combinedInto === id);
  const active = open.filter((q) => !qs.get(q.id)?.deferred);
  active.sort((a, b) => Number(!!qs.get(b.id)?.prioritized) - Number(!!qs.get(a.id)?.prioritized) || a.createdAt.localeCompare(b.createdAt));
  const deferred = open.filter((q) => qs.get(q.id)?.deferred);
  const [combineFrom, setCombineFrom] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const moderate = async (contributionId: string, action: string, relatedId?: string) => {
    const r = await act('moderation.add', { contributionId, action, relatedId });
    setErr(r.ok ? null : r.message);
  };

  const row = (q: Contribution) => {
    const s = qs.get(q.id);
    const merged = combinedUnder(q.id);
    return (
      <li key={q.id} className="rounded-lg border border-slate-800 p-2" data-testid="queue-item" data-contribution-id={q.id}>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {s?.prioritized ? <span className="rounded bg-cyan-900/60 px-1.5 text-cyan-200">prioritized</span> : null}
          {s?.deferred ? <span className="rounded bg-slate-800 px-1.5 text-slate-300">deferred</span> : null}
          <span className="text-amber-200" data-testid="queue-status">Queued for Claude</span>
        </div>
        <ContributionLine k={q} />
        <TargetNote q={q} />
        {merged.length ? (
          <div className="mt-1 border-l border-slate-700 pl-2 text-[11px] text-slate-400">
            Combined with this question:
            {merged.map((m) => (
              <ContributionLine key={m.id} k={m} />
            ))}
          </div>
        ) : null}
        {facilitator ? (
          <div className="mt-1.5 flex flex-wrap gap-1">
            <button type="button" className={buttonClass} onClick={() => moderate(q.id, s?.prioritized ? 'deprioritize' : 'prioritize')} data-testid="queue-prioritize">
              {s?.prioritized ? 'Unprioritize' : 'Prioritize'}
            </button>
            <button type="button" className={buttonClass} onClick={() => moderate(q.id, s?.deferred ? 'undefer' : 'defer')} data-testid="queue-defer">
              {s?.deferred ? 'Bring back' : 'Defer'}
            </button>
            {combineFrom === null ? (
              <button type="button" className={buttonClass} onClick={() => setCombineFrom(q.id)}>
                Combine…
              </button>
            ) : combineFrom === q.id ? (
              <button type="button" className={buttonClass} onClick={() => setCombineFrom(null)}>
                Cancel combine
              </button>
            ) : (
              <button
                type="button"
                className={buttonClass}
                onClick={async () => {
                  await moderate(combineFrom, 'combine', q.id);
                  setCombineFrom(null);
                }}
              >
                Combine into this
              </button>
            )}
          </div>
        ) : null}
      </li>
    );
  };

  return (
    <div className={`${panelClass} p-3`} data-testid="question-queue">
      <h4 className="text-sm font-semibold text-white">Unanswered questions ({open.length})</h4>
      <p className="mt-0.5 text-[11px] text-slate-500">
        Shared queue. Facilitators can prioritize, defer or combine questions; originals are never deleted.
      </p>
      {err ? <p className="mt-1 text-xs text-rose-300">{err}</p> : null}
      <ul className="mt-2 max-h-[28rem] space-y-2 overflow-y-auto [overflow-anchor:auto]" data-testid="queue-list">
        {active.map(row)}
        {active.length === 0 ? <li className="text-xs text-slate-500">No open questions.</li> : null}
      </ul>
      {deferred.length ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs text-slate-400">Deferred ({deferred.length})</summary>
          <ul className="mt-2 space-y-2">{deferred.map(row)}</ul>
        </details>
      ) : null}
    </div>
  );
}

function TargetNote({ q }: { q: Contribution }) {
  const { state, showSegment, showCard } = useWorkspace();
  if (q.targetType === 'meeting' || !q.targetId) return null;
  if (q.targetType === 'segment') {
    return (
      <button type="button" className="text-[11px] text-cyan-300" onClick={() => showSegment(q.targetId!)}>
        about a transcript line
      </button>
    );
  }
  const card = state.cards.find((c) => c.id === q.targetId);
  const title = card ? card.revs[card.revs.length - 1].title : 'a card';
  return (
    <button type="button" className="text-left text-[11px] text-cyan-300" onClick={() => showCard(q.targetId!)}>
      about: {title}
    </button>
  );
}

function Feed() {
  const { state, act } = useWorkspace();
  const facilitator = state.viewer.role === 'facilitator' || state.viewer.role === 'administrator';
  const items = state.contributions.filter((c) => c.kind !== 'question');
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className={`${panelClass} p-3`} data-testid="feed">
      <h4 className="text-sm font-semibold text-white">Comments, suggestions and corrections ({items.length})</h4>
      {msg ? <p className="mt-1 text-xs text-slate-400">{msg}</p> : null}
      <ul className="mt-2 max-h-[28rem] space-y-2 overflow-y-auto [overflow-anchor:auto]" data-testid="feed-list">
        {items.length === 0 ? <li className="text-xs text-slate-500">Nothing yet.</li> : null}
        {items.map((k) => (
          <li key={k.id} className="rounded-lg border border-slate-800 p-2">
            <ContributionLine k={k} />
            <TargetNote q={k} />
            {facilitator && k.kind === 'suggested_option' ? (
              <button
                type="button"
                className={`${buttonClass} mt-1`}
                onClick={async () => {
                  const parent = k.targetType === 'topic' ? k.targetId : null;
                  const r = await act('card.create', {
                    cardType: 'proposed_option',
                    parentId: parent,
                    title: k.body.slice(0, 280),
                    body: '',
                    label: 'participant_proposal',
                    sourceRefs: [{ type: 'contribution', id: k.id }],
                    reason: `Added from ${k.authorName || 'a participant'}'s suggestion`,
                  });
                  setMsg(r.ok ? 'Added as an option card.' : r.message);
                }}
              >
                Add as option card
              </button>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-slate-500">{CONTRIBUTION_KIND_TEXT.correction_request}s on transcript lines are decided in the transcript.</p>
    </div>
  );
}
