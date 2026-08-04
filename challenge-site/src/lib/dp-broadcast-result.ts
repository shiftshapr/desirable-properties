export type BroadcastRecipientResult = {
  key?: string;
  userName?: string | null;
  email?: string | null;
  ok?: boolean;
  error?: string;
  resendId?: string;
};

const FAILURE_LABELS: Record<string, string> = {
  missing_email: 'no email on file',
  send_failed: 'send failed',
  resend_not_configured: 'email service not configured',
  opted_out: 'opted out',
};

export function broadcastFailureLabel(error: string | undefined | null) {
  const code = String(error || '').trim();
  if (!code) return 'failed';
  return FAILURE_LABELS[code] || code.replace(/_/g, ' ');
}

export function summarizeBroadcastFailures(failures: BroadcastRecipientResult[]) {
  const byError = new Map<string, BroadcastRecipientResult[]>();
  for (const row of failures) {
    const code = String(row.error || 'failed').trim() || 'failed';
    const list = byError.get(code) || [];
    list.push(row);
    byError.set(code, list);
  }
  return [...byError.entries()].map(([error, rows]) => ({
    error,
    label: broadcastFailureLabel(error),
    count: rows.length,
    recipients: rows,
  }));
}

export function formatBroadcastFailureBreakdown(failures: BroadcastRecipientResult[], maxNames = 4) {
  if (!failures.length) return '';
  const groups = summarizeBroadcastFailures(failures);
  const parts = groups.map((group) => {
    const names = group.recipients
      .map((r) => r.userName || r.email || r.key || 'Unknown')
      .filter(Boolean);
    const shown = names.slice(0, maxNames);
    const extra = names.length - shown.length;
    const namePart =
      shown.length > 0
        ? `: ${shown.join(', ')}${extra > 0 ? ` +${extra} more` : ''}`
        : '';
    return `${group.count} ${group.label}${namePart}`;
  });
  return parts.join('; ');
}

export function formatBroadcastSendMessage(opts: {
  successCount: number;
  recipientCount: number;
  failureCount: number;
  failures?: BroadcastRecipientResult[];
  testMode?: boolean;
  availableInArchive?: boolean;
}) {
  const { successCount, recipientCount, failureCount, failures = [], testMode, availableInArchive } =
    opts;

  if (testMode) {
    return `Test broadcast sent (${successCount}/${recipientCount}).`;
  }

  let msg = `Broadcast sent (${successCount}/${recipientCount} succeeded).`;
  if (failureCount > 0) {
    const breakdown = formatBroadcastFailureBreakdown(failures);
    msg += breakdown ? ` ${failureCount} failed: ${breakdown}.` : ` ${failureCount} failed.`;
  }
  if (availableInArchive) {
    msg += ' Added to participant archive.';
  }
  return msg;
}

export function looksLikeEmail(value: string | null | undefined) {
  const s = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null;
}
