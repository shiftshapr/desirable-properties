'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { leaveWorkgroup } from '@/lib/workgroup-collab-api';

type Props = {
  workgroupId: string;
  workgroupName?: string;
  onLeft?: () => void;
  className?: string;
};

/** Leave control for authenticated workgroup members (collab staging). */
export default function WorkgroupLeavePanel({
  workgroupId,
  workgroupName,
  onLeft,
  className = '',
}: Props) {
  const { user, checked } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLeave() {
    setError(null);
    if (!user) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    const label = workgroupName ? `"${workgroupName}"` : 'this workgroup';
    const ok = window.confirm(`Leave ${label}? You can join again later.`);
    if (!ok) return;

    setBusy(true);
    try {
      await leaveWorkgroup(workgroupId);
      onLeft?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Leave failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={busy || !checked}
        onClick={() => void handleLeave()}
        className="rounded-lg border border-rose-800/70 bg-rose-950/40 px-4 py-2 text-sm font-medium text-rose-100 hover:border-rose-600 hover:bg-rose-900/40 disabled:opacity-50"
      >
        {busy ? 'Leaving…' : 'Leave workgroup'}
      </button>
      {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
