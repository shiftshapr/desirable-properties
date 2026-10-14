/**
 * Public chat teaser for callers without a session: Gov Hub's anonymous message list.
 * Pure (no `@/` imports) so `scripts/workgroup-public-teaser.test.mjs` can import it with
 * `node --experimental-strip-types`.
 */

export const PUBLIC_TEASER_LIMIT = 5;

type TeaserMessage = { id: string };

/**
 * Request for Gov Hub's public list: no `full`, no `before`, and never an Authorization
 * header, whatever session the caller has.
 */
export function publicMessagesRequest(
  govhubBase: string,
  workgroupId: string,
): { url: string; headers: Record<string, string> } {
  const base = String(govhubBase || '').replace(/\/$/, '');
  return {
    url: `${base}/api/workgroups/${encodeURIComponent(workgroupId)}/messages/`,
    headers: { Accept: 'application/json' },
  };
}

/** Teaser response for a non-member: the latest messages (oldest first), read-only. */
export function anonymousTeaserResponse<T extends TeaserMessage>(
  messages: T[] | null | undefined,
  limit: number = PUBLIC_TEASER_LIMIT,
): { messages: T[]; is_member: false; can_post: false; teaser: true; count: number } {
  const list = Array.isArray(messages) ? messages.filter((m) => m && m.id) : [];
  const latest = list.slice(-limit);
  return { messages: latest, is_member: false, can_post: false, teaser: true, count: latest.length };
}
