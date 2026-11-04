/**
 * Unread workgroup chat (owner, 2026-11-04). Gov Hub keeps a read cursor per member and workgroup
 * (services/workgroup_chat_unread.py); at launch every member's cursor was seeded 10 days back.
 * These helpers are pure so they can be tested without a browser.
 */

export type ChatUnreadEntry = {
  workgroup_id: string;
  slug: string;
  unread: number;
  first_unread_message_id: string | null;
  latest_message_at?: string;
};

export type ChatUnreadResponse = { total: number; workgroups: ChatUnreadEntry[] };

/** "3", or "99+" from 100 up; empty for none. */
export function formatUnreadCount(count: number | null | undefined): string {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (!n) return '';
  return n > 99 ? '99+' : String(n);
}

/** Accessible name for the Chat tab. */
export function chatTabAriaLabel(count: number | null | undefined): string {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  if (!n) return 'Chat';
  return `Chat, ${formatUnreadCount(n)} unread message${n === 1 ? '' : 's'}`;
}

export function unreadForWorkgroup(data: ChatUnreadResponse | null | undefined, workgroupId: string): number {
  return data?.workgroups?.find((w) => w.workgroup_id === workgroupId)?.unread ?? 0;
}

/** The newest message on screen (messages are oldest first): what to mark read up to. */
export function newestMessageId(messages: Array<{ id: string }>): string | null {
  return messages.length ? messages[messages.length - 1].id : null;
}

/**
 * Where the "New messages" line goes: the first unread message as of the first load. Later loads
 * never move it, so it stays put while the member reads, even after they are marked read.
 */
export function pickDividerId(current: string | null | undefined, firstLoad: string | null | undefined, decided: boolean): string | null {
  if (decided) return current ?? null;
  return firstLoad ?? null;
}
