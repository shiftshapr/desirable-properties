'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth-context';
import { isUserDismissedAuthError } from '@/lib/auth-errors';
import {
  DESIRABLE_PROPERTIES_BOOK_TITLE,
  DP_BOOK_ORIGIN,
  META_LAYER_SUMMIT_LUMA_URL,
} from '@/lib/govhub';
import { WORKGROUPS_JOIN_HREF, WORKGROUPS_LIST_HREF } from '@/lib/routes';
import {
  acceptWorkgroupInvite,
  fetchWorkgroupInvitePreview,
} from '@/lib/workgroup-invite-api';
import type { InvitedWorkgroupPreview, WorkgroupInvitePreview } from '@/lib/workgroup-collab-types';

const STORAGE_PREFIX = 'dp_platform_invite:';
const PENDING_LOGIN_KEY = 'dp_invite_pending_login';

type Props = {
  inviteToken: string;
  workgroupSlug: string;
  workgroupName?: string | null;
  workgroupDescription?: string | null;
  onAccepted?: () => void;
};

function stripInviteFromUrl(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('invite');
  const qs = url.searchParams.toString();
  const next = `${url.pathname}${qs ? `?${qs}` : ''}${url.hash}`;
  window.history.replaceState(null, '', next);
}

function resolveRedirectPath(
  redirectPath: string | undefined,
  workgroupSlug: string,
  pendingApproval: boolean,
): string {
  if (redirectPath) {
    try {
      const path = redirectPath.startsWith('http')
        ? new URL(redirectPath).pathname
        : redirectPath.split('?')[0];
      if (/^\/workgroups\/[^/]+\/?$/.test(path)) {
        const normalized = path.replace(/\/$/, '');
        return pendingApproval ? normalized : `${normalized}?joined=1`;
      }
    } catch {
      // fall through
    }
  }
  const base = `/workgroups/${encodeURIComponent(workgroupSlug)}`;
  return pendingApproval ? base : `${base}?joined=1`;
}

function workgroupCollabUrl(slug: string): string {
  const base =
    typeof window !== 'undefined'
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_DP_PUBLIC_BASE ||
          process.env.DP_PUBLIC_BASE ||
          'https://desirableproperties.org'
        ).replace(/\/$/, '');
  return `${base}/workgroups/${encodeURIComponent(slug)}`;
}

function resolveInvitedWorkgroups(
  preview: WorkgroupInvitePreview,
  workgroupSlug: string,
  workgroupName?: string | null,
  workgroupDescription?: string | null,
): InvitedWorkgroupPreview[] {
  if (preview.invited_workgroups?.length) {
    return preview.invited_workgroups.filter((wg) => wg.slug?.trim());
  }

  const target = preview.target;
  const slug = workgroupSlug || target?.workgroup_slug || '';
  const name = workgroupName || target?.workgroup_name || preview.target_title || 'Workgroup';
  const description = workgroupDescription?.trim() || null;
  if (!slug) return [{ name, slug: '', description }];
  return [{ name, slug, description }];
}

function ModalShell({
  titleId,
  descId,
  title,
  children,
  actions,
}: {
  titleId: string;
  descId: string;
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[10002] flex items-center justify-center bg-slate-950/80 p-5"
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-lg font-semibold text-white">
          {title}
        </h2>
        <div id={descId} className="mt-3 space-y-3 text-sm leading-relaxed text-slate-300">
          {children}
        </div>
        <div className="mt-5 flex flex-wrap justify-end gap-2">{actions}</div>
      </div>
    </div>
  );
}

