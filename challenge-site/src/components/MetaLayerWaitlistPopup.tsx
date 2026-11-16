'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';

/**
 * Meta-Layer waitlist popup, modelled on theoverweb.org's: opens 13 seconds after a visitor's first load,
 * once per browser (dp_waitlist_popup_v1 is set on close or on joining). Posts to Gov Hub's public
 * join-email endpoint for the Meta-Layer waitlist; Gov Hub emails a confirmation link.
 * Waits while another modal is open and gives up quietly (without marking seen) if it stays open.
 * Preview on staging/localhost with ?waitlistpopup=1 (opens after 1.5 s, ignores the seen key).
 */
const SEEN_KEY = 'dp_waitlist_popup_v1';
const OPEN_DELAY_MS = 13_000;
const PREVIEW_DELAY_MS = 1_500;
const BUSY_RETRY_MS = 2_000;
const BUSY_GIVE_UP_MS = 120_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function readSeen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    window.localStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* storage blocked: popup may show again next visit */
  }
}

/** Another dialog is on screen (site modal, DpDialog, any aria-modal or open <dialog>). */
function otherModalOpen(own: HTMLElement | null): boolean {
  const candidates = document.querySelectorAll<HTMLElement>('[aria-modal="true"], dialog[open]');
  for (const el of Array.from(candidates)) {
    if (own && own.contains(el)) continue;
    if (el.closest('[aria-hidden="true"]')) continue;
    if (el.getClientRects().length === 0) continue;
    return true;
  }
  return false;
}

type Props = {
  joinUrl: string;
};

export default function MetaLayerWaitlistPopup({ joinUrl }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();
  const inputId = useId();

  useEffect(() => {
    let preview = false;
    try {
      preview =
        /^(staging\.|localhost|127\.)/.test(window.location.hostname) &&
        /[?&]waitlistpopup=1/.test(window.location.search);
    } catch {
      preview = false;
    }
    if (readSeen() && !preview) return;

    let timer: ReturnType<typeof setTimeout>;
    const startedWaiting = Date.now() + (preview ? PREVIEW_DELAY_MS : OPEN_DELAY_MS);
    const tryOpen = () => {
      if (window.location.hash === '#waitlist') return;
      if (readSeen() && !preview) return;
      if (otherModalOpen(rootRef.current)) {
        if (Date.now() - startedWaiting < BUSY_GIVE_UP_MS) timer = setTimeout(tryOpen, BUSY_RETRY_MS);
        return;
      }
      returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setOpen(true);
    };
    timer = setTimeout(tryOpen, preview ? PREVIEW_DELAY_MS : OPEN_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    markSeen();
    const back = returnFocusRef.current;
    if (back && document.contains(back)) back.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab' || !cardRef.current) return;
      const focusables = Array.from(
        cardRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href]'),
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setOk('');
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setError('Please enter a valid email address.');
      inputRef.current?.focus();
      return;
    }
    setSending(true);
    try {
      const res = await fetch(joinUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: value,
          message: '',
          source: window.location.hostname || 'desirableproperties.org',
          source_url: window.location.href,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; info?: string };
      if (!res.ok) throw new Error(body.error || 'Something went wrong. Please try again.');
      setEmail('');
      markSeen();
      setOk(body.info || 'Check your inbox and click the link to confirm your place.');
    } catch (x) {
      // fetch() rejects with a TypeError when the network or CORS blocks the request.
      const network = x instanceof TypeError;
      setError(
        !network && x instanceof Error && x.message
          ? x.message
          : 'Could not reach the waitlist just now. Please try again.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div ref={rootRef}>
      {open ? (
        <div
          className="dp-waitlist-backdrop fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/75 p-4"
          onClick={close}
          role="presentation"
        >
          <div
            ref={cardRef}
            className="dp-waitlist-card relative w-full max-w-md rounded-xl border border-cyan-700/60 bg-slate-900 p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-md text-xl leading-none text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              &times;
            </button>
            <h2 id={titleId} className="pr-8 text-xl font-semibold text-white">
              Join the Meta-Layer waitlist
            </h2>
            <p id={descId} className="mt-2 text-sm leading-relaxed text-slate-300">
              The Meta-Layer is the trustworthy layer above the web that these Desirable Properties describe; join
              the waitlist for early access as it opens.
            </p>
            {ok ? (
              <p role="status" className="mt-4 rounded-lg border border-emerald-800/60 bg-emerald-950/40 px-3 py-2 text-sm text-emerald-200">
                {ok}
              </p>
            ) : (
              <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={onSubmit} noValidate>
                <label htmlFor={inputId} className="sr-only">
                  Email address
                </label>
                <input
                  ref={inputRef}
                  id={inputId}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={sending}
                  className="rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-60"
                >
                  {sending ? 'Sending…' : 'Join the waitlist'}
                </button>
              </form>
            )}
            {error ? (
              <p role="alert" className="mt-2 text-sm text-rose-300">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
