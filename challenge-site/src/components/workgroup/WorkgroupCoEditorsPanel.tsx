'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  claimCoEditorSeat,
  fetchCoEditorSeats,
  fetchWorkgroupMemberRoster,
  nominateCoEditor,
  revokeCoEditorSeat,
  type CoEditorSeat,
  type CoEditorSeatsResponse,
  type WorkgroupRosterMember,
} from '@/lib/workgroup-collab-api';

type Props = {
  workgroupId: string;
  isMember: boolean;
  className?: string;
};

const KIND_LABEL: Record<CoEditorSeat['kind'], string> = {
  coordinator: 'Coordinator seat',
  claimed: 'Claimed',
  nominated: 'Nominated',
};

const MIN_STATEMENT = 20;
const MIN_REASON = 10;

type Mode = null | 'claim' | 'nominate' | { revoke: CoEditorSeat };

/**
 * The DP's two co-editor seats. A seat is filled by the coordinator (automatic),
 * a claim, or a nomination the nominee accepts. Two co-editors = fully staffed.
 */
export default function WorkgroupCoEditorsPanel({ workgroupId, isMember, className = '' }: Props) {
  const { user } = useAuth();
  const [data, setData] = useState<CoEditorSeatsResponse | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [text, setText] = useState('');
  const [roster, setRoster] = useState<WorkgroupRosterMember[] | null>(null);
  const [nomineeId, setNomineeId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await fetchCoEditorSeats(workgroupId));
    } catch {
      setData(null);
    }
  }, [workgroupId]);

  useEffect(() => {
    let cancelled = false;
    fetchCoEditorSeats(workgroupId)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [workgroupId, user?.id]);

  useEffect(() => {
    if (mode !== 'nominate' || roster) return;
    fetchWorkgroupMemberRoster(workgroupId)
      .then((r) => setRoster(r.members))
      .catch(() => setRoster([]));
  }, [mode, roster, workgroupId]);

  if (!data?.enabled) return null;

  const seatedIds = new Set(data.seats.map((s) => s.user_id));
  const candidates = (roster || []).filter((m) => !seatedIds.has(m.user_id) && m.user_id !== user?.id);
  const trimmed = text.trim();
  const revokeTarget = typeof mode === 'object' && mode ? mode.revoke : null;
  const canSubmit =
    mode === 'claim'
      ? trimmed.length >= MIN_STATEMENT
      : mode === 'nominate'
        ? Boolean(nomineeId) && trimmed.length > 0
        : revokeTarget
          ? trimmed.length >= MIN_REASON
          : false;

  function open(next: Mode) {
    if (!user) {
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setMode(next);
    setText('');
    setNomineeId('');
    setError(null);
    setNotice(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      let message: string | undefined;
      if (mode === 'claim') {
        message = (await claimCoEditorSeat(workgroupId, trimmed)).message;
      } else if (mode === 'nominate') {
        const member = candidates.find((m) => m.user_id === nomineeId);
        if (!member) throw new Error('Pick a member to nominate.');
        message = (await nominateCoEditor(workgroupId, member, trimmed)).message;
      } else if (revokeTarget) {
        message = (await revokeCoEditorSeat(workgroupId, revokeTarget.id, trimmed)).message;
      }
      setNotice(message || 'Done.');
      setMode(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const filled = data.seats.length;
  const fullyStaffed = filled >= data.seats_total;

  return (
    <section
      aria-label="Co-editors"
      className={`rounded-xl border border-slate-800 bg-slate-950/40 p-4 ${className}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">
          Co-editors{' '}
          <span className={fullyStaffed ? 'text-emerald-300' : 'text-amber-300'}>
            {filled} of {data.seats_total}
          </span>
          {fullyStaffed ? <span className="ml-2 text-xs font-normal text-emerald-300">Fully staffed</span> : null}
        </h2>
        <p className="text-xs text-slate-400">
          Both co-editors approve a proposal before it goes into the book. Every “no” carries a reason.
        </p>
      </div>

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {data.seats.map((seat) => (
          <li key={seat.id} className="rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-slate-100">{seat.name || 'Co-editor'}</span>
              <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300">
                {KIND_LABEL[seat.kind] || 'Co-editor'}
              </span>
            </div>
            {seat.can_revoke ? (
              <button
                type="button"
                onClick={() => open({ revoke: seat })}
                className="mt-1 text-xs text-slate-400 underline hover:text-rose-300"
              >
                Revoke…
              </button>
            ) : null}
          </li>
        ))}
        {Array.from({ length: data.open_seats }).map((_, i) => (
          <li
            key={`open-${i}`}
            className="rounded-lg border border-dashed border-slate-700 px-3 py-2 text-sm text-slate-400"
          >
            Open seat
          </li>
        ))}
      </ul>

      {data.open_seats > 0 && !mode ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {data.can_claim || !user ? (
            <button
              type="button"
              onClick={() => open('claim')}
              className="rounded-lg bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-600"
            >
              {user ? 'Claim a seat' : 'Sign in to claim a seat'}
            </button>
          ) : null}
          {user && isMember && data.can_nominate ? (
            <button
              type="button"
              onClick={() => open('nominate')}
              className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-slate-500"
            >
              Nominate a member
            </button>
          ) : null}
        </div>
      ) : null}

      {mode ? (
        <form onSubmit={(e) => void submit(e)} className="mt-3 space-y-2">
          {mode === 'claim' ? (
            <p className="text-xs text-slate-400">
              Your account must be at least {data.rules.min_account_days} days old, and you can co-edit at
              most {data.rules.max_seats_per_person} DPs. The seat is yours at once; the coordinator can revoke
              it within {data.rules.revoke_window_days} days, with a reason.
            </p>
          ) : null}
          {mode === 'nominate' ? (
            <>
              <p className="text-xs text-slate-400">
                They get an email with your note and become a co-editor as soon as they accept.
              </p>
              <label className="block text-xs text-slate-400">
                Member
                <select
                  value={nomineeId}
                  onChange={(e) => setNomineeId(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  <option value="">{roster ? 'Choose a member' : 'Loading members…'}</option>
                  {candidates.map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.user_name}
                    </option>
                  ))}
                </select>
              </label>
              {roster && candidates.length === 0 ? (
                <p className="text-xs text-amber-300">No other members to nominate yet.</p>
              ) : null}
            </>
          ) : null}
          {revokeTarget ? (
            <p className="text-xs text-slate-400">
              Revoke {revokeTarget.name || 'this co-editor'}’s seat. Their pending approvals stop counting.
            </p>
          ) : null}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            placeholder={
              mode === 'claim'
                ? 'Why you will co-edit this DP (at least 20 characters)'
                : mode === 'nominate'
                  ? 'Why this person should co-edit this DP'
                  : 'Reason (at least 10 characters)'
            }
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || !canSubmit}
              className="rounded-lg bg-cyan-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
            >
              {busy
                ? 'Working…'
                : mode === 'claim'
                  ? 'Claim seat'
                  : mode === 'nominate'
                    ? 'Send nomination'
                    : 'Revoke seat'}
            </button>
            <button
              type="button"
              onClick={() => setMode(null)}
              className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
      {notice ? <p className="mt-2 text-sm text-emerald-300">{notice}</p> : null}
    </section>
  );
}
