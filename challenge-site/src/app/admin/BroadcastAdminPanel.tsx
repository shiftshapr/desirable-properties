'use client';

import { useCallback, useEffect, useState } from 'react';

type AudienceRow = {
  key: string;
  userId: string | null;
  userName: string | null;
  email: string | null;
  workgroups: string[];
};

type LogEntry = {
  id: string;
  subject: string;
  sentAt: string;
  sentBy: string | null;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  testMode: boolean;
};

export default function BroadcastAdminPanel() {
  const [audience, setAudience] = useState<AudienceRow[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('<p>Hello {name},</p>\n<p>Thank you for joining the Desirable Properties challenge.</p>');
  const [testMode, setTestMode] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [audRes, logRes] = await Promise.all([
        fetch('/api/admin/broadcast?view=audience', { credentials: 'include' }),
        fetch('/api/admin/broadcast?view=log', { credentials: 'include' }),
      ]);
      const audData = await audRes.json();
      const logData = await logRes.json();
      if (!audRes.ok || !audData.ok) throw new Error(audData.message || 'Could not load audience');
      setAudience(audData.audience || []);
      setLog(logData.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runPreview() {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', html }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error('Preview failed');
      setPreviewHtml(data.html);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed');
    } finally {
      setBusy(false);
    }
  }

  async function sendBroadcast() {
    setBusy(true);
    setFlash(null);
    setError(null);
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          html,
          testMode,
          testEmail: testMode ? testEmail : undefined,
          recipientKeys: testMode ? undefined : [...selected],
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Send failed');
      setFlash(
        testMode
          ? `Test broadcast sent (${data.successCount}/${data.recipientCount}).`
          : `Broadcast sent (${data.successCount}/${data.recipientCount} succeeded).`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Send failed');
    } finally {
      setBusy(false);
    }
  }

  function toggleRecipient(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {flash ? (
        <p className="rounded-md border border-emerald-700/50 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">{flash}</p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-rose-700/50 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">{error}</p>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h2 className="text-xl font-semibold text-white">Broadcast</h2>
        <p className="mt-2 text-sm text-slate-400">
          Email workgroup participants. Merge tags: {'{name}'}, {'{userName}'}, {'{workgroups}'}.
        </p>

        <div className="mt-4 grid gap-3">
          <input
            className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <textarea
            className="min-h-[160px] rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
          />
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} />
          Test mode (send to one address only)
        </label>
        {testMode ? (
          <input
            className="mt-2 w-full max-w-md rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
            placeholder="Test email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
          />
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void runPreview()}
            className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200"
          >
            Preview
          </button>
          <button
            type="button"
            disabled={busy || !subject.trim() || !html.trim() || (testMode && !testEmail.trim())}
            onClick={() => void sendBroadcast()}
            className="rounded-md bg-cyan-700 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            Send broadcast
          </button>
        </div>

        {previewHtml ? (
          <div
            className="prose prose-invert mt-4 max-w-none rounded-md border border-slate-800 bg-slate-950 p-4 text-sm"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : null}
      </section>

      {!testMode ? (
        <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
          <h3 className="text-lg font-semibold text-white">Audience ({selected.size} selected)</h3>
          {loading ? (
            <p className="mt-4 text-sm text-slate-400">Loading audience…</p>
          ) : audience.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">
              No audience rows loaded. Workgroup signups come from Gov Hub; most rows lack email until
              that integration is extended.
            </p>
          ) : (
            <ul className="mt-4 max-h-72 overflow-y-auto divide-y divide-slate-800 rounded-lg border border-slate-800">
              {audience.map((row) => (
                <li key={row.key} className="flex items-center gap-3 px-4 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selected.has(row.key)}
                    onChange={() => toggleRecipient(row.key)}
                  />
                  <div>
                    <p className="text-white">{row.userName || row.userId || row.key}</p>
                    <p className="text-xs text-slate-500">
                      {row.workgroups.join(', ') || 'No workgroups'}
                      {row.email ? ` · ${row.email}` : ' · no email on file'}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900/40 p-6">
        <h3 className="text-lg font-semibold text-white">Send history</h3>
        {log.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No broadcasts sent yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-800 rounded-lg border border-slate-800">
            {log.map((entry) => (
              <li key={entry.id} className="px-4 py-3 text-sm">
                <p className="font-medium text-white">{entry.subject}</p>
                <p className="text-slate-400">
                  {new Date(entry.sentAt).toLocaleString()} · {entry.successCount}/{entry.recipientCount} sent
                  {entry.testMode ? ' · test' : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
