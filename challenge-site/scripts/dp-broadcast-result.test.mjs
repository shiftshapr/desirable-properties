import assert from 'node:assert/strict';
import test from 'node:test';

const FAILURE_LABELS = {
  missing_email: 'no email on file',
  send_failed: 'send failed',
  resend_not_configured: 'email service not configured',
  opted_out: 'opted out',
};

function broadcastFailureLabel(error) {
  const code = String(error || '').trim();
  if (!code) return 'failed';
  return FAILURE_LABELS[code] || code.replace(/_/g, ' ');
}

function summarizeBroadcastFailures(failures) {
  const byError = new Map();
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

function formatBroadcastFailureBreakdown(failures, maxNames = 4) {
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

function formatBroadcastSendMessage(opts) {
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

function looksLikeEmail(value) {
  const s = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null;
}

test('looksLikeEmail accepts valid addresses and rejects display names', () => {
  assert.equal(looksLikeEmail('valeuchtmann@gmail.com'), 'valeuchtmann@gmail.com');
  assert.equal(looksLikeEmail('Bridgit'), null);
  assert.equal(looksLikeEmail('not-an-email'), null);
});

test('formatBroadcastSendMessage includes failure breakdown', () => {
  const msg = formatBroadcastSendMessage({
    successCount: 1,
    recipientCount: 6,
    failureCount: 5,
    failures: [
      { ok: false, userName: 'Bridgit', error: 'missing_email' },
      { ok: false, userName: 'Dee Frewert', error: 'missing_email' },
      { ok: false, userName: 'Leandra Preston', error: 'missing_email' },
      { ok: false, userName: 'Micah Nyatindo', error: 'missing_email' },
      { ok: false, userName: 'valeuchtmann@gmail.com', error: 'missing_email' },
    ],
  });
  assert.match(msg, /1\/6 succeeded/);
  assert.match(msg, /5 failed/);
  assert.match(msg, /no email on file/);
  assert.match(msg, /Bridgit/);
});

test('formatBroadcastFailureBreakdown groups by error code', () => {
  const breakdown = formatBroadcastFailureBreakdown([
    { ok: false, userName: 'A', error: 'missing_email' },
    { ok: false, userName: 'B', error: 'missing_email' },
    { ok: false, userName: 'C', error: 'send_failed' },
  ]);
  assert.match(breakdown, /2 no email on file: A, B/);
  assert.match(breakdown, /1 send failed: C/);
});
