'use client';

import { useEffect, useState } from 'react';
import type { AdvisoryTally, MyAdvisory, Stance } from '@/lib/pads/pad-community-core';
import { ADVISORY_REASON_MAX } from '@/lib/pads/pad-settings';

type State = {
  signedIn: boolean;
  tally: AdvisoryTally;
  mine: MyAdvisory;
  following: boolean;
  canFollow: boolean;
};

const EMPTY: AdvisoryTally = { support: 0, concern: 0, reasons: [] };

/** One GET per pad view, shared by the Follow button and the advisory panel. */
const pending = new Map<string, Promise<State>>();

function apiBase(padId: string): string {
  return `/api/pads/proposals/${encodeURIComponent(padId)}`;
}

function loadOnce(padId: string, ml: string): Promise<State> {
  const key = `${padId}|${ml}`;
  let p = pending.get(key);
  if (!p) {
    p = fetch(`${apiBase(padId)}?ml=${encodeURIComponent(ml)}`, { cache: 'no-store' }).then(async (res) => {
      const body = (await res.json().catch(() => ({}))) as State & { error?: string };
      if (!res.ok) throw new Error(body.error || `Could not load (${res.status})`);
      return body;
    });
    pending.set(key, p);
    p.finally(() => setTimeout(() => pending.delete(key), 2000)).catch(() => undefined);
  }
  return p;
}

function useCommunity(padId: string, ml: string) {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadOnce(padId, ml)
      .then((body) => {
        if (!cancelled) {
          setState(body);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load');
      });
    return () => {
      cancelled = true;
    };
  }, [padId, ml]);
  return { state, setState, error };
}

function signInHref(): string {
  const here = typeof window === 'undefined' ? '/pads' : window.location.pathname + window.location.hash;
  return `/login?next=${encodeURIComponent(here)}`;
}

/** Follow: an email when this proposal's status changes. */
export function PadFollowButton({ padId, ml }: { padId: string; ml: string }) {
  const { state, setState } = useCommunity(padId, ml);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  if (!state) return null;
  if (!state.signedIn) {
    return (
      <a href={signInHref()} className="inline-flex items-center rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-cyan-500">
        Sign in to follow
      </a>
    );
  }
  async function toggle() {
    if (!state) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`${apiBase(padId)}/follow?ml=${encodeURIComponent(ml)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ follow: !state.following }),
      });
      const body = (await res.json().catch(() => ({}))) as { following?: boolean; error?: string };
      if (!res.ok) throw new Error(body.error || 'Could not save');
      setState({ ...state, following: Boolean(body.following) });
      setNote(body.following ? 'Following: we email you when its status changes.' : 'Unfollowed.');
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={busy || (!state.canFollow && !state.following)}
        aria-pressed={state.following}
        className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm disabled:opacity-60 ${state.following ? 'border-cyan-500 bg-cyan-950/40 text-cyan-100' : 'border-slate-700 text-slate-200 hover:border-cyan-500'}`}
      >
        {state.following ? 'Following' : 'Follow'}
      </button>
      {!state.canFollow && !state.following ? <span className="text-xs text-slate-500">Your account has no email address.</span> : null}
      {note ? <span className="text-xs text-slate-400" role="status">{note}</span> : null}
    </span>
  );
}

