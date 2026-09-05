'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { applaudAstraChangeClient } from '@/lib/astra-applause-api';
import { ASTRA_APPLAUSE_MAX_PER_USER } from '@/lib/astra-applause-constants';

type Props = {
  workgroupId: string;
  changeId: string;
  total: number;
  mine: number;
  onUpdate: (next: { total: number; mine: number }) => void;
  compact?: boolean;
  prominent?: boolean;
};

export default function AstraApplauseButton({
  workgroupId,
  changeId,
  total,
  mine,
  onUpdate,
  compact = false,
  prominent = false,
}: Props) {
  const { user, checked } = useAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const atCap = mine >= ASTRA_APPLAUSE_MAX_PER_USER;
  const signedIn = Boolean(user);

  const applaud = useCallback(async () => {
    if (busy || atCap) return;
    if (!signedIn) {
      setNotice('Sign in to applaud this change.');
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const result = await applaudAstraChangeClient(workgroupId, changeId);
      onUpdate({ total: result.total, mine: result.mine });
      if (!result.ok && result.reason === 'cap_reached') {
        setNotice(`You reached ${ASTRA_APPLAUSE_MAX_PER_USER} applauds for this change.`);
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not record applause');
    } finally {
      setBusy(false);
    }
  }, [atCap, busy, changeId, onUpdate, signedIn, workgroupId]);

  const label = compact
    ? `${total} applaud${total === 1 ? '' : 's'}`
    : prominent
      ? `Applaud this change (${mine}/${ASTRA_APPLAUSE_MAX_PER_USER} yours · ${total} total)`
      : `Applaud (${mine}/${ASTRA_APPLAUSE_MAX_PER_USER} yours · ${total} total)`;

  return (
    <div className={compact ? 'inline-flex flex-col items-start' : 'space-y-1'}>
      <button
        type="button"
        onClick={() => void applaud()}
        disabled={busy || atCap}
        aria-label={`Applaud this change. ${total} total. You have given ${mine}.`}
        className={`inline-flex items-center gap-1.5 rounded-lg border transition ${
          prominent ? 'px-3.5 py-2 text-sm font-medium' : 'px-2.5 py-1 text-xs'
        } ${
          atCap
            ? 'cursor-default border-slate-700 bg-slate-900/60 text-slate-400'
            : prominent
              ? 'border-cyan-700/70 bg-cyan-950/40 text-cyan-100 hover:border-cyan-500 hover:bg-cyan-950/60'
              : 'border-slate-700 bg-slate-950/70 text-slate-200 hover:border-cyan-700 hover:text-cyan-100'
        } disabled:opacity-60`}
      >
        <span aria-hidden className="text-sm leading-none">
          👏
        </span>
        <span>{label}</span>
      </button>
      {!compact && checked && !signedIn ? (
        <p className="text-[11px] text-slate-500">Sign in to applaud. Totals are visible to everyone.</p>
      ) : null}
      {notice ? <p className="text-[11px] text-amber-300/90">{notice}</p> : null}
    </div>
  );
}
