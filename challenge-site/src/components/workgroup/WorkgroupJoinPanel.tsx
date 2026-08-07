'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { joinWorkgroup } from '@/lib/workgroup-collab-api';

type Props = {
  workgroupId: string;
  workgroupName?: string;
  /** Fallback Gov Hub join URL when not signed in or collab proxy fails. */
  fallbackHref?: string;
  onJoined?: () => void;
  className?: string;
};

export default function WorkgroupJoinPanel({
  workgroupId,
  workgroupName,
  fallbackHref,
  onJoined,
  className = '',
}: Props) {
  const { user, checked } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleJoin() {
    setError(null);
    setMessage(null);
    if (!user) {
      window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    setBusy(true);
    try {
      const res = await joinWorkgroup(workgroupId);
      const msg =
        res.message ||
        (res.pending_approval
          ? 'Membership requested; pending approval'
          : 'Successfully joined workgroup');
      setMessage(msg);
      setDone(true);
      onJoined?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Join failed');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className={`rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200 ${className}`}>
        {message || 'Joined'}
        {workgroupName ? ` · ${workgroupName}` : ''}
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        disabled={busy || !checked}
        onClick={() => void handleJoin()}
        className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
      >
        {busy ? 'Joining…' : user ? 'Join workgroup' : 'Sign in to join'}
      </button>
      {error ? (
        <p className="mt-2 text-sm text-rose-300">
          {error}
          {fallbackHref ? (
            <>
              {' '}
              <a href={fallbackHref} className="underline hover:text-rose-200">
                Open on Gov Hub
              </a>
            </>
          ) : null}
        </p>
      ) : null}
      {message && !done ? <p className="mt-2 text-sm text-emerald-300">{message}</p> : null}
    </div>
  );
}
