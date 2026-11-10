'use client';

import { useState } from 'react';

/** "Email me when it's out": joins the Version 1.0 book waitlist. */
export default function BookWaitlistForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState('busy');
    setError(null);
    const website = String(new FormData(e.currentTarget).get('website') || '');
    const res = await fetch('/api/v1/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, website }),
    }).catch(() => null);
    const body = (await res?.json().catch(() => ({}))) as { ok?: boolean; error?: string } | undefined;
    if (res?.ok && body?.ok) {
      setState('done');
    } else {
      setState('idle');
      setError(body?.error || 'Sign-up is unavailable right now.');
    }
  }

  if (state === 'done') {
    return <p className="mt-5 text-sm text-amber-200">Thanks. We&apos;ll email you when Version 1.0 is out on November 13.</p>;
  }
  return (
    <form onSubmit={submit} className="mt-5 flex max-w-md flex-wrap gap-2">
      <label htmlFor="v1-waitlist-email" className="sr-only">Email</label>
      <input
        id="v1-waitlist-email"
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.org"
        className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-white placeholder:text-slate-500"
      />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <button
        type="submit"
        disabled={state === 'busy'}
        className="rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-white disabled:opacity-60"
      >
        {state === 'busy' ? 'Adding…' : 'Email me when it’s out'}
      </button>
      {error ? <p className="w-full text-sm text-red-300">{error}</p> : null}
      <p className="w-full text-xs text-slate-500">One email on launch day. Unsubscribe any time.</p>
    </form>
  );
}
