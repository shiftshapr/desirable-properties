'use client';

import { memo, useMemo, useState } from 'react';
import {
  CARD_LABELS,
  CARD_LABEL_TEXT,
  CARD_TYPE_LABEL,
  CONTRIBUTION_KIND_TEXT,
  currentCardRev,
  type Card,
  type CardLabel,
  type Contribution,
} from '@/lib/listening/types';
import {
  buttonClass,
  formatWhen,
  LabelChip,
  panelClass,
  SourceChips,
  useWorkspace,
} from '@/components/listening/ui';

type Index = {
  byParent: Map<string | null, Card[]>;
  comments: Map<string, Contribution[]>;
};

function useIndex(): Index {
  const { state } = useWorkspace();
  const { cards, contributions } = state;
  return useMemo(() => {
    const byParent = new Map<string | null, Card[]>();
    for (const c of cards) {
      const list = byParent.get(c.parentId) ?? [];
      list.push(c);
      byParent.set(c.parentId, list);
    }
    for (const list of byParent.values()) list.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
    const comments = new Map<string, Contribution[]>();
    for (const k of contributions) {
      if ((k.targetType === 'card' || k.targetType === 'topic') && k.targetId) {
        const list = comments.get(k.targetId) ?? [];
        list.push(k);
        comments.set(k.targetId, list);
      }
    }
    return { byParent, comments };
  }, [cards, contributions]);
}

