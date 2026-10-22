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
  /** e.g. "DP16", for the copy. */
  dpLabel?: string | null;
  isMember: boolean;
  className?: string;
};

const KIND_LABEL: Record<CoEditorSeat['kind'], string> = {
  coordinator: 'Co-editor',
  claimed: 'Co-editor',
  nominated: 'Co-editor (nominated)',
};

const MIN_STATEMENT = 20;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Dispatched on window (e.g. by the header's "Nominate a co-editor") to open the nominate form. */
export const NOMINATE_CO_EDITOR_EVENT = 'dp:nominate-co-editor';
/** Query flag that opens the nominate form on load: /workgroups/<slug>?nominate=co-editor#co-editors */
export const NOMINATE_CO_EDITOR_PARAM = 'nominate';
const MIN_REASON = 10;

type Mode = null | 'claim' | 'nominate' | { revoke: CoEditorSeat };

/**
 * The DP's two co-editor seats, shown above the workgroup tabs. A seat is claimed
 * ("Become a co-editor") or filled by a nomination the nominee accepts; accepting
 * also adds the nominee to the workgroup.
 */
export default function WorkgroupCoEditorsPanel({ workgroupId, dpLabel, isMember, className = '' }: Props) {
  const { user, checked } = useAuth();
  const [data, setData] = useState<CoEditorSeatsResponse | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [text, setText] = useState('');
  const [roster, setRoster] = useState<WorkgroupRosterMember[] | null>(null);
  const [nomineeId, setNomineeId] = useState('');
  /** Nominate a current member, or someone else by name and email. */
  const [nomineeSource, setNomineeSource] = useState<'member' | 'email'>('member');
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeEmail, setNomineeEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const reload = useCallback(async () => {
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
        if (cancelled) return;
        setData(next);
        // ?nominate=co-editor (from "Nominate a co-editor" elsewhere) opens the form once auth is known.
        const url = new URL(window.location.href);
        if (!checked || !next?.enabled || !url.searchParams.has(NOMINATE_CO_EDITOR_PARAM)) return;
        if (!user) {
          window.location.assign(`/login?next=${encodeURIComponent(url.pathname + url.search + url.hash)}`);
          return;
        }
        url.searchParams.delete(NOMINATE_CO_EDITOR_PARAM);
        window.history.replaceState(null, '', url.toString());
        if (next.seats.length >= next.seats_total) {
          setNotice('Both co-editor seats are filled.');
        } else {
          setMode('nominate');
        }
      })
      .catch(() => {
        if (!cancelled) setData(null);
      });
    return () => {
      cancelled = true;
    };
    // user is read only alongside user?.id and checked, which cover its changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workgroupId, user?.id, checked]);

  // Links like /workgroups/<slug>#co-editors arrive before this card has data.
  const loaded = Boolean(data?.enabled);
  useEffect(() => {
    if (loaded && window.location.hash === '#co-editors') {
      document.getElementById('co-editors')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loaded]);

  const openNominate = useCallback(() => {
    document.getElementById('co-editors')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setError(null);
    setNotice(null);
    if (!data) return;
    if (!user) {
      window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      return;
    }
    if (data.seats.length >= data.seats_total) {
      setNotice('Both co-editor seats are filled.');
      return;
    }
    setMode('nominate');
    setText('');
    setNomineeId('');
  }, [data, user]);

  useEffect(() => {
    window.addEventListener(NOMINATE_CO_EDITOR_EVENT, openNominate);
    return () => window.removeEventListener(NOMINATE_CO_EDITOR_EVENT, openNominate);
  }, [openNominate]);

  useEffect(() => {
    if (mode !== 'nominate' || roster) return;
    fetchWorkgroupMemberRoster(workgroupId)
      .then((r) => setRoster(r.members))
      .catch(() => setRoster([]));
  }, [mode, roster, workgroupId]);

  if (!data?.enabled) return null;

  const dp = dpLabel || 'this DP';
  const filled = data.seats.length;
  const fullyStaffed = filled >= data.seats_total;
  const iAmCoEditor = Boolean(data.viewer_is_co_editor ?? data.seats.some((s) => s.user_id === user?.id));
  const blockReason = data.claim_block_reason && !iAmCoEditor ? data.claim_block_reason : null;
  const seatedIds = new Set(data.seats.map((s) => s.user_id));
  const candidates = (roster || []).filter((m) => !seatedIds.has(m.user_id) && m.user_id !== user?.id);
  // With nobody left to pick from the roster, nominate by email.
  const source = roster && candidates.length === 0 ? 'email' : nomineeSource;
  const trimmed = text.trim();
  const emailNomineeReady = nomineeName.trim().length > 0 && EMAIL_RE.test(nomineeEmail.trim());
  const revokeTarget = typeof mode === 'object' && mode ? mode.revoke : null;
  const canSubmit =
    mode === 'claim'
      ? trimmed.length >= MIN_STATEMENT
      : mode === 'nominate'
        ? (source === 'member' ? Boolean(nomineeId) : emailNomineeReady) && trimmed.length > 0
        : revokeTarget
          ? trimmed.length >= MIN_REASON
          : false;

  function signIn() {
    window.location.assign(`/login?next=${encodeURIComponent(window.location.pathname)}`);
  }

  function open(next: Mode) {
    if (!user) {
      signIn();
      return;
    }
    setMode(next);
    setText('');
    setNomineeId('');
    setNomineeName('');
    setNomineeEmail('');
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
        message = (await claimCoEditorSeat(workgroupId, trimmed)).message || `You are now a co-editor of ${dp}.`;
      } else if (mode === 'nominate') {
        if (source === 'member') {
          const member = candidates.find((m) => m.user_id === nomineeId);
          if (!member) throw new Error('Pick a member to nominate.');
          message = (await nominateCoEditor(workgroupId, { user_id: member.user_id, name: member.user_name }, trimmed)).message;
        } else {
          message = (
            await nominateCoEditor(workgroupId, { name: nomineeName.trim(), email: nomineeEmail.trim() }, trimmed)
          ).message;
        }
      } else if (revokeTarget) {
        message = (await revokeCoEditorSeat(workgroupId, revokeTarget.id, trimmed)).message;
      }
      setNotice(message || 'Done.');
      setMode(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      id="co-editors"
      aria-label="Co-editors"
      className={`scroll-mt-24 rounded-xl border p-5 ${
        fullyStaffed ? 'border-slate-800 bg-slate-900/40' : 'border-cyan-800/70 bg-cyan-950/20'
      } ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Co-editors{' '}
            <span className={fullyStaffed ? 'text-emerald-300' : 'text-amber-300'}>
              · {filled} of {data.seats_total}
            </span>
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-300">
            {fullyStaffed
              ? 'Both co-editor seats are filled. '
              : `${dp} needs ${data.seats_total - filled} more co-editor${data.seats_total - filled === 1 ? '' : 's'}. `}
            Co-editors decide which proposals go into V1: both approve a change before it goes in, and every
            “no” carries a short reason for the author.
          </p>
        </div>
        {!fullyStaffed && !mode && !iAmCoEditor ? (
          checked && !user ? (
            <button
              type="button"
              onClick={signIn}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Sign in to become a co-editor
            </button>
          ) : data.can_claim ? (
            <button
              type="button"
              onClick={() => open('claim')}
              className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500"
            >
              Become a co-editor
            </button>
          ) : null
        ) : null}
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {data.seats.map((seat) => (
          <li
            key={seat.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2"
          >
            <span className="text-sm text-slate-100">
              {seat.name || 'Co-editor'}
              {seat.user_id && seat.user_id === user?.id ? <span className="text-emerald-300"> (you)</span> : null}
            </span>
            <span className="flex items-center gap-2">
              <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-300">
                {KIND_LABEL[seat.kind] || 'Co-editor'}
              </span>
              {seat.can_revoke ? (
                <button
                  type="button"
                  onClick={() => open({ revoke: seat })}
                  className="text-xs text-slate-500 underline hover:text-rose-300"
                >
                  Revoke
                </button>
              ) : null}
            </span>
          </li>
        ))}
        {Array.from({ length: data.open_seats }).map((_, i) => (
          <li
            key={`open-${i}`}
            className="rounded-lg border border-dashed border-cyan-800/70 px-3 py-2 text-sm text-cyan-200/80"
          >
            Open seat
          </li>
        ))}
      </ul>

      {iAmCoEditor ? (
        <p className="mt-3 text-sm text-emerald-300">
          You are a co-editor of {dp}. Proposals waiting for a decision are on the{' '}
          <a href="?tab=review" className="underline hover:text-emerald-200">
            Review tab
          </a>
          .
        </p>
      ) : null}
      {blockReason && !fullyStaffed && !mode ? <p className="mt-3 text-sm text-amber-200">{blockReason}</p> : null}

      {mode === 'claim' ? (
        <form
          onSubmit={(e) => void submit(e)}
          className="mt-4 space-y-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4"
        >
          <h3 className="text-sm font-semibold text-white">Become a co-editor of {dp}</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
            <li>Decide each proposal on the Review tab within 7 days: approve or decline.</li>
            <li>A change goes in when both co-editors approve it.</li>
            <li>When you decline, write a sentence the author can read.</li>
          </ul>
          {!isMember ? <p className="text-xs text-slate-400">You will also join this workgroup.</p> : null}
          <label className="block text-sm text-slate-300">
            Why you would like to co-edit {dp}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              autoFocus
              placeholder="A sentence or two: your interest or experience with this property."
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </label>
          {trimmed.length < MIN_STATEMENT ? (
            <p className="text-xs text-slate-500">
              {MIN_STATEMENT - trimmed.length} more character{MIN_STATEMENT - trimmed.length === 1 ? '' : 's'} to go.
            </p>
          ) : null}
          <FormButtons busy={busy} canSubmit={canSubmit} label="Become a co-editor" onCancel={() => setMode(null)} />
        </form>
      ) : null}

      {mode === 'nominate' ? (
        <form
          onSubmit={(e) => void submit(e)}
          className="mt-4 space-y-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4"
        >
          <h3 className="text-sm font-semibold text-white">Nominate a co-editor for {dp}</h3>
          <p className="text-sm text-slate-300">
            They get an email with your note. When they accept, they become a co-editor and join the workgroup.
          </p>
          {roster && candidates.length > 0 ? (
            <div className="flex flex-wrap gap-4 text-sm text-slate-300" role="radiogroup" aria-label="Who to nominate">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="nominee-source"
                  checked={source === 'member'}
                  onChange={() => setNomineeSource('member')}
                />
                A workgroup member
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="nominee-source"
                  checked={source === 'email'}
                  onChange={() => setNomineeSource('email')}
                />
                Someone else, by email
              </label>
            </div>
          ) : null}
          {source === 'member' ? (
            <label className="block text-sm text-slate-300">
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
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm text-slate-300">
                Name
                <input
                  value={nomineeName}
                  onChange={(e) => setNomineeName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
              </label>
              <label className="block text-sm text-slate-300">
                Email
                <input
                  type="email"
                  value={nomineeEmail}
                  onChange={(e) => setNomineeEmail(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
              </label>
            </div>
          )}
          <label className="block text-sm text-slate-300">
            Why this person
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
            />
          </label>
          <FormButtons busy={busy} canSubmit={canSubmit} label="Send nomination" onCancel={() => setMode(null)} />
        </form>
      ) : null}

      {revokeTarget ? (
        <form
          onSubmit={(e) => void submit(e)}
          className="mt-4 space-y-3 rounded-lg border border-rose-900/50 bg-slate-950/60 p-4"
        >
          <h3 className="text-sm font-semibold text-white">Revoke {revokeTarget.name || 'this co-editor'}’s seat</h3>
          <p className="text-sm text-slate-300">Their pending approvals stop counting. They will see your reason.</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Reason (at least 10 characters)"
            className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
          />
          <FormButtons busy={busy} canSubmit={canSubmit} label="Revoke seat" onCancel={() => setMode(null)} />
        </form>
      ) : null}

      {!fullyStaffed && !mode && (!user || data.can_nominate) ? (
        <p className="mt-3 text-sm text-slate-400">
          Know someone who should do this?{' '}
          <button
            type="button"
            onClick={() => open('nominate')}
            className="text-cyan-300 underline hover:text-cyan-200"
          >
            Nominate them
          </button>
          {user ? '' : ' (sign in first)'}.
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      {notice ? <p className="mt-3 text-sm text-emerald-300">{notice}</p> : null}
    </section>
  );
}

function FormButtons({
  busy,
  canSubmit,
  label,
  onCancel,
}: {
  busy: boolean;
  canSubmit: boolean;
  label: string;
  onCancel: () => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="submit"
        disabled={busy || !canSubmit}
        className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
      >
        {busy ? 'Working…' : label}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:text-slate-200"
      >
        Cancel
      </button>
    </div>
  );
}
