'use client';

import { useEffect, useState } from 'react';

type Props = {
  mailto?: string;
  subject?: string;
  body?: string;
  busy?: boolean;
  onPrepare: () => Promise<void>;
};

export default function SendFromMyEmailButton({ mailto, subject, body, busy, onPrepare }: Props) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readyMailto, setReadyMailto] = useState('');
  const [readyBody, setReadyBody] = useState('');
  const [readySubject, setReadySubject] = useState('');

  useEffect(() => {
    if (mailto) setReadyMailto(mailto);
    if (body) setReadyBody(body);
    if (subject) setReadySubject(subject);
  }, [mailto, body, subject]);

  async function handlePrepare() {
    setError(null);
    try {
      await onPrepare();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to prepare email');
    }
  }

  async function handleCopy() {
    const text = readyBody || body || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(
        `Subject: ${readySubject || subject || ''}\n\n${text}`,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard');
    }
  }

  const ready = Boolean(readyMailto || mailto);

  return (
    <div className="space-y-2">
      {!ready ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void handlePrepare()}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-100 hover:border-cyan-600 disabled:opacity-50"
        >
          {busy ? 'Preparing…' : 'Send from my email'}
        </button>
      ) : (
        <div className="flex flex-wrap gap-2">
          <a
            href={readyMailto || mailto}
            className="inline-flex rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-slate-100 hover:border-cyan-600"
          >
            Open in my email app
          </a>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:border-slate-500"
          >
            {copied ? 'Copied' : 'Copy to clipboard'}
          </button>
        </div>
      )}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {ready ? (
        <p className="text-xs text-slate-500">
          Invitation tracking links were created. Send from your own address so replies come to you.
        </p>
      ) : null}
    </div>
  );
}
