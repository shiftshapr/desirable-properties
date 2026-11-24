'use client';

import { useState } from 'react';
import {
  REASON_MAX,
  REASON_MIN,
  acceptsObjections,
  outcomeLabel,
  type QuestionScreening,
  type ScreeningStatus,
  type ScreeningView,
} from '@/lib/screening/screening-core';
import { pacificAndUtc } from '@/lib/sessions/session-phases';

type Props = {
  slug: string;
  initial: QuestionScreening;
  status: ScreeningStatus;
  member: boolean;
};

const btn =
  'inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50';

const OUTCOME_STYLE: Record<QuestionScreening['outcome'], string> = {
  pending: 'text-slate-300',
  goes_to_ballot: 'text-emerald-300',
  held_back: 'text-amber-300',
};

/** Council screening for one draft question: public objections, and Object / Withdraw for a council member. */
export default function ScreeningQuestionPanel({ slug, initial, status, member }: Props) {
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canAct = member && acceptsObjections(status);
  const hasMine = q.standing.some((o) => o.mine);
  const trimmed = reason.replace(/\s+/g, ' ').trim();

  async function send(body: Record<string, string>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/sessions/${encodeURIComponent(slug)}/screening`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as ScreeningView | { ok: false; error?: string };
      if (!json.ok) {
        setError(json.error || 'That did not work. Reload the page and try again.');
        return;
      }
      const next = json.questions.find((x) => x.key === q.key);
      if (next) setQ(next);
      setReason('');
      setOpen(false);
    } catch {
      setError('Could not reach the site. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 border-t border-slate-800 pt-2 text-sm" aria-label={`Council screening, question ${q.n}`}>
      <p>
        <span className="text-slate-400">Council screening: </span>
        <strong className={OUTCOME_STYLE[q.outcome]}>{outcomeLabel(q)}</strong>
      </p>
      {q.standing.length ? (
        <ul className="mt-2 space-y-2">
          {q.standing.map((o) => (
            <li key={o.id} className="rounded-lg border border-amber-800/50 bg-amber-950/20 px-3 py-2 text-slate-200">
              <p>
                <strong className="text-white">{o.name}</strong> objected: {o.reason}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                {pacificAndUtc(o.createdAt)}
                {o.mine && canAct ? (
                  <button
                    type="button"
                    className="ml-3 text-cyan-300 underline hover:text-cyan-200 disabled:opacity-50"
                    disabled={busy}
                    onClick={() => void send({ action: 'withdraw', id: o.id })}
                  >
                    Withdraw
                  </button>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      {q.withdrawn.length ? (
        <ul className="mt-2 space-y-1 text-xs text-slate-400">
          {q.withdrawn.map((o) => (
            <li key={o.id}>
              Withdrawn: {o.name} objected on {pacificAndUtc(o.createdAt)} (&ldquo;{o.reason}&rdquo;) and withdrew it on{' '}
              {o.withdrawnAt ? pacificAndUtc(o.withdrawnAt) : ''}.
            </li>
          ))}
        </ul>
      ) : null}
      {canAct && !hasMine ? (
        open ? (
          <form
            className="mt-2 space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (trimmed.length >= REASON_MIN) void send({ action: 'object', question: q.key, reason: trimmed });
            }}
          >
            <label className="block text-slate-300" htmlFor={`objection-${q.key}`}>
              Your reason (required, shown publicly with your name)
            </label>
            <textarea
              id={`objection-${q.key}`}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100"
              rows={3}
              maxLength={REASON_MAX}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" className={`${btn} bg-amber-500 text-slate-950 hover:bg-amber-400`} disabled={busy || trimmed.length < REASON_MIN}>
                Object to this question
              </button>
              <button type="button" className={`${btn} border border-slate-700 text-slate-300`} onClick={() => setOpen(false)} disabled={busy}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className={`${btn} mt-2 border border-amber-700/70 text-amber-200 hover:bg-amber-950/40`} onClick={() => setOpen(true)}>
            Object to this question
          </button>
        )
      ) : null}
      {error ? <p className="mt-2 text-rose-300">{error}</p> : null}
    </div>
  );
}
