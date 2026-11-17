'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import AckLookupBox from '@/components/acknowledgements/AckLookupBox';
import AckRequestList from '@/components/acknowledgements/AckRequestList';
import { linkTokenFromHash, type AckRequestView } from '@/lib/ack-request';
import { useAuth } from '@/lib/auth-context';

type Phase = 'loading' | 'confirm' | 'opening' | 'list' | 'none' | 'expired';

/**
 * Support view of the viewer's own Acknowledgements requests. Opens with the account (signed in)
 * and/or the one-time link emailed after a lookup (/support/requests#token=...). The link is used
 * only when the person presses the button, so mail scanners that open links do not use it up.
 */
export default function SupportRequestsClient() {
  const { user, checked, login, loginBusy } = useAuth();
  const [phase, setPhase] = useState<Phase>('loading');
  const [token, setToken] = useState<string | null>(null);
  const [requests, setRequests] = useState<AckRequestView[]>([]);
  const [via, setVia] = useState<string>('');
  const [notice, setNotice] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/acknowledgements/requests/mine', { credentials: 'include', cache: 'no-store' });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; requests?: AckRequestView[]; via?: string; error?: string; message?: string; view_expired?: boolean }
        | null;
      if (res.ok && data?.ok && Array.isArray(data.requests)) {
        setRequests(data.requests);
        setVia(data.via || '');
        if (data.view_expired) setNotice('The access from your emailed link has expired. Look up your request again to get a new link.');
        setPhase('list');
      } else if (data?.error === 'view_expired') {
        setNotice(data.message || 'Your access has expired. Look up your request again to get a new link.');
        setPhase('expired');
      } else if (res.status === 401) {
        setPhase('none');
      } else {
        setNotice(data?.message || 'We could not load your requests just now. Please try again in a few minutes.');
        setPhase('none');
      }
    } catch {
      setNotice('We could not load your requests just now. Please try again in a few minutes.');
      setPhase('none');
    }
  }, []);

  useEffect(() => {
    // Read the link from the address bar after the first render (the server cannot see a #fragment).
    let alive = true;
    void Promise.resolve().then(() => {
      if (!alive) return;
      const t = linkTokenFromHash(window.location.hash);
      if (t) {
        setToken(t);
        setPhase('confirm');
      } else if (checked) {
        void load();
      }
    });
    return () => {
      alive = false;
    };
  }, [checked, user, load]);

  useEffect(() => {
    if (phase === 'list' || phase === 'expired') headingRef.current?.focus();
  }, [phase]);

  async function openLink() {
    if (!token) return;
    setPhase('opening');
    setNotice(null);
    // The token is used once; drop it from the address bar and history either way.
    window.history.replaceState(null, '', window.location.pathname);
    try {
      const res = await fetch('/api/acknowledgements/requests/lookup/redeem', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      setToken(null);
      if (res.ok && data?.ok) {
        await load();
      } else {
        setNotice(data?.message || 'This link has expired or has already been used. Look up your request again to get a new link.');
        setPhase('expired');
      }
    } catch {
      setNotice('We could not open the link just now. Please try again in a few minutes.');
      setPhase('confirm');
    }
  }

  async function forget() {
    await fetch('/api/acknowledgements/requests/lookup/forget', { method: 'POST', credentials: 'include' }).catch(() => null);
    setNotice('Done. Requests opened with the emailed link are no longer shown on this device.');
    setRequests([]);
    await load();
  }

  const fromLink = via === 'link' || via === 'account+link';

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-amber-300/90">
        <Link href="/support" className="hover:text-amber-200">Support</Link>
      </p>
      <h1 className="mt-2 text-3xl font-bold text-white">Your Acknowledgements requests</h1>
      <p className="mt-3 text-slate-300">
        Requests to change the{' '}
        <a href="/viewer/acknowledgements" className="text-cyan-300 underline hover:text-cyan-200">Acknowledgements</a>{' '}
        of the book, with the steering committee&apos;s decision and the images you attached. Only you can see this
        page.
      </p>

      <div aria-live="polite">
        {notice ? (
          <p className="mt-6 rounded-lg border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">{notice}</p>
        ) : null}
      </div>

      {phase === 'loading' || phase === 'opening' ? (
        <p className="mt-8 text-slate-400" role="status">{phase === 'opening' ? 'Opening your link…' : 'Loading…'}</p>
      ) : null}

      {phase === 'confirm' ? (
        <div className="mt-8 rounded-xl border border-violet-800/50 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-white">Open your requests</h2>
          <p className="mt-2 text-sm text-slate-300">
            This link works once. After you open it, this device shows your requests for the next two hours.
          </p>
          <button
            type="button"
            onClick={() => void openLink()}
            className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500"
          >
            Show my requests
          </button>
        </div>
      ) : null}

      {phase === 'list' ? (
        <section className="mt-8" aria-labelledby="ack-mine-h">
          <h2 id="ack-mine-h" ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-white focus:outline-none">
            {requests.length === 1 ? '1 request' : `${requests.length} requests`}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {via === 'account' && 'Sent while signed in to this account.'}
            {via === 'link' && 'Sent with the email address the link went to.'}
            {via === 'account+link' && 'Sent while signed in to this account, or with the email address the link went to.'}
          </p>
          <div className="mt-4">
            {requests.length ? (
              <AckRequestList requests={requests} />
            ) : (
              <p className="text-slate-300">
                No requests yet.{' '}
                <a href="/acknowledgements/request" className="text-cyan-300 underline hover:text-cyan-200">Ask for a change to the Acknowledgements</a>
              </p>
            )}
          </div>
          {fromLink ? (
            <button
              type="button"
              onClick={() => void forget()}
              className="mt-4 text-sm text-cyan-300 underline hover:text-cyan-200"
            >
              Stop showing requests from the emailed link on this device
            </button>
          ) : null}
        </section>
      ) : null}

      {phase === 'expired' ? (
        <h2 ref={headingRef} tabIndex={-1} className="sr-only">Link expired</h2>
      ) : null}

      {phase === 'none' || phase === 'expired' || (phase === 'list' && !user) ? (
        <div className="mt-8 space-y-4">
          <AckLookupBox />
          {checked && !user ? (
            <p className="text-sm text-slate-400">
              Sent your request while signed in?{' '}
              <button
                type="button"
                onClick={() => void login().catch(() => undefined)}
                disabled={loginBusy}
                className="text-cyan-300 underline hover:text-cyan-200 disabled:opacity-60"
              >
                {loginBusy ? 'Signing in…' : 'Sign in'}
              </button>{' '}
              to see it.
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="mt-10 text-sm text-slate-500">
        Need something else? <Link href="/support" className="text-cyan-300 hover:text-cyan-200">Back to Support</Link>.
      </p>
    </div>
  );
}
