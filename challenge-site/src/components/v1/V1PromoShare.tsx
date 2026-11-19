'use client';

import { useState, useSyncExternalStore } from 'react';
import { shareIntents, V1_PROMO_EMAIL_SUBJECT, V1_PROMO_SHARE_TEXT, V1_PROMO_SHARE_URL } from '@/data/v1-promo';

const chip =
  'inline-flex items-center rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-cyan-500/70 hover:text-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300';

const noSubscribe = () => () => {};

/** The phone's own share sheet: Web Share API on a touch device. */
function nativeShareAvailable(): boolean {
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  return typeof navigator.share === 'function' && coarse;
}

/** "Or post your own": prefilled share links, the native share sheet on phones, and Copy link. */
export default function V1PromoShare({
  text = V1_PROMO_SHARE_TEXT,
  url = V1_PROMO_SHARE_URL,
}: {
  text?: string;
  url?: string;
}) {
  // False on the server and during hydration, so both render the same markup.
  const canNativeShare = useSyncExternalStore(noSubscribe, nativeShareAvailable, () => false);
  const [status, setStatus] = useState('');

  async function nativeShare() {
    try {
      await navigator.share({ title: V1_PROMO_EMAIL_SUBJECT, text, url });
    } catch {
      // Cancelled or unavailable: nothing to do.
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus('Link copied.');
    } catch {
      setStatus(`Copy failed. The link is ${url}`);
    }
    window.setTimeout(() => setStatus(''), 4000);
  }

  return (
    <div>
      <p className="text-sm text-slate-400">
        Suggested text: <span className="text-slate-300">“{text} {url}”</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {canNativeShare ? (
          <button type="button" onClick={nativeShare} className={`${chip} border-cyan-600/70 text-cyan-100`}>
            Share…
          </button>
        ) : null}
        {shareIntents(text, url).map((s) => (
          <a
            key={s.key}
            href={s.href}
            className={chip}
            {...(s.key === 'email' ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
          >
            {s.label}
            {s.key === 'email' ? null : <span className="sr-only"> (opens in a new tab)</span>}
          </a>
        ))}
        <button type="button" onClick={copyLink} className={chip}>
          Copy link
        </button>
      </div>
      <p className="mt-2 min-h-[1.25rem] text-sm text-cyan-200" role="status" aria-live="polite">
        {status}
      </p>
    </div>
  );
}
