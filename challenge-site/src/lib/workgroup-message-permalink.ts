/**
 * Workgroup chat message permalinks: `/workgroups/<slug>?tab=chat&m=<message id>`.
 *
 * Pure helpers (no `@/` imports) so `scripts/workgroup-message-permalink.test.mjs`
 * can import this file directly with `node --experimental-strip-types`.
 */

/** Older chat pages the deep link loads before it gives up. */
export const MAX_PERMALINK_PAGES = 10;

const MESSAGE_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

/** Message id from the `m` query param, or null when it is missing or malformed. */
export function normalizeWorkgroupMessageParam(value: string | null | undefined): string | null {
  const id = String(value ?? '').trim();
  return MESSAGE_ID_RE.test(id) ? id : null;
}

/** DOM id of a chat message element. */
export function workgroupMessageAnchorId(messageId: string): string {
  return `m-${messageId}`;
}

/** Permalink path for one chat message on the DP site collab page. */
export function workgroupChatMessagePath(slug: string, messageId: string): string {
  const params = new URLSearchParams({ tab: 'chat', m: messageId });
  return `/workgroups/${encodeURIComponent(slug)}?${params.toString()}`;
}

/**
 * Activity href for a `workgroup_message_posted` event: the message permalink when the
 * event carries `message_id` and the collab page is on; otherwise `fallbackHref`.
 */
export function workgroupMessageEventHref(opts: {
  slug: string | null | undefined;
  payload: Record<string, unknown> | null | undefined;
  collabEnabled: boolean;
  fallbackHref: string;
}): string {
  const slug = String(opts.slug ?? '').trim();
  const messageId = normalizeWorkgroupMessageParam(
    opts.payload?.message_id == null ? null : String(opts.payload.message_id),
  );
  if (!slug || !messageId || !opts.collabEnabled) return opts.fallbackHref;
  return workgroupChatMessagePath(slug, messageId);
}

type HasId = { id: string };

/** Messages from `older` that are not in `latest`, followed by `latest` (oldest first). */
export function mergeOlderMessages<T extends HasId>(older: T[], latest: T[]): T[] {
  const seen = new Set(latest.map((m) => m.id));
  return [...older.filter((m) => !seen.has(m.id)), ...latest];
}

/**
 * Load older chat pages until `targetId` is present.
 * `fetchOlder(beforeId)` returns the page of messages older than `beforeId` (oldest first).
 * Stops when the message is found, a page adds nothing new, or after `maxPages` pages.
 * Returns the older messages it loaded (oldest first) and whether the target was found.
 */
export async function loadOlderUntilMessage<T extends HasId>(opts: {
  targetId: string;
  current: T[];
  fetchOlder: (beforeId: string) => Promise<T[]>;
  maxPages?: number;
}): Promise<{ older: T[]; found: boolean; pages: number }> {
  const maxPages = opts.maxPages ?? MAX_PERMALINK_PAGES;
  const seen = new Set(opts.current.map((m) => m.id));
  let older: T[] = [];
  if (seen.has(opts.targetId)) return { older, found: true, pages: 0 };

  let oldest = opts.current[0]?.id;
  let pages = 0;
  while (oldest && pages < maxPages) {
    pages += 1;
    const page = await opts.fetchOlder(oldest);
    const fresh = page.filter((m) => !seen.has(m.id));
    if (!fresh.length) break;
    for (const m of fresh) seen.add(m.id);
    older = [...fresh, ...older];
    if (seen.has(opts.targetId)) return { older, found: true, pages };
    oldest = fresh[0].id;
  }
  return { older, found: false, pages };
}
