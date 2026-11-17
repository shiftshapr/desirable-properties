'use client';

import { useId, useState } from 'react';
import { normalizeAckReference } from '@/lib/ack-request';

/**
 * "Look up an Acknowledgements request": reference code + the email used on the form. If they match,
 * we email a one-time link to that address. The answer never says whether they matched.
 */
export default function AckLookupBox({ className = '' }: { className?: string }) {
  const id = useId();
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const ref = normalizeAckReference(reference);
    if (!ref) {
      setError('Please give the reference code, for example ACK-7K3Q9P.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setError('Please give the email address you used on the form.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/acknowledgements/requests/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: ref, email: email.trim() }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (res.ok && data?.ok) {
        setMessage(data.message || 'If that reference code and email match a request, we have sent a link to that email.');
        setReference('');
      } else {
        setError(data?.message || 'We could not look that up just now. Please try again in a few minutes.');
      }
    } catch {
      setError('We could not look that up just now. Please try again in a few minutes.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby={`${id}-h`} className={`rounded-xl border border-violet-800/50 bg-slate-900/60 p-5 ${className}`}>
      <h2 id={`${id}-h`} className="text-lg font-semibold text-white">Look up an Acknowledgements request</h2>
      <p className="mt-1 text-sm text-slate-300">
        Sent a request without signing in? Give the reference code and the email you used. If they match, we
        email you a link to see your requests. The link works once, within 24 hours.
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end" noValidate>
        <div className="min-w-0">
          <label htmlFor={`${id}-ref`} className="mb-1 block text-sm text-slate-300">Reference code</label>
          <input
            id={`${id}-ref`}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="ACK-7K3Q9P"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={20}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-white"
          />
        </div>
        <div className="min-w-0">
          <label htmlFor={`${id}-email`} className="mb-1 block text-sm text-slate-300">Email you used</label>
          <input
            id={`${id}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            maxLength={254}
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
        >
          {busy ? 'Sending…' : 'Email me a link'}
        </button>
      </form>
      <div aria-live="polite" className="mt-3 text-sm">
        {message ? <p className="rounded-lg border border-emerald-700/50 bg-emerald-950/40 px-3 py-2 text-emerald-200">{message}</p> : null}
        {error ? <p className="rounded-lg border border-red-700/50 bg-red-950/40 px-3 py-2 text-red-200">{error}</p> : null}
      </div>
    </section>
  );
}
