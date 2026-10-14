'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CommentDraft, OpenComment } from '@/lib/review-comments.server';

type Props = {
  workgroupId: string;
  canAct: boolean;
  /** Called after a proposal is filed, so the Review queue can reload. */
  onFiled: () => void;
};

type Panel =
  | { kind: 'draft'; loading: boolean; draftId: string | null; model: string | null; draft: CommentDraft | null; mode: 'replace' | 'insert'; text: string; rationale: string }
  | { kind: 'ask'; text: string }
  | { kind: 'dismiss'; note: string };

const STATUS_LABEL: Record<OpenComment['status'], string> = {
  open: 'Open',
  proposed: 'Turned into a proposal',
  asked: 'Asked the commenter',
  dismissed: 'Not actionable',
};

/** Anchored reader comments on this DP, and turning them into proposals. */
export default function ReviewCommentsSection({ workgroupId, canAct, onFiled }: Props) {
  const [comments, setComments] = useState<OpenComment[] | null>(null);
  const [showHandled, setShowHandled] = useState(false);
  const [panels, setPanels] = useState<Record<string, Panel>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/review/comments`, { cache: 'no-store' });
    const body = (await res.json().catch(() => ({}))) as { comments?: OpenComment[] };
    setComments(body.comments || []);
  }, [workgroupId]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/review/comments`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((body: { comments?: OpenComment[] }) => {
        if (!cancelled) setComments(body.comments || []);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workgroupId]);

  async function act(key: string, payload: Record<string, unknown>) {
    const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/review/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentKey: key, ...payload }),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
    if (!res.ok) throw new Error(body.error || `Failed (${res.status})`);
    return body;
  }

  function setPanel(key: string, panel: Panel | null) {
    setPanels((prev) => {
      const next = { ...prev };
      if (panel) next[key] = panel;
      else delete next[key];
      return next;
    });
  }

  async function startDraft(c: OpenComment) {
    setMessage((m) => ({ ...m, [c.key]: '' }));
    setPanel(c.key, { kind: 'draft', loading: true, draftId: null, model: null, draft: null, mode: 'replace', text: '', rationale: '' });
    try {
      const out = (await act(c.key, { action: 'draft' })) as { draftId: string; model: string | null; draft: CommentDraft };
      setPanel(c.key, {
        kind: 'draft',
        loading: false,
        draftId: out.draftId,
        model: out.model,
        draft: out.draft,
        mode: out.draft.action === 'insert' ? 'insert' : 'replace',
        text: out.draft.proposedText || (out.draft.action === 'none' ? '' : c.passage),
        rationale: out.draft.rationale || '',
      });
    } catch (err) {
      setPanel(c.key, { kind: 'draft', loading: false, draftId: null, model: null, draft: null, mode: 'replace', text: c.passage, rationale: '' });
      setMessage((m) => ({ ...m, [c.key]: `AI draft unavailable (${err instanceof Error ? err.message : 'error'}). You can still write the proposal yourself.` }));
    }
  }

  async function submit(c: OpenComment, panel: Panel) {
    setBusy(c.key);
    try {
      if (panel.kind === 'draft') {
        await act(c.key, { action: 'file', draftId: panel.draftId, mode: panel.mode, proposedText: panel.text, rationale: panel.rationale });
        onFiled();
      } else if (panel.kind === 'ask') {
        await act(c.key, { action: 'ask', text: panel.text });
      } else {
        await act(c.key, { action: 'dismiss', note: panel.note });
      }
      setPanel(c.key, null);
      await load();
    } catch (err) {
      setMessage((m) => ({ ...m, [c.key]: err instanceof Error ? err.message : 'Failed' }));
    } finally {
      setBusy(null);
    }
  }

  async function reopen(c: OpenComment) {
    setBusy(c.key);
    try {
      await act(c.key, { action: 'reopen' });
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (!comments) return <p className="text-sm text-slate-500">Loading comments…</p>;
  const open = comments.filter((c) => c.status === 'open');
  const handled = comments.filter((c) => c.status !== 'open');
  if (!comments.length) return null;

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
      <h3 className="text-base font-semibold text-white">Open comments · {open.length}</h3>
      <p className="mt-1 max-w-3xl text-sm text-slate-400">
        Reader comments on passages of this chapter, from Gov Hub and book Discuss. Turn each into a proposal, ask the
        commenter what they mean, or close it with a note.
      </p>

      <ul className="mt-4 space-y-3">
        {[...open, ...(showHandled ? handled : [])].map((c) => {
          const panel = panels[c.key];
          return (
            <li key={c.key} className="rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-sm">
              <p className="text-xs text-slate-500">
                {c.author} · {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''} ·{' '}
                {c.source === 'govhub' ? 'Gov Hub' : 'Book Discuss'}
                {c.replies ? ` · ${c.replies} repl${c.replies === 1 ? 'y' : 'ies'}` : ''}
                {c.href ? (
                  <>
                    {' · '}
                    <a href={c.href} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline">
                      Open
                    </a>
                  </>
                ) : null}
              </p>
              <blockquote className="mt-2 border-l-2 border-slate-700 pl-3 text-slate-400">
                {c.passage.length > 300 ? `${c.passage.slice(0, 300)}…` : c.passage}
              </blockquote>
              <p className="mt-2 whitespace-pre-wrap text-slate-100">{c.text}</p>

              {c.status !== 'open' ? (
                <p className="mt-2 text-xs text-slate-400">
                  <span className="rounded-full border border-slate-700 px-2 py-0.5">{STATUS_LABEL[c.status]}</span>
                  {c.actorName ? ` by ${c.actorName}` : ''}
                  {c.note ? ` – ${c.note}` : ''}
                  {canAct ? (
                    <button type="button" onClick={() => void reopen(c)} disabled={busy === c.key} className="ml-2 underline hover:text-slate-200">
                      Reopen
                    </button>
                  ) : null}
                </p>
              ) : canAct && !panel ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" onClick={() => void startDraft(c)} className="rounded-lg bg-cyan-800 px-3 py-1.5 text-white hover:bg-cyan-700">
                    Draft a proposal
                  </button>
                  <button type="button" onClick={() => setPanel(c.key, { kind: 'ask', text: '' })} className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-200 hover:border-slate-500">
                    Ask the commenter
                  </button>
                  <button type="button" onClick={() => setPanel(c.key, { kind: 'dismiss', note: '' })} className="rounded-lg border border-slate-700 px-3 py-1.5 text-slate-200 hover:border-rose-700">
                    Not actionable
                  </button>
                </div>
              ) : null}

              {panel?.kind === 'draft' ? (
                panel.loading ? (
                  <p className="mt-3 text-xs text-slate-500">Drafting a proposal from the comment… (up to a minute)</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {panel.draft ? (
                      <p className="text-xs uppercase tracking-wide text-slate-500">
                        AI draft{panel.model ? ` · ${panel.model}` : ''} · edit before filing
                      </p>
                    ) : null}
                    {panel.draft?.action === 'none' ? (
                      <p className="text-amber-200">
                        The AI suggests this comment needs no text change: {panel.draft.whyNone || 'no reason given'}. You can
                        still write a proposal, or ask the commenter.
                      </p>
                    ) : null}
                    <label className="block text-xs text-slate-400">
                      Change type
                      <select
                        value={panel.mode}
                        onChange={(e) => setPanel(c.key, { ...panel, mode: e.target.value === 'insert' ? 'insert' : 'replace' })}
                        className="ml-2 rounded border border-slate-700 bg-slate-900 px-2 py-1 text-white"
                      >
                        <option value="replace">Replace the passage</option>
                        <option value="insert">Insert after the passage</option>
                      </select>
                    </label>
                    <textarea
                      value={panel.text}
                      onChange={(e) => setPanel(c.key, { ...panel, text: e.target.value })}
                      rows={5}
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                      placeholder={panel.mode === 'insert' ? 'New text to insert after the passage' : 'The passage as it should read'}
                    />
                    <textarea
                      value={panel.rationale}
                      onChange={(e) => setPanel(c.key, { ...panel, rationale: e.target.value })}
                      rows={2}
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                      placeholder="Rationale (the comment is credited automatically)"
                    />
                    <p className="text-xs text-slate-500">
                      Filed to Gov Hub under your name, crediting {c.author}. Co-editors decide it like any proposal.
                    </p>
                    <PanelButtons
                      busy={busy === c.key}
                      label="File as proposal"
                      disabled={!panel.text.trim()}
                      onSubmit={() => void submit(c, panel)}
                      onCancel={() => setPanel(c.key, null)}
                    />
                  </div>
                )
              ) : null}

              {panel?.kind === 'ask' ? (
                <div className="mt-3 space-y-2">
                  {c.source === 'govhub' ? (
                    <textarea
                      value={panel.text}
                      onChange={(e) => setPanel(c.key, { ...panel, text: e.target.value })}
                      rows={2}
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                      placeholder="Your question, posted as a reply under the comment"
                    />
                  ) : (
                    <p className="text-slate-300">
                      Reply to {c.author} in{' '}
                      {c.href ? (
                        <a href={c.href} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline">
                          book Discuss
                        </a>
                      ) : (
                        'book Discuss'
                      )}
                      , then mark the comment as asked. A note here is optional.
                    </p>
                  )}
                  {c.source === 'canopi' ? (
                    <input
                      value={panel.text}
                      onChange={(e) => setPanel(c.key, { ...panel, text: e.target.value })}
                      className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                      placeholder="What you asked (optional)"
                    />
                  ) : null}
                  <PanelButtons
                    busy={busy === c.key}
                    label={c.source === 'govhub' ? 'Post reply' : 'Mark as asked'}
                    disabled={c.source === 'govhub' && !panel.text.trim()}
                    onSubmit={() => void submit(c, panel)}
                    onCancel={() => setPanel(c.key, null)}
                  />
                </div>
              ) : null}

              {panel?.kind === 'dismiss' ? (
                <div className="mt-3 space-y-2">
                  <input
                    value={panel.note}
                    onChange={(e) => setPanel(c.key, { ...panel, note: e.target.value })}
                    className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-white"
                    placeholder="Why it is not actionable (e.g. already covered in Section 6, or a question that was answered)"
                  />
                  <PanelButtons
                    busy={busy === c.key}
                    label="Close comment"
                    disabled={!panel.note.trim()}
                    onSubmit={() => void submit(c, panel)}
                    onCancel={() => setPanel(c.key, null)}
                  />
                </div>
              ) : null}

              {message[c.key] ? <p className="mt-2 text-xs text-amber-200">{message[c.key]}</p> : null}
            </li>
          );
        })}
      </ul>

      {handled.length ? (
        <button type="button" onClick={() => setShowHandled((v) => !v)} className="mt-3 text-xs text-slate-400 underline hover:text-slate-200">
          {showHandled ? 'Hide' : 'Show'} handled comments ({handled.length})
        </button>
      ) : null}
    </section>
  );
}

function PanelButtons({
  busy,
  label,
  disabled,
  onSubmit,
  onCancel,
}: {
  busy: boolean;
  label: string;
  disabled: boolean;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onSubmit}
        disabled={busy || disabled}
        className="rounded-lg bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
      >
        {busy ? 'Working…' : label}
      </button>
      <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200">
        Cancel
      </button>
    </div>
  );
}
