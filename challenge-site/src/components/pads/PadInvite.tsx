'use client';

import { useEffect, useId, useState, useSyncExternalStore } from 'react';
import {
  INVITE_LIMITS,
  inviteMessage,
  inviteUrl,
  mailtoHref,
  parseRef,
  qrPath,
  sendResultLine,
  shareLinks,
  signalMessage,
  type InviteContent,
} from '@/lib/pads/pad-invite-core';

const chip =
  'inline-flex min-h-[2.5rem] items-center justify-center rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-cyan-500/70 hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300';

const noSubscribe = () => () => {};
const canShare = () => typeof navigator !== 'undefined' && typeof navigator.share === 'function';

type SendState = {
  signedIn: boolean;
  enabled: boolean;
  sender?: string | null;
  remainingToday?: number;
  perSend?: number;
  perDay?: number;
};

function signInHref(): string {
  const here = typeof window === 'undefined' ? '/' : window.location.pathname + window.location.hash;
  return `/login?next=${encodeURIComponent(here)}`;
}

/** Counts one arrival from an invite link (?ref=inv-<channel>) and takes the ref off the address bar. */
function useArrival(content: InviteContent) {
  useEffect(() => {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get('ref');
    const channel = parseRef(ref);
    if (!channel) return;
    url.searchParams.delete('ref');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    const seenKey = `pad-invite-arrival:${content.kind}:${content.key}`;
    try {
      if (window.sessionStorage.getItem(seenKey)) return;
      window.sessionStorage.setItem(seenKey, '1');
    } catch {
      // Storage blocked: count anyway.
    }
    const body = JSON.stringify({ kind: content.kind, key: content.key, ref });
    const blob = new Blob([body], { type: 'application/json' });
    if (!navigator.sendBeacon?.('/api/pads/invite/arrival', blob)) {
      void fetch('/api/pads/invite/arrival', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => undefined);
    }
  }, [content.kind, content.key]);
}

