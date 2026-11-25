'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import SessionLabel from '@/components/sessions/SessionLabel';
import { LIMITS, type ProposalsView, type PublicProposal } from '@/lib/next-proposals/core';
import { pacificAndUtc } from '@/lib/sessions/session-phases';

type Props = {
  /** The target session's date (YYYY-MM-DD). The list is fetched on mount, so cached pages still show it live. */
  date: string;
  initial?: ProposalsView | null;
  signInHref: string;
  /** "box": on another session's page, with a heading naming the target session. "list": on the target's own page. */
  variant: 'box' | 'list';
  sessionLabel: string;
};

const btn = 'inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50';
const field = 'w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100';

/**
 * Participant proposals for a session's agenda: the list (name, time, supporters) and, while the session has not
 * started, a form to propose, Support / Withdraw buttons, and Hide (with a reason) for interim council members.
 */
export default function NextSessionProposals({ date, initial, signInHref, variant, sessionLabel }: Props) {
  const [view, setView] = useState<ProposalsView | null>(initial ?? null);
  const [name, setName] = useState(initial?.viewer.suggestedName ?? '');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [hideFor, setHideFor] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch(`/api/sessions/proposals/${encodeURIComponent(date)}`, { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => r.json())
      .then((j: ProposalsView | { ok: false }) => {
        if (!live || !j.ok) return;
        setView(j);
        setName((n) => n || j.viewer.suggestedName || '');
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [date]);

  if (!view) return <p className="mt-3 text-sm text-slate-400">Loading proposals…</p>;
  const { open, viewer } = view;

  async function send(payload: Record<string, string>, after?: string) {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch(`/api/sessions/proposals/${encodeURIComponent(date)}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as ProposalsView | { ok: false; error?: string };
      if (!json.ok) {
        setError(json.error || 'That did not work. Reload the page and try again.');
        return false;
      }
      setView(json);
      if (after) setDone(after);
      return true;
    } catch {
      setError('Could not reach the site. Try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  const standing = view.proposals.filter((p) => p.status === 'standing');
  const off = view.proposals.filter((p) => p.status !== 'standing');
  const nameOk = name.trim().length >= 2;

  const nameField = (id: string) => (
    <div>
      <label className="block text-sm text-slate-300" htmlFor={id}>
        Your name, as it will be shown (a real name, not an email or a handle)
      </label>
      <input id={id} className={field} maxLength={LIMITS.nameMax} value={name} onChange={(e) => setName(e.target.value)} required />
    </div>
  );

  function item(p: PublicProposal) {
    return (
      <li key={p.id} className="rounded-xl border border-emerald-800/50 bg-slate-900/40 px-4 py-3">
        <p className="font-semibold text-white">
          {p.title} <SessionLabel kind="Participant proposal" />
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Proposed by {p.name} ({pacificAndUtc(p.createdAt)})
          {p.supporters.length ? <> · Supported by {p.supporters.map((s) => s.name).join(', ')}</> : null}
        </p>
        <p className="mt-2 whitespace-pre-line">{p.body}</p>
        {open && viewer.signedIn ? (
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
            {!p.mine ? (
              p.supportedByMe ? (
                <button type="button" className="text-cyan-300 underline disabled:opacity-50" disabled={busy} onClick={() => void send({ action: 'unsupport', id: p.id })}>
                  Remove my support
                </button>
              ) : (
                <button
                  type="button"
                  className={`${btn} border border-emerald-700/70 text-emerald-200 hover:bg-emerald-950/40`}
                  disabled={busy || !nameOk}
                  title={nameOk ? undefined : 'Add your name first'}
                  onClick={() => void send({ action: 'support', id: p.id, name }, 'Support recorded.')}
                >
                  Support this
                </button>
              )
            ) : (
              <button type="button" className="text-cyan-300 underline disabled:opacity-50" disabled={busy} onClick={() => void send({ action: 'withdraw', id: p.id }, 'Withdrawn.')}>
                Withdraw my proposal
              </button>
            )}
            {viewer.member ? (
              <button type="button" className="text-amber-300 underline" onClick={() => setHideFor(hideFor === p.id ? null : p.id)}>
                Hide (council)
              </button>
            ) : null}
          </div>
        ) : null}
        {hideFor === p.id ? (
          <form
            className="mt-2 space-y-2"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await send({ action: 'hide', id: p.id, reason }, 'Hidden. The reason is shown in its place.')) {
                setHideFor(null);
                setReason('');
              }
            }}
          >
            <label className="block text-sm text-slate-300" htmlFor={`hide-${p.id}`}>
              Why hide it? Only for spam or something off-topic. Shown publicly with your name.
            </label>
            <textarea id={`hide-${p.id}`} className={field} rows={2} maxLength={LIMITS.reasonMax} value={reason} onChange={(e) => setReason(e.target.value)} required />
            <button type="submit" className={`${btn} bg-amber-500 text-slate-950`} disabled={busy || reason.trim().length < LIMITS.reasonMin}>
              Hide this proposal
            </button>
          </form>
        ) : null}
      </li>
    );
  }

  return (
    <div>
      {variant === 'box' ? (
        <p className="text-slate-300">
          Anyone signed in can put a proposal on the agenda of the next session ({sessionLabel}). It shows at once on{' '}
          <Link href={`${view.session.href}#proposals`} className="text-cyan-300 underline hover:text-cyan-200">
            that session&apos;s page
          </Link>{' '}
          with your name, is discussed in the session, and can then go on its ballot. Others can support it.
        </p>
      ) : (
        <p className="mt-3 text-sm text-slate-400">
          Proposals from participants, added on the site. Anyone signed in can add one{open ? ' until the session starts' : ''} and support others.
        </p>
      )}

      {standing.length ? <ol className="mt-4 space-y-4">{standing.map(item)}</ol> : variant === 'list' ? <p className="mt-3 text-sm text-slate-400">None yet.</p> : null}

      {off.length ? (
        <ul className="mt-3 space-y-1 text-xs text-slate-400">
          {off.map((p) => (
            <li key={p.id}>
              {p.status === 'hidden' && p.hidden
                ? `A proposal by ${p.name} was hidden by ${p.hidden.by} on ${pacificAndUtc(p.hidden.at)}: ${p.hidden.reason}`
                : `Withdrawn by ${p.name}: “${p.title}”${p.withdrawnAt ? ` (${pacificAndUtc(p.withdrawnAt)})` : ''}.`}
            </li>
          ))}
        </ul>
      ) : null}

      {open ? (
        viewer.signedIn ? (
          formOpen ? (
            <form
              className="mt-4 space-y-3 rounded-xl border border-slate-700 bg-slate-900/40 px-4 py-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await send({ action: 'propose', name, title, body }, `Added to the agenda of ${sessionLabel}.`)) {
                  setTitle('');
                  setBody('');
                  setFormOpen(false);
                }
              }}
            >
              {nameField('proposal-name')}
              <div>
                <label className="block text-sm text-slate-300" htmlFor="proposal-title">
                  Proposal, in one line
                </label>
                <input id="proposal-title" className={field} maxLength={LIMITS.titleMax} value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm text-slate-300" htmlFor="proposal-body">
                  What you propose and why (plain words; options for a ballot are welcome)
                </label>
                <textarea id="proposal-body" className={field} rows={5} maxLength={LIMITS.bodyMax} value={body} onChange={(e) => setBody(e.target.value)} required />
              </div>
              <p className="text-xs text-slate-400">Shown publicly with your name and the time. You can withdraw it before the session starts.</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className={`${btn} bg-cyan-400 text-slate-950 hover:bg-cyan-300`}
                  disabled={busy || !nameOk || title.trim().length < LIMITS.titleMin || body.trim().length < LIMITS.bodyMin}
                >
                  Add to the agenda of {sessionLabel}
                </button>
                <button type="button" className={`${btn} border border-slate-700 text-slate-300`} onClick={() => setFormOpen(false)} disabled={busy}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="mt-4 space-y-3">
              {!viewer.suggestedName && standing.some((p) => !p.mine) ? nameField('supporter-name') : null}
              <button type="button" className={`${btn} bg-cyan-400 text-slate-950 hover:bg-cyan-300`} onClick={() => setFormOpen(true)}>
                Propose something for {sessionLabel}
              </button>
            </div>
          )
        ) : (
          <p className="mt-4 text-sm">
            <Link href={signInHref} className="text-cyan-300 underline hover:text-cyan-200">
              Sign in
            </Link>{' '}
            to propose something for {sessionLabel} or support a proposal.
          </p>
        )
      ) : variant === 'box' ? null : (
        <p className="mt-3 text-sm text-slate-400">This session has started; proposals for it are closed.</p>
      )}

      {done ? <p className="mt-2 text-sm text-emerald-300">{done}</p> : null}
      {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