/** Advisory Support / Concern: one per account, changeable; counts and reasons public, names only when chosen. */
export function PadAdvisory({ padId, ml, ruleBadge, ruleLine }: { padId: string; ml: string; ruleBadge: string; ruleLine: string }) {
  const { state, setState, error } = useCommunity(padId, ml);
  /** The form while the person edits it; null shows their saved stance (or an empty form). */
  const [edit, setEdit] = useState<{ stance: Stance | null; reason: string; showName: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const form = edit ?? {
    stance: state?.mine?.stance ?? null,
    reason: state?.mine?.reason ?? '',
    showName: state?.mine?.showName ?? false,
  };
  const { stance, reason, showName } = form;
  const setStance = (v: Stance) => setEdit({ ...form, stance: v });
  const setReason = (v: string) => setEdit({ ...form, reason: v });
  const setShowName = (v: boolean) => setEdit({ ...form, showName: v });

  async function save(clear = false) {
    if (!clear && !stance) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`${apiBase(padId)}/advisory?ml=${encodeURIComponent(ml)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clear ? { stance: 'clear' } : { stance, reason, showName }),
      });
      const body = (await res.json().catch(() => ({}))) as { tally?: AdvisoryTally; mine?: MyAdvisory; error?: string };
      if (!res.ok) throw new Error(body.error || 'Could not save');
      if (state) setState({ ...state, tally: body.tally || EMPTY, mine: body.mine ?? null });
      setEdit(null);
      setMsg(clear ? 'Removed.' : 'Saved. You can change it any time.');
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  const tally = state?.tally || EMPTY;
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-white">What readers think</h3>
        <span className="rounded border border-sky-700/70 px-2 py-0.5 text-xs font-medium text-sky-200">{ruleBadge}</span>
      </div>
      <p className="mt-1 text-sm text-slate-400">{ruleLine}</p>
      <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        <span className="text-emerald-200">
          <span className="text-lg font-semibold">{tally.support}</span> support
        </span>
        <span className="text-amber-200">
          <span className="text-lg font-semibold">{tally.concern}</span> {tally.concern === 1 ? 'concern' : 'concerns'}
        </span>
      </p>
      {tally.reasons.length ? (
        <ul className="mt-3 space-y-1.5 text-sm">
          {tally.reasons.slice(0, 20).map((r, i) => (
            <li key={i} className="flex min-w-0 gap-2">
              <span className={`shrink-0 rounded px-1.5 text-xs leading-5 ${r.stance === 'support' ? 'bg-emerald-900/50 text-emerald-200' : 'bg-amber-900/50 text-amber-200'}`}>
                {r.stance === 'support' ? 'Support' : 'Concern'}
              </span>
              <span className="min-w-0 break-words text-slate-300">
                {r.reason}
                {r.name ? <span className="text-slate-500"> ({r.name})</span> : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}

      {state && !state.signedIn ? (
        <p className="mt-4 text-sm text-slate-300">
          <a href={signInHref()} className="text-cyan-300 hover:text-cyan-200">
            Sign in
          </a>{' '}
          to add yours.
        </p>
      ) : state ? (
        <form
          className="mt-4 space-y-3 border-t border-slate-800 pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <fieldset className="flex flex-wrap gap-2">
            <legend className="sr-only">Your view</legend>
            {(['support', 'concern'] as const).map((s) => (
              <label
                key={s}
                className={`cursor-pointer rounded-lg border px-3 py-1.5 text-sm ${stance === s ? (s === 'support' ? 'border-emerald-500 bg-emerald-950/40 text-emerald-100' : 'border-amber-500 bg-amber-950/40 text-amber-100') : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}
              >
                <input type="radio" name="stance" value={s} checked={stance === s} onChange={() => setStance(s)} className="sr-only" />
                {s === 'support' ? 'Support' : 'Concern'}
              </label>
            ))}
          </fieldset>
          <label className="block text-sm text-slate-300">
            Why, in one line (optional)
            <input
              type="text"
              value={reason}
              maxLength={ADVISORY_REASON_MAX}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none"
              placeholder="What makes you support it, or worry about it"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-400">
            <input type="checkbox" checked={showName} onChange={(e) => setShowName(e.target.checked)} />
            Show my name next to my reason (otherwise it is anonymous)
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={busy || !stance}
              className="rounded-lg bg-cyan-500 px-4 py-1.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {state.mine ? 'Update' : 'Save'}
            </button>
            {state.mine ? (
              <button type="button" onClick={() => void save(true)} disabled={busy} className="text-sm text-slate-400 hover:text-slate-200">
                Remove mine
              </button>
            ) : null}
            {msg ? <span className="text-xs text-slate-400" role="status">{msg}</span> : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