export default function WorkgroupInviteWelcomeModal({
  inviteToken,
  workgroupSlug,
  workgroupName,
  workgroupDescription,
  onAccepted,
}: Props) {
  const router = useRouter();
  const { user, checked, login, loginBusy, refresh } = useAuth();
  const titleId = useId();
  const descId = useId();
  const acceptingRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<WorkgroupInvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const storageKey = `${STORAGE_PREFIX}${inviteToken}`;

  const finishAccept = useCallback(
    (data: { redirect_path?: string; pending_approval?: boolean }) => {
      sessionStorage.setItem(storageKey, 'accepted');
      sessionStorage.removeItem(PENDING_LOGIN_KEY);
      stripInviteFromUrl();
      onAccepted?.();
      const target = resolveRedirectPath(
        data.redirect_path,
        workgroupSlug,
        Boolean(data.pending_approval),
      );
      router.replace(target);
      router.refresh();
    },
    [onAccepted, router, storageKey, workgroupSlug],
  );

  const runAccept = useCallback(async () => {
    if (acceptingRef.current) return;
    acceptingRef.current = true;
    setError(null);
    setBusy(true);
    try {
      const data = await acceptWorkgroupInvite(inviteToken);
      setOpen(false);
      finishAccept(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not accept invitation');
      setOpen(true);
    } finally {
      acceptingRef.current = false;
      setBusy(false);
    }
  }, [finishAccept, inviteToken]);

  useEffect(() => {
    if (!inviteToken) return;
    if (sessionStorage.getItem(storageKey) === 'accepted') return;

    let cancelled = false;
    (async () => {
      try {
        const data = await fetchWorkgroupInvitePreview(inviteToken);
        if (cancelled) return;
        if (data.invite_type && data.invite_type !== 'join_workgroup') {
          setLoadError('This invitation is not for a workgroup.');
          return;
        }
        if (data.already_accepted) {
          finishAccept({ redirect_path: data.redirect_path });
          return;
        }
        setPreview(data);
        setOpen(true);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Could not load invitation');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [finishAccept, inviteToken, storageKey]);

  useEffect(() => {
    if (!user || !inviteToken || !preview) return;
    if (sessionStorage.getItem(storageKey) === 'accepted') return;
    if (sessionStorage.getItem(PENDING_LOGIN_KEY) !== inviteToken) return;

    void refresh().then(() => {
      void runAccept();
    });
  }, [user, inviteToken, preview, storageKey, refresh, runAccept]);

  function handleDismiss() {
    sessionStorage.removeItem(PENDING_LOGIN_KEY);
    setOpen(false);
  }

  async function handleAccept() {
    setError(null);

    if (!user) {
      sessionStorage.setItem(PENDING_LOGIN_KEY, inviteToken);
      setBusy(true);
      try {
        await login();
        await refresh();
        // Post-login accept runs once via the pending-login effect (avoids double accept).
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Sign-in failed';
        if (!isUserDismissedAuthError(message)) {
          setError(message);
          setOpen(true);
        }
      } finally {
        setBusy(false);
      }
      return;
    }

    void runAccept();
  }

  if (loadError) {
    return (
      <div className="mb-6 rounded-lg border border-amber-800/60 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
        {loadError}
      </div>
    );
  }

  if (!preview || !open) return null;

  const invitedWorkgroups = resolveInvitedWorkgroups(
    preview,
    workgroupSlug,
    workgroupName,
    workgroupDescription,
  );

  return (
    <ModalShell
      titleId={titleId}
      descId={descId}
      title="Workgroup invitation"
      actions={
        <>
          <button
            type="button"
            disabled={busy}
            onClick={handleDismiss}
            className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50"
          >
            Not now
          </button>
          <button
            type="button"
            disabled={busy || loginBusy || !checked}
            onClick={() => void handleAccept()}
            className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            {busy || loginBusy ? 'Working…' : 'Accept'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {invitedWorkgroups.map((wg) => (
          <div key={wg.slug || wg.name}>
            <p>
              {wg.slug ? (
                <a
                  href={workgroupCollabUrl(wg.slug)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  {wg.name}
                </a>
              ) : (
                <strong className="text-white">{wg.name}</strong>
              )}
            </p>
            {wg.description?.trim() ? (
              <p className="text-slate-400">{wg.description.trim()}</p>
            ) : null}
          </div>
        ))}
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1">
        <a
          href={WORKGROUPS_JOIN_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-300 hover:text-cyan-200"
        >
          About workgroups
        </a>
        <a
          href={WORKGROUPS_LIST_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-300 hover:text-cyan-200"
        >
          Browse workgroups
        </a>
      </p>
      {preview.shareable ? (
        <p className="text-slate-400">
          Anyone with this link can participate after signing in.
        </p>
      ) : null}
      <p>
        How you participate in the workgroup is up to you, ranging from an hour or two or more
        through mid September, and you may leave at any time. Meaningful contributions to
        workgroups will receive the workgroup digital badge and mention as a contributor in the
        Acknowledgements section of the forthcoming book,{' '}
        <a
          href={DP_BOOK_ORIGIN}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-300 hover:text-cyan-200"
        >
          <em>{DESIRABLE_PROPERTIES_BOOK_TITLE}</em>
        </a>{' '}
        (to be released digitally on{' '}
        <a
          href={META_LAYER_SUMMIT_LUMA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-300 hover:text-cyan-200"
        >
          Sept 16, 2026
        </a>
        ).
      </p>
      {!user && checked ? (
        <p className="text-slate-400">
          After you accept, you will need to sign in. Any email address is fine.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-rose-800/60 bg-rose-950/30 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}
    </ModalShell>
  );
}
