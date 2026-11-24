'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { participationLine, type VoterParticipation } from '@/lib/ballots/participation-core';

type State =
  | { kind: 'loading' }
  | { kind: 'signed_out' }
  | { kind: 'error'; text: string }
  | { kind: 'ready'; stats: VoterParticipation | null; showName: boolean; nameOnRecord: boolean };

/**
 * "Your ballot participation" on /account: the signed-in voter's own counts and streak, and the setting that shows or
 * hides their name on the public participation list (/pads/ballot-options#voters). Never shows choices.
 */
export default function AccountParticipation() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetch('/api/me/participation', { credentials: 'include', cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!live) return;
        if (res.status === 401) setState({ kind: 'signed_out' });
        else if (!res.ok || !data.ok) setState({ kind: 'error', text: data.error || 'Participation is not available right now.' });
        else setState({ kind: 'ready', stats: data.stats, showName: data.showName, nameOnRecord: data.nameOnRecord });
      })
      .catch(() => live && setState({ kind: 'error', text: 'Participation is not available right now.' }));
    return () => {
      live = false;
    };
  }, []);

  async function toggle(showName: boolean) {
    if (state.kind !== 'ready') return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/me/participation', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) setMessage(data.error || 'The setting was not saved.');
      else {
        setState({ ...state, showName });
        setMessage(showName ? 'Your name shows on the participation list.' : 'Your name is hidden; you are counted among the others.');
      }
    } catch {
      setMessage('The setting was not saved. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="participation" aria-labelledby="participation-heading" className="rounded-xl border border-slate-800 bg-slate-900/40 px-5 py-5">
      <h2 id="participation-heading" className="text-xl font-semibold text-white">Your ballot participation</h2>
      {state.kind === 'loading' ? <p className="mt-3 text-sm text-slate-400">Loading…</p> : null}
      {state.kind === 'signed_out' ? (
        <p className="mt-3 text-sm text-slate-300">
          <Link href="/login?next=%2Faccount%23participation" className="text-cyan-300 hover:text-cyan-200">Sign in</Link> to see your participation.
        </p>
      ) : null}
      {state.kind === 'error' ? <p className="mt-3 text-sm text-rose-300">{state.text}</p> : null}
      {state.kind === 'ready' ? (
        <>
          <p className="mt-3 text-sm text-slate-200">
            {state.stats ? participationLine({ ...state.stats, ballots: state.stats.ballots.length }) : 'You have not voted on a session ballot yet.'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Counts only: the site never shows how you voted. Non-abstain votes are the answers you gave other than
            Abstain. The weekly streak counts the session ballots in a row, up to the latest one, on which you cast at
            least one.
          </p>
          <label className="mt-4 flex items-start gap-3 text-sm text-slate-200" htmlFor="participation-show-name">
            <input
              id="participation-show-name"
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0"
              checked={state.showName}
              disabled={saving}
              onChange={(e) => void toggle(e.target.checked)}
            />
            <span>
              Show my name on the{' '}
              <Link href="/pads/ballot-options#voters" className="text-cyan-300 hover:text-cyan-200">participation list</Link>
            </span>
          </label>
          {state.showName && !state.nameOnRecord ? (
            <p className="mt-2 text-xs text-amber-200">
              No real name is on record for your account yet, so you are counted among the others for now.
            </p>
          ) : null}
          {message ? <p role="status" className="mt-2 text-sm text-emerald-300">{message}</p> : null}
        </>
      ) : null}
    </section>
  );
}
