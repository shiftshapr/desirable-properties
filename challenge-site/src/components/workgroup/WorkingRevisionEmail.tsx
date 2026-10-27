'use client';

import { useState } from 'react';

type Audience = 'me' | 'external' | 'workgroup';

/**
 * Email the working revision (the chapter with approved changes merged in, not yet published).
 * Members: to themselves or outside addresses. Publishers: also to the whole workgroup.
 */
export default function WorkingRevisionEmail({
  workgroupId,
  canEmailWorkgroup,
}: {
  workgroupId: string;
  canEmailWorkgroup: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [audience, setAudience] = useState<Audience>('me');
  const [emails, setEmails] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch(`/api/workgroups/${encodeURIComponent(workgroupId)}/review/email-working`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ audience, emails, message }),
      });
      const body = (await res.json().catch(() => ({}))) as { sent?: number; failed?: number; error?: string };
      if (!res.ok) throw new Error(body.error || `Email failed (${res.status})`);
      const sent = body.sent ?? 0;
      setResult({
        ok: true,
        text: audience === 'me'
          ? 'Sent to your email address.'
          : `Sent to ${sent} ${sent === 1 ? 'person' : 'people'}${body.failed ? ` (${body.failed} failed)` : ''}.`,
      });
      setEmails('');
      setMessage('');
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : 'Email failed' });
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-cyan-300 hover:text-cyan-200">
        Email the working revision
      </button>
    );
  }

  return (
    <form onSubmit={(e) => void send(e)} className="space-y-3 rounded-lg border border-slate-700 bg-slate-950/40 p-3">
      <p className="text-xs text-slate-400">
        The chapter as it stands with every approved change merged in, plus the list of those changes. It is not
        published yet. Replies go to you.
      </p>
      <fieldset className="flex flex-wrap gap-4 text-sm text-slate-300">
        <label className="flex items-center gap-2">
          <input type="radio" name="wr-audience" checked={audience === 'me'} onChange={() => setAudience('me')} />
          To me
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="wr-audience" checked={audience === 'external'} onChange={() => setAudience('external')} />
          To other people
        </label>
        {canEmailWorkgroup ? (
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="wr-audience"
              checked={audience === 'workgroup'}
              onChange={() => setAudience('workgroup')}
            />
            To the whole workgroup
          </label>
        ) : null}
      </fieldset>
      {audience === 'external' ? (
        <label className="block text-sm text-slate-300">
          Email addresses (up to 10, separated by commas)
          <input
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
            placeholder="name@example.org, other@example.org"
          />
        </label>
      ) : null}
      {audience !== 'me' ? (
        <label className="block text-sm text-slate-300">
          Message (optional)
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            maxLength={2000}
            className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </label>
      ) : null}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || (audience === 'external' && !emails.trim())}
          className="rounded-lg border border-cyan-700 px-3 py-1.5 text-sm text-cyan-100 hover:border-cyan-400 disabled:opacity-50"
        >
          {busy ? 'Sending…' : 'Send'}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-slate-400 hover:text-slate-200">
          Close
        </button>
      </div>
      {result ? <p className={`text-sm ${result.ok ? 'text-emerald-200' : 'text-rose-200'}`}>{result.text}</p> : null}
    </form>
  );
}
