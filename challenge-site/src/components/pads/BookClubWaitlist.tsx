'use client';

import Script from 'next/script';
import { useState, type FormEvent } from 'react';
import type { BookClubWaitlist as Waitlist } from '@/lib/pads/book-club-waitlist.server';

/**
 * Book club update list: an email field in the Join section and, when the Gov Hub pad turns it on, the same
 * sign-up in Gov Hub's popup (static/js/waitlist-popup.js: opens once when the visitor is about to leave).
 * Both post to Gov Hub's public join-email endpoint; Gov Hub emails a link to confirm.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PopupApi = { auto: (o: Record<string, unknown>) => void; markJoined?: (id: string) => void };

function popupApi(): PopupApi | undefined {
  return (window as unknown as { WaitlistPopup?: PopupApi }).WaitlistPopup;
}

export default function BookClubWaitlist({ waitlist }: { waitlist: Waitlist }) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const label = (waitlist.label || 'Join').replace(/\s*→\s*$/, '');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const v = email.trim();
    if (!EMAIL_RE.test(v)) {
      setError('Please enter a valid email address.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${waitlist.api}/api/waitlists/${encodeURIComponent(waitlist.id)}/join-email/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: v, source: `dp-pad:${window.location.hostname}`, source_url: window.location.href }),
      });
      const j = (await res.json().catch(() => ({}))) as { info?: string; error?: string };
      const already = !res.ok && /already on/i.test(j.error ?? '');
      if (!res.ok && !already) throw new Error(j.error || 'That did not work. Please try again.');
      popupApi()?.markJoined?.(waitlist.id); // the popup stays away once someone has joined here
      setDone(already ? 'You are already on the list.' : j.info || 'You are on the list.');
    } catch (err) {
      setError(err instanceof TypeError ? 'We could not reach the server. Please try again.' : (err as Error).message);
    } finally {
      setSending(false);
    }
  }

  function startPopup() {
    if (!waitlist.popup || !waitlist.open) return;
    popupApi()?.auto({
      waitlistId: waitlist.id,
      api: waitlist.api,
      source: 'dp-pad-popup',
      button: label,
      title: waitlist.popup.title || `${waitlist.name}.`,
      text: waitlist.popup.text || waitlist.description,
      profileUrl: waitlist.profile?.url,
      profileLabel: waitlist.profile?.label,
    });
  }

  return (
    <div className="mt-4">
      {!waitlist.open ? (
        <p className="text-sm text-slate-400">{waitlist.closedNote || 'Sign-up is closed.'}</p>
      ) : done ? (
        <p role="status" className="rounded-lg border border-cyan-300/60 px-4 py-3 text-base text-slate-100">
          {done}
        </p>
      ) : (
        <form onSubmit={submit} noValidate className="flex max-w-xl flex-wrap items-center gap-3">
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Your email"
            aria-label={`Your email for ${waitlist.name}`}
            className="min-w-0 flex-1 basis-56 rounded-lg border border-slate-600 bg-transparent px-4 py-2.5 text-base text-white placeholder:text-slate-400 focus:border-cyan-300 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending}
            className="inline-flex rounded-lg bg-cyan-300 px-5 py-2.5 font-semibold text-slate-950 hover:bg-cyan-200 disabled:opacity-60"
          >
            {sending ? 'Sending…' : label}
          </button>
          <p role="status" aria-live="polite" className="basis-full text-sm text-rose-300 empty:hidden">
            {error}
          </p>
        </form>
      )}
      {waitlist.profile ? (
        <p className="mt-3 text-sm">
          <a href={waitlist.profile.url} target="_blank" rel="noopener noreferrer" className="font-medium text-cyan-300 underline underline-offset-4 hover:text-cyan-200">
            {waitlist.profile.label} →
          </a>
        </p>
      ) : null}
      {waitlist.popup && waitlist.open ? (
        <Script src={`${waitlist.api}/static/js/waitlist-popup.js`} strategy="afterInteractive" onReady={startPopup} />
      ) : null}
    </div>
  );
}