export default function SharedUnderstanding() {
  const [view, setView] = useState<'cards' | 'compare'>('cards');
  const idx = useIndex();
  const top = idx.byParent.get(null) ?? [];
  const summary = top.filter((c) => c.cardType === 'summary_point');
  const topics = top.filter((c) => c.cardType === 'discussion_topic');
  const open = top.filter((c) => c.cardType === 'unresolved_issue');
  const other = top.filter((c) => !['summary_point', 'discussion_topic', 'unresolved_issue'].includes(c.cardType));

  return (
    <div className="space-y-5" data-testid="shared-understanding">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="mr-auto text-lg font-semibold text-white">Shared understanding</h3>
        <div role="tablist" aria-label="View" className="flex gap-1">
          {(['cards', 'compare'] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              data-testid={`view-${v}`}
              onClick={() => setView(v)}
              className={`rounded-lg px-2.5 py-1 text-xs ${view === v ? 'bg-slate-200 font-semibold text-slate-900' : 'border border-slate-700 text-slate-300'}`}
            >
              {v === 'cards' ? 'Cards' : 'Compare options'}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-slate-500">
        A revisable account of what was said, built from the transcript. Each card links to the moments it rests on,
        or is labelled as a suggestion. Nothing here is a decision; silence or repetition is never read as agreement.
      </p>

      {/* Both views stay mounted so open threads and editors survive switching. */}
      <div className={view === 'cards' ? 'space-y-6' : 'hidden'}>
        {summary.length ? (
          <Group title="Summary points" testId="group-summary">
            {summary.map((c) => (
              <CardView key={c.id} card={c} idx={idx} />
            ))}
          </Group>
        ) : null}
        {topics.length ? (
          <Group title="Topics and options" testId="group-topics">
            {topics.map((c) => (
              <CardView key={c.id} card={c} idx={idx} />
            ))}
          </Group>
        ) : null}
        {open.length ? (
          <Group title="Unresolved questions" testId="group-open">
            {open.map((c) => (
              <CardView key={c.id} card={c} idx={idx} />
            ))}
          </Group>
        ) : null}
        {other.length ? (
          <Group title="Other cards" testId="group-other">
            {other.map((c) => (
              <CardView key={c.id} card={c} idx={idx} />
            ))}
          </Group>
        ) : null}
        {!top.length ? <p className="text-sm text-slate-500">No cards yet. They appear as the meeting is processed.</p> : null}
      </div>

      <div className={view === 'compare' ? 'space-y-6' : 'hidden'} data-testid="compare-view">
        {topics.map((t) => (
          <CompareTopic key={t.id} topic={t} idx={idx} />
        ))}
      </div>
    </div>
  );
}

function Group({ title, testId, children }: { title: string; testId: string; children: React.ReactNode }) {
  return (
    <section data-testid={testId}>
      <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">{title}</h4>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

const CardView = memo(function CardView({ card, idx, depth = 0 }: { card: Card; idx: Index; depth?: number }) {
  const { state, setTarget } = useWorkspace();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [threadOpen, setThreadOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const rev = currentCardRev(card);
  const children = idx.byParent.get(card.id) ?? [];
  const comments = idx.comments.get(card.id) ?? [];
  const facilitator = state.viewer.role === 'facilitator' || state.viewer.role === 'administrator';
  const withdrawn = rev.status === 'withdrawn';
  const isTopic = card.cardType === 'discussion_topic';

  return (
    <article
      id={`card-${card.id}`}
      data-testid="card"
      data-card-id={card.id}
      data-card-type={card.cardType}
      className={`${depth === 0 ? panelClass : 'rounded-xl border border-slate-800/80 bg-slate-950/30'} p-3 ${withdrawn ? 'opacity-60' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] uppercase tracking-wide text-slate-500">{CARD_TYPE_LABEL[card.cardType]}</span>
        <LabelChip label={rev.label} />
        {withdrawn ? <span className="text-[11px] text-rose-300">withdrawn</span> : null}
        {card.currentRev > 1 ? <span className="text-[11px] text-slate-500">revision {card.currentRev}</span> : null}
      </div>
      <h5 className={`mt-1 ${isTopic ? 'text-base font-semibold text-white' : 'text-sm font-medium text-slate-100'}`} data-testid="card-title">
        {rev.title}
      </h5>
      {rev.body ? <p className="mt-1 whitespace-pre-line text-sm text-slate-300">{rev.body}</p> : null}
      <div className="mt-2">
        <SourceChips refs={rev.sourceRefs} />
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          className={buttonClass}
          data-testid="card-respond"
          onClick={() => setTarget({ type: isTopic ? 'topic' : 'card', id: card.id, label: rev.title })}
        >
          Respond
        </button>
        <button type="button" className={buttonClass} data-testid="card-thread-toggle" aria-expanded={threadOpen} onClick={() => setThreadOpen((o) => !o)}>
          {threadOpen ? 'Hide comments' : `Comments (${comments.length})`}
        </button>
        {card.revs.length > 1 ? (
          <button type="button" className={buttonClass} aria-expanded={historyOpen} onClick={() => setHistoryOpen((o) => !o)} data-testid="card-history-toggle">
            {historyOpen ? 'Hide history' : `History (${card.revs.length})`}
          </button>
        ) : null}
        {facilitator ? (
          <button type="button" className={buttonClass} onClick={() => setEditing((e) => !e)} data-testid="card-revise">
            {editing ? 'Close editor' : 'Revise'}
          </button>
        ) : null}
      </div>

      {historyOpen ? (
        <ol className="mt-2 space-y-2 border-l border-slate-700 pl-3 text-xs" data-testid="card-history">
          {[...card.revs].reverse().map((r) => (
            <li key={r.rev}>
              <span className="text-slate-400">
                Revision {r.rev} · {r.actorName ?? 'import'}
                {r.actorRole ? ` (${r.actorRole})` : ''} · {formatWhen(r.createdAt)}
              </span>
              <span className="block text-slate-200">{r.title}</span>
              {r.body ? <span className="block whitespace-pre-line text-slate-400">{r.body}</span> : null}
              {r.reason ? <span className="block text-slate-500">Why: {r.reason}</span> : null}
            </li>
          ))}
        </ol>
      ) : null}

      {editing ? <CardEditor card={card} onDone={() => setEditing(false)} /> : null}

      {threadOpen ? (
        <div className="mt-2 space-y-2 border-l border-slate-700 pl-3" data-testid="card-thread">
          {comments.length === 0 ? <p className="text-xs text-slate-500">No comments yet. Use Respond to add one.</p> : null}
          {comments.map((k) => (
            <ContributionLine key={k.id} k={k} />
          ))}
        </div>
      ) : null}

      {children.length ? (
        <div className="mt-3 space-y-2">
          {children.map((c) => (
            <CardView key={c.id} card={c} idx={idx} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </article>
  );
});

export function ContributionLine({ k }: { k: Contribution }) {
  return (
    <div className="text-xs" data-testid="contribution" data-contribution-id={k.id}>
      <span className="text-slate-400">
        {k.authorName || 'Participant'} · {CONTRIBUTION_KIND_TEXT[k.kind]} · {formatWhen(k.createdAt)}
        {k.timing === 'before' ? ' · before the meeting' : k.timing === 'after' ? ' · after the meeting' : ''}
      </span>
      <p className="whitespace-pre-line text-slate-200">{k.body}</p>
      {k.proposedText ? <p className="whitespace-pre-line text-slate-400">Suggested text: {k.proposedText}</p> : null}
    </div>
  );
}

function CardEditor({ card, onDone }: { card: Card; onDone: () => void }) {
  const { act } = useWorkspace();
  // The revision this editor started from: a newer revision by someone else makes the save fail (409).
  const [baseRev] = useState(card.currentRev);
  const start = card.revs.find((r) => r.rev === baseRev) ?? currentCardRev(card);
  const [title, setTitle] = useState(start.title);
  const [body, setBody] = useState(start.body);
  const [label, setLabel] = useState<CardLabel | ''>(start.label ?? '');
  const [reason, setReason] = useState('');
  const [withdraw, setWithdraw] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const changedSince = card.currentRev !== baseRev;
  return (
    <div className="mt-2 space-y-2 rounded-lg border border-slate-700 p-2" data-testid="card-editor">
      {changedSince ? (
        <p className="text-xs text-amber-300" data-testid="card-editor-stale">
          Someone revised this card while you were editing (now revision {card.currentRev}). Saving will be refused; copy your
          change, close the editor and reopen it on the new revision.
        </p>
      ) : null}
      <input value={title} onChange={(e) => setTitle(e.target.value)} className="block w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm" aria-label="Title" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className="block w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm" aria-label="Body" />
      <select value={label} onChange={(e) => setLabel(e.target.value as CardLabel | '')} className="block w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm" aria-label="Label">
        <option value="">No label</option>
        {CARD_LABELS.filter((l) => l !== 'council_decision').map((l) => (
          <option key={l} value={l}>
            {CARD_LABEL_TEXT[l]}
          </option>
        ))}
      </select>
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why it changes (required)" className="block w-full rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm" aria-label="Reason" data-testid="card-editor-reason" />
      <label className="flex items-center gap-2 text-xs text-slate-400">
        <input type="checkbox" checked={withdraw} onChange={(e) => setWithdraw(e.target.checked)} /> Withdraw this card (it stays in the record)
      </label>
      <button
        type="button"
        className={buttonClass}
        disabled={busy}
        data-testid="card-editor-save"
        onClick={async () => {
          setBusy(true);
          const r = await act('card.revise', {
            cardId: card.id,
            baseRev,
            title,
            body,
            label: label || null,
            sourceRefs: start.sourceRefs,
            status: withdraw ? 'withdrawn' : 'active',
            reason,
          });
          setBusy(false);
          if (r.ok) onDone();
          else setMsg(r.message);
        }}
      >
        Save revision
      </button>
      {msg ? <p className="text-xs text-rose-300" data-testid="card-editor-msg">{msg}</p> : null}
    </div>
  );
}

function CompareTopic({ topic, idx }: { topic: Card; idx: Index }) {
  const { setTarget } = useWorkspace();
  const t = currentCardRev(topic);
  const options = (idx.byParent.get(topic.id) ?? []).filter((c) => c.cardType === 'proposed_option');
  const topicConcerns = (idx.byParent.get(topic.id) ?? []).filter((c) => c.cardType === 'objection' || c.cardType === 'supporting_reason');
  return (
    <section className={`${panelClass} p-3`} data-testid="compare-topic">
      <h4 className="text-sm font-semibold text-white">{t.title}</h4>
      {options.length === 0 ? <p className="mt-1 text-xs text-slate-500">No options recorded yet.</p> : null}
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="py-1 pr-2 font-medium">Option</th>
              <th className="py-1 pr-2 font-medium">Label and sources</th>
              <th className="py-1 pr-2 font-medium">Reasons given for</th>
              <th className="py-1 pr-2 font-medium">Concerns raised</th>
              <th className="py-1 font-medium" />
            </tr>
          </thead>
          <tbody>
            {options.map((o) => {
              const r = currentCardRev(o);
              const kids = idx.byParent.get(o.id) ?? [];
              const pros = kids.filter((c) => c.cardType === 'supporting_reason');
              const cons = kids.filter((c) => c.cardType === 'objection');
              return (
                <tr key={o.id} className="border-b border-slate-800/70 align-top">
                  <td className="py-2 pr-2 text-slate-100">
                    {r.title}
                    {r.status === 'withdrawn' ? <span className="ml-1 text-rose-300">(withdrawn)</span> : null}
                  </td>
                  <td className="space-y-1 py-2 pr-2">
                    <LabelChip label={r.label} />
                    <div>
                      <SourceChips refs={r.sourceRefs} />
                    </div>
                  </td>
                  <td className="py-2 pr-2 text-slate-300">
                    {pros.length ? pros.map((p) => <p key={p.id}>{currentCardRev(p).title}</p>) : <span className="text-slate-600">None recorded</span>}
                  </td>
                  <td className="py-2 pr-2 text-slate-300">
                    {cons.length ? cons.map((p) => <p key={p.id}>{currentCardRev(p).title}</p>) : <span className="text-slate-600">None recorded</span>}
                  </td>
                  <td className="py-2">
                    <button type="button" className={buttonClass} onClick={() => setTarget({ type: 'card', id: o.id, label: r.title })}>
                      Respond
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {topicConcerns.length ? (
        <div className="mt-2 text-xs text-slate-400">
          On the topic as a whole:
          <ul className="mt-1 list-disc pl-5">
            {topicConcerns.map((c) => (
              <li key={c.id}>
                {CARD_TYPE_LABEL[c.cardType]}: {currentCardRev(c).title}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
