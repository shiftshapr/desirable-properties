'use client';

import { useCallback, useEffect, useState } from 'react';

type BroadcastHistoryItem = {
  id: string;
  subject: string;
  sentAt: string;
  testMode: boolean;
  ok: boolean;
};

type InviteHistoryItem = {
  id?: string;
  recipient_email?: string;
  status?: string;
  sent_at?: string;
  created_at?: string;
  subject?: string;
  source?: string;
};

type Props = {
  open: boolean;
  email: string | null;
  displayName?: string | null;
  onClose: () => void;
};

export default function BroadcastRecipientHistoryModal({
  open,
  email,
  displayName,
  onClose,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [broadcasts, setBroadcasts] = useState<BroadcastHistoryItem[]>([]);
  const [invites, setInvites] = useState<InviteHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/broadcast?view=recipient-history&email=${encodeURIComponent(email)}`,
        { credentials: 'include' },
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || data.message || 'Could not load history');
      }
      setBroadcasts(data.broadcasts || []);
      setInvites(data.invites || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load history');
      setBroadcasts([]);
      setInvites([]);
    } finally {
      setLoading(false);
    }
  }, [email]);

  useEffect(() => {
    if (open && email) void load();
  }, [open, email, load]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 p-5"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-2xl"
        role="dialog"
        aria-labelledby="recipient-history-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-800 px-5 py-4">
          <h3 id="recipient-history-title" className="text-base font-semibold text-white">
            Communication history
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            {displayName && displayName !== email ? `${displayName} · ` : ''}
            {email}
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="text-sm text-slate-400">Loading history…</p>
          ) : error ? (
            <p className="text-sm text-rose-300">{error}</p>
          ) : (
            <div className="space-y-5">
              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Broadcasts
                </h4>
                {broadcasts.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No broadcast sends recorded.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-slate-800 rounded-lg border border-slate-800">
                    {broadcasts.map((item) => (
                      <li key={item.id} className="px-3 py-2 text-sm">
                        <p className="font-medium text-white">{item.subject || '(no subject)'}</p>
                        <p className="text-xs text-slate-500">
                          {new Date(item.sentAt).toLocaleString()}
                          {item.testMode ? ' · test' : ''}
                          {item.ok === false ? ' · failed' : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Invite / outreach
                </h4>
                {invites.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No invite send records.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-slate-800 rounded-lg border border-slate-800">
                    {invites.map((item, i) => (
                      <li key={item.id || `${item.sent_at || item.created_at}-${i}`} className="px-3 py-2 text-sm">
                        <p className="font-medium text-white">
                          {item.subject || item.status || 'Invite'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {item.sent_at || item.created_at
                            ? new Date(String(item.sent_at || item.created_at)).toLocaleString()
                            : '—'}
                          {item.status ? ` · ${item.status}` : ''}
                          {item.source ? ` · ${item.source}` : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          )}
        </div>

        <div className="border-t border-slate-800 px-5 py-4 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