function QrCode({ text, label }: { text: string; label: string }) {
  const [svg, setSvg] = useState<{ size: number; d: string } | null>(null);
  useEffect(() => {
    let cancelled = false;
    void import('qrcode-generator').then((mod) => {
      const qrcode = mod.default;
      const qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      const n = qr.getModuleCount();
      if (!cancelled) setSvg({ size: n + 8, d: qrPath(n, (r, c) => qr.isDark(r, c)) });
    });
    return () => {
      cancelled = true;
    };
  }, [text]);
  if (!svg) return <p className="text-sm text-slate-400">Making the QR code…</p>;
  const file = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svg.size} ${svg.size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${svg.d}" fill="#000"/></svg>`;
  return (
    <figure className="flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:gap-4">
      <svg
        viewBox={`0 0 ${svg.size} ${svg.size}`}
        shapeRendering="crispEdges"
        role="img"
        aria-label={label}
        className="h-44 w-44 shrink-0 rounded-lg bg-white"
      >
        <rect width="100%" height="100%" fill="#fff" />
        <path d={svg.d} fill="#000" />
      </svg>
      <figcaption className="text-sm text-slate-300">
        Point a phone camera at it to open this page. Good for a slide or a printed sheet.
        <a
          href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(file)}`}
          download="desirable-properties-invite-qr.svg"
          className="mt-2 block text-cyan-300 hover:text-cyan-200"
        >
          Download the QR code (SVG)
        </a>
      </figcaption>
    </figure>
  );
}

function SiteSend({ content }: { content: InviteContent }) {
  const toId = useId();
  const noteId = useId();
  const hintId = useId();
  const [state, setState] = useState<SendState | null>(null);
  const [to, setTo] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/pads/invite', { cache: 'no-store' })
      .then((r) => r.json())
      .then((b: SendState) => {
        if (!cancelled) setState(b);
      })
      .catch(() => {
        if (!cancelled) setState({ signedIn: false, enabled: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function send() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/pads/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: content.kind, key: content.key, to, note }),
      });
      const b = (await res.json().catch(() => ({}))) as { error?: string; sent?: number; skipped?: number; failed?: number; remainingToday?: number };
      if (typeof b.remainingToday === 'number' && state) setState({ ...state, remainingToday: b.remainingToday });
      if (!res.ok) throw new Error(b.error || 'Could not send');
      setMsg({ ok: Boolean(b.sent), text: sendResultLine({ sent: b.sent || 0, skipped: b.skipped || 0, failed: b.failed || 0 }) });
      if (b.sent) {
        setTo('');
        setNote('');
      }
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Could not send' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-5 border-t border-slate-800 pt-4">
      <h3 className="text-base font-semibold text-white">Send from the site</h3>
      {!state ? (
        <p className="mt-1 text-sm text-slate-400">Loading…</p>
      ) : !state.signedIn ? (
        <p className="mt-1 text-sm text-slate-300">
          <a href={signInHref()} className="text-cyan-300 hover:text-cyan-200">
            Sign in
          </a>{' '}
          to send an invitation with your name on it, straight from this page.
        </p>
      ) : !state.enabled ? (
        <p className="mt-1 text-sm text-slate-400">Sending from the site is off right now. Use Email or a share link above.</p>
      ) : (
        <form
          className="mt-2 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <div>
            <label htmlFor={toId} className="block text-sm text-slate-300">
              Email addresses, up to {state.perSend ?? INVITE_LIMITS.perSend} (commas or one per line)
            </label>
            <textarea
              id={toId}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              rows={2}
              required
              inputMode="email"
              autoComplete="off"
              aria-describedby={hintId}
              className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none sm:text-sm"
              placeholder="friend@example.org"
            />
          </div>
          <div>
            <label htmlFor={noteId} className="block text-sm text-slate-300">
              A short note from you (optional, no links)
            </label>
            <input
              id={noteId}
              type="text"
              value={note}
              maxLength={INVITE_LIMITS.noteMax}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none sm:text-sm"
              placeholder="I think you would have a view on this."
            />
          </div>
          <p id={hintId} className="text-xs leading-relaxed text-slate-400">
            They get one email: “{state.sender || 'You'} invited you”, your note, this page’s summary and link, why they got it
            and a link to stop all email from us. We do not add them to any list or keep their address, only a one-way hash to
            stop repeat invitations. {state.remainingToday ?? 0} of {state.perDay ?? INVITE_LIMITS.perAccountPerDay} left today.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy || !to.trim() || !state.remainingToday}
              className="min-h-[2.5rem] rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Send invitations'}
            </button>
            <span role="status" aria-live="polite" className={`text-sm ${msg?.ok ? 'text-emerald-200' : 'text-amber-200'}`}>
              {msg?.text}
            </span>
          </div>
        </form>
      )}
    </div>
  );
}

/**
 * "Invite others" for any pad: copy link, the phone's share sheet, a QR code, a prefilled email, share links for
 * WhatsApp, Telegram, LinkedIn, X and Bluesky, a copyable message for Signal, and "Send from the site" for signed-in
 * accounts. The text comes from the pad (InviteContent, pad-invite-core.ts).
 */
export default function PadInvite({ content, base }: { content: InviteContent; base: string }) {
  useArrival(content);
  const nativeShare = useSyncExternalStore(noSubscribe, canShare, () => false);
  const [status, setStatus] = useState('');
  const [qrOpen, setQrOpen] = useState(false);
  const qrId = useId();

  const linkUrl = inviteUrl(base, content.path, 'link');

  function flash(text: string) {
    setStatus(text);
    window.setTimeout(() => setStatus(''), 5000);
  }

  async function copy(text: string, done: string) {
    try {
      await navigator.clipboard.writeText(text);
      flash(done);
    } catch {
      flash(`Copy did not work here. Select and copy: ${text}`);
    }
  }

  async function share() {
    try {
      await navigator.share({ title: content.title, text: `${content.title}. ${content.action}.`, url: inviteUrl(base, content.path, 'share') });
    } catch {
      // Cancelled.
    }
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 sm:p-5">
      <p className="text-sm text-slate-300">Know someone who should see this? Send them the link, or invite them by email.</p>
      <blockquote className="mt-3 whitespace-pre-line break-words rounded-lg border-l-2 border-cyan-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-300">
        {inviteMessage(content, `${base.replace(/\/$/, '')}${content.path}`)}
      </blockquote>

      <div className="mt-4 flex flex-wrap gap-2">
        {nativeShare ? (
          <button type="button" onClick={share} className={`${chip} border-cyan-600/70 text-cyan-100`}>
            Share…
          </button>
        ) : null}
        <button type="button" onClick={() => void copy(linkUrl, 'Link copied.')} className={chip}>
          Copy link
        </button>
        <a href={mailtoHref(content, base)} className={chip}>
          Email
        </a>
        <button type="button" onClick={() => void copy(signalMessage(content, base), 'Message copied. Paste it into Signal.')} className={chip}>
          Copy message for Signal
        </button>
        <button type="button" onClick={() => setQrOpen((v) => !v)} aria-expanded={qrOpen} aria-controls={qrId} className={chip}>
          {qrOpen ? 'Hide QR code' : 'QR code'}
        </button>
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Post or send on</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {shareLinks(content, base).map((s) => (
          <li key={s.key}>
            <a href={s.href} target="_blank" rel="noopener noreferrer" className={chip}>
              {s.label}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-2 min-h-[1.25rem] break-words text-sm text-cyan-200" role="status" aria-live="polite">
        {status}
      </p>

      {qrOpen ? (
        <div id={qrId} className="mt-2">
          <QrCode text={inviteUrl(base, content.path, 'qr')} label={`QR code for ${content.title}`} />
        </div>
      ) : null}

      <SiteSend content={content} />
    </div>
  );
}
