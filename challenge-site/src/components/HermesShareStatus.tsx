'use client';

import { useCallback, useEffect, useState } from 'react';

export type ThreadShareActivity = {
  id: string;
  visibility: string;
  anchorTurnId: string | null;
  intendedRole: 'watcher' | 'controller';
  senderRetainsWatch: boolean;
  expiresAt: string | null;
  createdAt: string | null;
  status: string;
  recipientEmail: string | null;
  recipients: Array<{
    displayName: string | null;
    email: string | null;
    role: string;
    since: string | null;
    hasControl: boolean;
  }>;
};

type HermesShareStatusProps = {
  threadId: string;
  controllerName?: string | null;
  onManageShare?: () => void;
};

function formatShareWhen(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function recipientLabel(recipient: ThreadShareActivity['recipients'][number]): string {
  return recipient.displayName || recipient.email || 'Someone';
}

export default function HermesShareStatus({
  threadId,
  controllerName,
  onManageShare,
}: HermesShareStatusProps) {
  const [shares, setShares] = useState<ThreadShareActivity[]>([]);
  const [loading, setLoading] = useState(false);

  const loadShares = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/agent/threads/${encodeURIComponent(threadId)}/shares`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.shares)) {
        setShares(data.shares);
      }
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    void loadShares();
    const timer = window.setInterval(() => {
      void loadShares();
    }, 12000);
    return () => window.clearInterval(timer);
  }, [loadShares]);

  const activeShares = shares.filter((s) => s.status === 'active');
  if (!loading && !activeShares.length && !controllerName) return null;

  const lines: string[] = [];

  if (controllerName) {
    lines.push(`${controllerName} has control`);
  }

  for (const share of activeShares) {
    const opened = share.recipients.filter((r) => r.role !== 'owner_watch');
    if (!opened.length) {
      const target = share.recipientEmail ? ` · intended for ${share.recipientEmail}` : '';
      const role = share.intendedRole === 'controller' ? 'control' : 'watch';
      lines.push(`Share link active (${role})${target} · not opened yet`);
      continue;
    }
    for (const recipient of opened) {
      const roleLabel = recipient.hasControl
        ? 'controlling'
        : recipient.role === 'controller'
          ? 'joined (control pending)'
          : 'watching';
      const since = recipient.since ? ` since ${formatShareWhen(recipient.since)}` : '';
      lines.push(`${recipientLabel(recipient)} ${roleLabel}${since}`);
    }
  }

  if (!lines.length && loading) return null;

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-[11px] text-slate-400">
      <span
        className="shrink-0 rounded-full border border-slate-600 bg-slate-900 px-2 py-0.5 text-slate-300"
        title="Active shares on this conversation"
      >
        Shared
      </span>
      {lines.map((line) => (
        <span key={line} className="min-w-0 truncate text-slate-400">
          {line}
        </span>
      ))}
      {onManageShare ? (
        <button
          type="button"
          onClick={onManageShare}
          className="shrink-0 text-cyan-400/90 underline decoration-cyan-700/50 underline-offset-2 hover:text-cyan-300"
        >
          Manage
        </button>
      ) : null}
    </div>
  );
}
