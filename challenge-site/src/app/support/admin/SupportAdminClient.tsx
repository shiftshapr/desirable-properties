'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

type TicketRow = {
  id: string;
  subject: string;
  status: string;
  urgency: string;
  category: string;
  createdAt: string;
  email?: string | null;
  handle?: string | null;
  escalatedToHuman?: boolean;
  bodyPreview?: string;
};

type TicketDetail = TicketRow & {
  body?: string;
  stepsToReproduce?: string | null;
  expectedBehavior?: string | null;
  actualBehavior?: string | null;
  triedAlready?: string | null;
  pageUrl?: string | null;
  browser?: string | null;
  os?: string | null;
  agentNotes?: Array<{ id: string; at: string; author: string; kind: string; text: string }>;
  draftReply?: { subject: string; body: string; sentAt?: string | null };
  attachmentUrls?: Array<{ filename: string; url: string }>;
  diagnosticBundle?: Record<string, unknown> | null;
};

const STATUSES = ['open', 'triaged', 'closed'] as const;

function urgencyClass(urgency: string) {
  if (urgency === 'critical') return 'text-red-300';
  if (urgency === 'blocking') return 'text-amber-300';
  return 'text-slate-400';
}

export default function SupportAdminClient() {
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [statusFilter, setStatusFilter] = useState('open');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [draftSubject, setDraftSubject] = useState('');
  const [draftBody, setDraftBody] = useState('');

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (statusFilter) params.set('status', statusFilter);
      if (q.trim()) params.set('q', q.trim());
      const res = await fetch(`/api/support/admin/tickets?${params}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Could not load queue');
        setTickets([]);
        return;
      }
      setTickets(data.tickets || []);
    } catch {
      setError('Could not load queue');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, q]);

  const loadDetail = useCallback(async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/support/admin/tickets/${encodeURIComponent(id)}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Could not load ticket');
        return;
      }
      const t = data.ticket as TicketDetail;
      setDetail(t);
      setDraftSubject(t.draftReply?.subject || `Re: ${t.subject}`);
      setDraftBody(t.draftReply?.body || '');
    } catch {
      setError('Could not load ticket');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  const selectedSummary = useMemo(
    () => tickets.find((t) => t.id === selectedId) || null,
    [tickets, selectedId],
  );

  async function patchTicket(patch: Record<string, unknown>) {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/support/admin/tickets/${encodeURIComponent(selectedId)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Update failed');
        return;
      }
      setDetail(data.ticket);
      setFlash('Ticket updated');
      await loadQueue();
    } catch {
      setError('Update failed');
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    await patchTicket({ draftReply: { subject: draftSubject, body: draftBody } });
  }

  async function sendReply() {
    if (!selectedId) return;
    setBusy(true);
    setError(null);
    try {
      await saveDraft();
      const res = await fetch(
        `/api/support/admin/tickets/${encodeURIComponent(selectedId)}/send-reply`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject: draftSubject, body: draftBody }),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || 'Send failed');
        return;
      }
      setDetail(data.ticket);
      setFlash('Reply sent');
      await loadQueue();
    } catch {
      setError('Send failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-amber-300/90">Admin</p>
          <h1 className="text-2xl font-bold text-white">Support queue</h1>
        </div>
        <Link href="/support" className="text-sm text-cyan-300 hover:text-cyan-200">
          ← Public support page
        </Link>
      </div>

      {flash ? (
        <p className="mt-4 rounded-lg border border-emerald-700/50 bg-emerald-950/40 px-4 py-2 text-sm text-emerald-200">
          {flash}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-lg border border-red-700/50 bg-red-950/40 px-4 py-2 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search…"
          className="min-w-[200px] flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
        />
        <button
          type="button"
          onClick={() => void loadQueue()}
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:border-slate-500"
        >
          Refresh
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        <aside className="max-h-[70vh] overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/50">
          {loading ? (
            <p className="p-4 text-sm text-slate-400">Loading…</p>
          ) : tickets.length === 0 ? (
            <p className="p-4 text-sm text-slate-400">No tickets match.</p>
          ) : (
            <ul>
              {tickets.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(t.id);
                      setFlash(null);
                    }}
                    className={`block w-full border-b border-slate-800 px-4 py-3 text-left hover:bg-slate-800/60 ${
                      selectedId === t.id ? 'bg-slate-800/80' : ''
                    }`}
                  >
                    <p className="truncate text-sm font-medium text-white">{t.subject}</p>
                    <p className={`mt-1 text-xs ${urgencyClass(t.urgency)}`}>
                      {t.urgency} · {t.status} · {t.category.replace(/_/g, ' ')}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {t.handle || t.email || t.id}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          {!detail || !selectedSummary ? (
            <p className="text-sm text-slate-400">Select a ticket to review.</p>
          ) : (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-white">{detail.subject}</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {detail.id} · {new Date(detail.createdAt).toLocaleString()} ·{' '}
                  {detail.handle || detail.email || 'unknown user'}
                </p>
                {detail.pageUrl ? (
                  <p className="mt-1 text-sm">
                    <a href={detail.pageUrl} className="text-cyan-300 hover:text-cyan-200" target="_blank" rel="noopener noreferrer">
                      {detail.pageUrl}
                    </a>
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy || detail.status === s}
                    onClick={() => void patchTicket({ status: s })}
                    className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-200 hover:border-slate-500 disabled:opacity-50"
                  >
                    Mark {s}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void patchTicket({ escalatedToHuman: !detail.escalatedToHuman })}
                  className="rounded-md border border-amber-700/50 px-3 py-1 text-xs text-amber-200"
                >
                  {detail.escalatedToHuman ? 'Clear escalation' : 'Escalate to human'}
                </button>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-300">Message</h3>
                <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-sm text-slate-200">
                  {detail.body}
                </pre>
              </div>

              {detail.stepsToReproduce || detail.expectedBehavior || detail.actualBehavior ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {detail.stepsToReproduce ? (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300">Steps</h3>
                      <p className="mt-1 text-sm text-slate-400">{detail.stepsToReproduce}</p>
                    </div>
                  ) : null}
                  {detail.expectedBehavior ? (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300">Expected</h3>
                      <p className="mt-1 text-sm text-slate-400">{detail.expectedBehavior}</p>
                    </div>
                  ) : null}
                  {detail.actualBehavior ? (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-300">Actual</h3>
                      <p className="mt-1 text-sm text-slate-400">{detail.actualBehavior}</p>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {detail.attachmentUrls && detail.attachmentUrls.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-slate-300">Screenshots</h3>
                  <ul className="mt-2 space-y-1 text-sm">
                    {detail.attachmentUrls.map((a) => (
                      <li key={a.filename}>
                        <a
                          href={`/api/support/admin/tickets/${encodeURIComponent(detail.id)}/attachments/${encodeURIComponent(a.filename)}`}
                          className="text-cyan-300 hover:text-cyan-200"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {a.filename}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {detail.agentNotes && detail.agentNotes.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-slate-300">Agent notes</h3>
                  <ul className="mt-2 space-y-2">
                    {detail.agentNotes.map((n) => (
                      <li key={n.id} className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm">
                        <p className="text-xs text-slate-500">
                          {n.author} · {n.kind} · {new Date(n.at).toLocaleString()}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-slate-300">{n.text}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <h3 className="text-sm font-semibold text-slate-300">Draft reply</h3>
                <input
                  value={draftSubject}
                  onChange={(e) => setDraftSubject(e.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
                <textarea
                  value={draftBody}
                  onChange={(e) => setDraftBody(e.target.value)}
                  rows={8}
                  className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void saveDraft()}
                    className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200"
                  >
                    Save draft
                  </button>
                  <button
                    type="button"
                    disabled={busy || !draftBody.trim()}
                    onClick={() => void sendReply()}
                    className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-500 disabled:opacity-60"
                  >
                    Send reply
                  </button>
                </div>
                {detail.draftReply?.sentAt ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Last sent {new Date(detail.draftReply.sentAt).toLocaleString()}
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
