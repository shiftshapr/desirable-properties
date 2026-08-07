'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { joinWorkgroup } from '@/lib/workgroup-collab-api';

type Props = {
  workgroupId: string;
  workgroupName?: string;
  /** Slug for post-join redirect to `/workgroups/{slug}`. */
  workgroupSlug?: string;
  /** Fallback Gov Hub join URL when not signed in or collab proxy fails. */
  fallbackHref?: string;
  onJoined?: () => void;
  className?: string;
  /** When true (from server membership check), render member badge instead. */
  isMember?: boolean;
};

function normalizePath(path: string): string {
  return path.replace(/\/$/, '') || '/';
}

/** Prefer API welcome_url when it targets the challenge-site collab page. */
function resolvePostJoinHref(welcomeUrl: string | undefined, slug: string | undefined): string | null {
  if (welcomeUrl) {
    try {
      const url = welcomeUrl.startsWith('http')
        ? new URL(welcomeUrl)
        : new URL(welcomeUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
      if (/^\/workgroups\/[^/]+\/?$/.test(url.pathname)) {
        return normalizePath(url.pathname);
      }
    } catch {
      // ignore malformed welcome_url
    }
  }
  if (slug) {
    return `/workgroups/${encodeURIComponent(slug)}`;
  }
  return null;
}

export default function WorkgroupJoinPanel({
  workgroupId,
  workgroupName,
  workgroupSlug,
  fallbackHref,
  onJoined,
  className = '',
  isMember = false,
}: Props) {
  const router = useRouter();
  const { user, checked } = useAuth();

  if (isMember) {
    return (
      <span
        className={`rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-3 py-2 text-sm text-emerald-200 ${className}`}
      >
        You are a member
      </span>
    );
  }
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
      onJoined?.();

      const collabHref = resolvePostJoinHref(res.welcome_url, workgroupSlug);
      if (collabHref && normalizePath(window.location.pathname) !== normalizePath(collabHref)) {
        router.push(collabHref);
        return;
      }

      setMessage(msg);
      setDone(true);
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
