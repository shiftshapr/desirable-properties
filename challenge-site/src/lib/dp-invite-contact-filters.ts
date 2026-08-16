import type { AdminInviteSendRecord } from '@/lib/admin-invite-api';
import proposedOrgHidesData from '@/data/dp-invite-proposed-org-hides.json';

export type ProposedOrgHideEntry = {
  name: string;
  email: string;
  reason: string;
};

export type ProposedOrgHidesBundle = {
  generated_at: string;
  count: number;
  entries: ProposedOrgHideEntry[];
};

const proposedBundle = proposedOrgHidesData as ProposedOrgHidesBundle;

/** Lowercased emails from the reviewed proposed-hide list (see meta-console/docs/EMAIL-INVITES-PROPOSED-HIDES.md). */
export const PROPOSED_ORG_HIDE_EMAILS: ReadonlySet<string> = new Set(
  proposedBundle.entries.map((row) => row.email.trim().toLowerCase()),
);

export const PROPOSED_ORG_HIDE_COUNT = proposedBundle.count;

export const PROPOSED_ORG_HIDE_GENERATED_AT = proposedBundle.generated_at;

const RECENT_SEND_STATUSES = new Set(['sent', 'client_prepared']);

export function normalizeInviteEmail(email: string | null | undefined): string {
  return (email || '').trim().toLowerCase();
}

/** Latest send timestamp per recipient (ms since epoch), for statuses that count as outreach. */
export function buildRecentSendIndex(
  records: AdminInviteSendRecord[],
  statuses: ReadonlySet<string> = RECENT_SEND_STATUSES,
): Map<string, number> {
  const index = new Map<string, number>();
  for (const row of records) {
    if (!statuses.has(row.status)) continue;
    const email = normalizeInviteEmail(row.recipient_email);
    if (!email || !row.created_at) continue;
    const ts = Date.parse(row.created_at);
    if (Number.isNaN(ts)) continue;
    const prev = index.get(email);
    if (prev == null || ts > prev) index.set(email, ts);
  }
  return index;
}

export function wasSentWithinDays(
  email: string | null | undefined,
  sendIndex: Map<string, number>,
  days: number,
  nowMs: number = Date.now(),
): boolean {
  const normalized = normalizeInviteEmail(email);
  if (!normalized || days <= 0) return false;
  const sentAt = sendIndex.get(normalized);
  if (sentAt == null) return false;
  const windowMs = days * 24 * 60 * 60 * 1000;
  return nowMs - sentAt < windowMs;
}

export function isProposedOrgHide(email: string | null | undefined): boolean {
  const normalized = normalizeInviteEmail(email);
  return Boolean(normalized && PROPOSED_ORG_HIDE_EMAILS.has(normalized));
}

export function proposedOrgHideReason(email: string | null | undefined): string | null {
  const normalized = normalizeInviteEmail(email);
  if (!normalized) return null;
  const entry = proposedBundle.entries.find((row) => row.email === normalized);
  return entry?.reason ?? null;
}

export type InviteListFilterOptions = {
  excludeRecentSends: boolean;
  recentSendDays: number;
  hideOrgAddresses: boolean;
  sendIndex: Map<string, number>;
};

export function passesInviteListFilters(
  email: string | null | undefined,
  opts: InviteListFilterOptions,
): boolean {
  if (opts.hideOrgAddresses && isProposedOrgHide(email)) return false;
  if (opts.excludeRecentSends && wasSentWithinDays(email, opts.sendIndex, opts.recentSendDays)) {
    return false;
  }
  return true;
}
