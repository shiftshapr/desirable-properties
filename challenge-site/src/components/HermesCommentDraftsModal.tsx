'use client';

import { useEffect, useState } from 'react';
import { bookDiscussPostHref } from '@/lib/govhub';

type Draft = { perspective: string; label: string; content: string };
type Turn = { sender: 'user' | 'assistant'; text: string };
type TargetKind = 'page' | 'reply' | 'quote';

const UUID_IN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/**
 * "Turn this into a Canopi comment" (Canopi spec §G): 2–3 perspective drafts from the last turn
 * or the whole thread. The person edits one, picks where it goes, and posts it as themself
 * (AI-assisted). Nothing posts without the Post click.
 */
export default function HermesCommentDraftsModal({
  scope,
  turns,
  dpFocus,
  onClose,
}: {
  scope: 'turn' | 'thread';
  turns: Turn[];
  dpFocus: number | null;
  onClose: () => void;
}) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [active, setActive] = useState(0);
  const [text, setText] = useState('');
  const [original, setOriginal] = useState('');
  const [kind, setKind] = useState<TargetKind>('page');
  const [targetRef, setTargetRef] = useState('');
  const [busy, setBusy] = useState<'drafting' | 'posting' | null>('drafting');
  const [error, setError] = useState<string | null>(null);
  const [posted, setPosted] = useState<{ messageId: string | null; pageId?: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/agent/comments/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scope, turns, dpFocus }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !Array.isArray(data.drafts) || !data.drafts.length) {
          setError(data.error || 'Deepi could not draft comments. Try again.');
        } else {
          setDrafts(data.drafts);
          setText(data.drafts[0].content);
          setOriginal(data.drafts[0].content);
        }
      } catch {
        if (!cancelled) setError('Deepi could not draft comments. Try again.');
      } finally {
        if (!cancelled) setBusy(null);
      }
    })();
    return () => { cancelled = true; };
  }, [scope, turns, dpFocus]);

  function pick(i: number) {
    setActive(i);
    setText(drafts[i].content);
    setOriginal(drafts[i].content);
  }

  async function post() {
    const messageId = kind === 'page' ? undefined : (targetRef.match(UUID_IN)?.[0] ?? '');
    if (kind !== 'page' && !messageId) {
      setError('Paste the Canopi post link or id to reply to or quote.');
      return;
    }
    setBusy('posting');
    setError(null);
    try {
      const res = await fetch('/api/agent/comments/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          perspective: drafts[active]?.perspective,
          edited: text.trim() !== original.trim(),
          target: { kind, messageId },
          dpFocus,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || 'Posting failed.');
      else setPosted({ messageId: data.messageId || null, pageId: data.pageId || null });
    } catch {
      setError('Posting failed.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Turn this into a Canopi comment">
      <div className="w-full max-w-xl rounded-xl border border-slate-700 bg-slate-900 p-4 text-slate-100 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            Canopi comment from {scope === 'turn' ? 'this turn' : 'the whole thread'}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-200" aria-label="Close">×</button>
        </div>

        {busy === 'drafting' ? <p className="text-xs text-slate-400">Deepi is drafting three perspectives…</p> : null}

        {posted ? (
          <div className="space-y-3 text-sm">
            <p className="text-emerald-300">Posted to Canopi under your name (marked AI-assisted).</p>
            {posted.messageId ? (
              <a className="text-cyan-300 underline" href={bookDiscussPostHref({ messageId: posted.messageId, pageId: posted.pageId ?? null })} target="_blank" rel="noopener noreferrer">View it on Canopi</a>
            ) : null}
            <div><button type="button" onClick={onClose} className="rounded-md border border-slate-600 px-3 py-1 text-xs">Done</button></div>
          </div>
        ) : drafts.length ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2" role="tablist">
              {drafts.map((d, i) => (
                <button key={d.perspective} type="button" role="tab" aria-selected={i === active}
                  onClick={() => pick(i)}
                  className={`rounded-full border px-3 py-1 text-[11px] ${i === active ? 'border-cyan-500 bg-cyan-950/50 text-cyan-100' : 'border-slate-600 text-slate-300'}`}>
                  {d.label}
                </button>
              ))}
            </div>
            <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={7}
              className="w-full rounded-md border border-slate-600 bg-slate-950 p-2 text-sm text-slate-100" aria-label="Comment text" />
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="text-slate-400">Post as</span>
              {(['page', 'reply', 'quote'] as TargetKind[]).map((k) => (
                <label key={k} className="flex items-center gap-1">
                  <input type="radio" name="comment-target" checked={kind === k} onChange={() => setKind(k)} />
                  {k === 'page' ? 'A comment on the page' : k === 'reply' ? 'A reply' : 'A quote'}
                </label>
              ))}
            </div>
            {kind !== 'page' ? (
              <input value={targetRef} onChange={(e) => setTargetRef(e.target.value)} placeholder="Paste the Canopi post link or id"
                className="w-full rounded-md border border-slate-600 bg-slate-950 p-2 text-xs" />
            ) : null}
            <p className="text-[11px] text-slate-400">Posts under your name, marked AI-assisted. Edit freely before posting.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-md border border-slate-600 px-3 py-1 text-xs">Cancel</button>
              <button type="button" disabled={busy === 'posting' || !text.trim()} onClick={() => void post()}
                className="rounded-md bg-cyan-600 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50">
                {busy === 'posting' ? 'Posting…' : 'Post to Canopi'}
              </button>
            </div>
          </div>
        ) : null}

        {error ? <p className="mt-3 text-xs text-rose-300" role="alert">{error}</p> : null}
      </div>
    </div>
  );
}
