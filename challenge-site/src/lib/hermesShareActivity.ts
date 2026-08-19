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
  redeemedAt?: string | null;
  redeemedByVerifierId?: string | null;
  recipients: Array<{
    displayName: string | null;
    email: string | null;
    role: string;
    since: string | null;
    hasControl: boolean;
  }>;
};

export function formatShareWhen(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function recipientLabel(recipient: ThreadShareActivity['recipients'][number]): string {
  return recipient.displayName || recipient.email || 'Someone';
}

/** Human-readable status lines for one share grant. */
export function describeShareActivity(share: ThreadShareActivity): string[] {
  const opened = share.recipients.filter((r) => r.role !== 'owner_watch');
  if (!opened.length) {
    const target = share.recipientEmail ? ` for ${share.recipientEmail}` : '';
    const role = share.intendedRole === 'controller' ? 'control' : 'watch';
    return [`Link sent (${role})${target} · not opened yet`];
  }
  return opened.map((recipient) => {
    const roleLabel = recipient.hasControl
      ? 'controlling'
      : recipient.role === 'control_invited'
        ? 'invited to control (not accepted)'
        : recipient.role === 'controller'
          ? 'joined'
          : 'watching';
    const since = recipient.since ? ` since ${formatShareWhen(recipient.since)}` : '';
    return `${recipientLabel(recipient)} ${roleLabel}${since}`;
  });
}

/** Active shares anchored at this turn (per-message share point). */
export function sharesForTurn(
  shares: ThreadShareActivity[],
  turnId: string | null,
): ThreadShareActivity[] {
  if (!turnId) return [];
  return shares.filter(
    (s) => s.status === 'active' && s.anchorTurnId === turnId,
  );
}

export function describeSharesAtTurn(
  shares: ThreadShareActivity[],
  turnId: string | null,
): string[] {
  return sharesForTurn(shares, turnId).flatMap(describeShareActivity);
}
