/**
 * Canopi post search for DP admin (blueberries reply activities).
 * Adapted from metaweb-book certificate search-posts.
 */

import { DP_CANOPI_CHAPTERS, DP_CANOPI_COMMUNITY_ID } from '@/lib/dp-canopi-chapters';
import { createFeedCache } from '@/lib/canopi-feed-cache';

const DEFAULT_COMMUNITY_ID = DP_CANOPI_COMMUNITY_ID;

function resolveCanopiApiBase() {
  const explicit = (process.env.CANOPI_API_BASE || process.env.CANOPI_API || '').trim();
  if (explicit) return explicit.replace(/\/$/, '');
  return 'https://api.canopi.live';
}

function messageAuthorName(m: Record<string, unknown>) {
  const author = m.author as Record<string, unknown> | undefined;
  const user = m.user as Record<string, unknown> | undefined;
  return String(
    m.authorName ?? author?.displayName ?? author?.name ?? author?.handle ?? user?.displayName ?? user?.name ?? '',
  ).trim();
}

function normalizeCanopiMessage(m: Record<string, unknown>, fallbackPageId: string, communityId: string) {
  const author = m.author as Record<string, unknown> | undefined;
  const community = m.community as Record<string, unknown> | undefined;
  const id = String(m.id ?? m.messageId ?? '').trim();
  const content = String(m.content ?? m.body ?? '').trim();
  const pid = String(m.pageId ?? m.page_id ?? fallbackPageId ?? '').trim();
  const commId = String(m.communityId ?? m.community_id ?? community?.id ?? communityId ?? DEFAULT_COMMUNITY_ID).trim();
  return {
    id,
    content,
    pageId: pid || null,
    communityId: commId || DEFAULT_COMMUNITY_ID,
    authorId: (m.authorId ?? m.userId ?? author?.id ?? null) as string | null,
    authorName: messageAuthorName(m) || null,
    createdAt: (m.createdAt ?? m.created_at ?? null) as string | null,
    tagType: String(m.tagType ?? m.tag_type ?? '').trim() || null,
    parentId: (m.parentId ?? m.parent_id ?? null) as string | null,
    anchorExact: anchorExactFrom(m.contextAnchor ?? m.context_anchor),
    ...payloadFields(m.payload),
  };
}

/** Insert position and the author's rationale, from the post payload. */
function payloadFields(raw: unknown): { insertPosition: 'above' | 'below' | null; rationale: string | null } {
  let payload = raw;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = null;
    }
  }
  const p = (payload || {}) as { insertPosition?: unknown; aiAssist?: { patchRationale?: unknown } };
  const position = p.insertPosition === 'above' || p.insertPosition === 'below' ? p.insertPosition : null;
  const rationale = typeof p.aiAssist?.patchRationale === 'string' ? p.aiAssist.patchRationale.trim() : '';
  return { insertPosition: position, rationale: rationale || null };
}

/** The anchored passage (TextQuoteSelector.exact) of a Canopi post, if any. */
function anchorExactFrom(raw: unknown): string | null {
  let anchor = raw;
  if (typeof anchor === 'string') {
    try {
      anchor = JSON.parse(anchor);
    } catch {
      return null;
    }
  }
  const quote = (anchor as { textQuote?: { exact?: unknown } } | null)?.textQuote;
  const exact = typeof quote?.exact === 'string' ? quote.exact.trim() : '';
  return exact || null;
}

type CanopiPageFeed =
  | { ok: true; items: Record<string, unknown>[]; pageId: string }
  | { ok: false; items: Record<string, unknown>[]; error: string };

/** 60 s cache, 4 concurrent Canopi feed reads per process (canopi#32). */
const feedCache = createFeedCache<CanopiPageFeed>({ ttlMs: 60_000, maxConcurrent: 4 });

function fetchCanopiMessagesForPage(args: { pageId: string; communityId: string; limit?: number }) {
  const key = `${args.communityId}|${args.pageId}|${Math.min(args.limit ?? 100, 100)}`;
  return feedCache.get(key, () => fetchCanopiMessagesForPageUncached(args));
}

async function fetchCanopiMessagesForPageUncached({
  pageId,
  communityId,
  limit = 100,
}: {
  pageId: string;
  communityId: string;
  limit?: number;
}) {
  const params = new URLSearchParams();
  if (communityId) params.set('communityId', communityId);
  params.set('pageId', pageId);
  params.set('limit', String(Math.min(limit, 100)));
  const url = `${resolveCanopiApiBase()}/api/messages?${params}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        ok: false as const,
        items: [] as Record<string, unknown>[],
        error: `Canopi messages ${res.status}${errText ? `: ${errText.slice(0, 120)}` : ''}`,
      };
    }
    const json = await res.json().catch(() => ({}));
    const items =
      json?.items ?? json?.data?.items ?? json?.messages ?? (Array.isArray(json) ? json : []);
    return { ok: true as const, items: items as Record<string, unknown>[], pageId: json?.pageId || pageId };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Canopi request failed';
    return {
      ok: false as const,
      items: [] as Record<string, unknown>[],
      error: message,
    };
  }
}

function chapterKey(pageId: string | null) {
  if (!pageId) return '';
  const m = String(pageId).trim().toLowerCase().match(/^dp-?(\d{1,2})$/);
  if (m) return `dp${String(Number(m[1])).padStart(2, '0')}`;
  return String(pageId).trim().toLowerCase();
}

export type CanopiSearchPost = {
  id: string;
  content: string;
  pageId: string | null;
  communityId: string;
  authorId: string | null;
  authorName: string | null;
  createdAt: string | null;
  tagType: string | null;
  /** Set on replies; top-level posts have null. */
  parentId: string | null;
  /** The passage the post is anchored to, when it has one. */
  anchorExact: string | null;
  /** INSERT posts: where the text goes relative to the anchored passage. */
  insertPosition: 'above' | 'below' | null;
  /** payload.aiAssist.patchRationale, when the post carries one. */
  rationale: string | null;
};

export async function searchCanopiPosts(opts: {
  pageId?: string;
  /** Extra pageIds to fetch alongside pageId (e.g. hashed book URL slug + short dp01). */
  pageIds?: string[];
  q?: string;
  authorName?: string;
  communityId?: string;
  /** Read several communities (e.g. DP_BOOK_COMMUNITY_IDS); overrides communityId. */
  communityIds?: string[];
  limit?: number;
  /** Max characters kept per post body (default 280). */
  maxContentLength?: number;
}) {
  const needle = String(opts.q || '').trim().toLowerCase();
  const chapterFilter = String(opts.pageId || '').trim();
  const authorNeedle = String(opts.authorName || '').trim().toLowerCase();
  const communityId = String(opts.communityId || DEFAULT_COMMUNITY_ID).trim();
  const communityIds = (opts.communityIds || []).map((c) => String(c || '').trim()).filter(Boolean);
  const limit = Math.min(200, Math.max(1, opts.limit || 40));
  const maxContentLength = Math.min(4000, Math.max(80, opts.maxContentLength || 280));

  const extraIds = (opts.pageIds || []).map((p) => String(p || '').trim()).filter(Boolean);
  const pageIdsToFetch = chapterFilter || extraIds.length
    ? [...new Set([chapterFilter, ...extraIds].filter(Boolean))]
    : DP_CANOPI_CHAPTERS.filter((c) => c.value).map((c) => c.value);

  const merged: ReturnType<typeof normalizeCanopiMessage>[] = [];
  let fetchError: string | null = null;

  const communitiesToFetch = communityIds.length ? [...new Set(communityIds)] : [communityId];
  const batches = await Promise.all(
    communitiesToFetch.flatMap((comm) =>
      pageIdsToFetch.map(async (apiPageId) => ({
        comm,
        batch: await fetchCanopiMessagesForPage({ pageId: apiPageId, communityId: comm, limit: Math.max(limit, 20) }),
      })),
    ),
  );

  const seenIds = new Set<string>();
  for (const { comm, batch } of batches) {
    if (!batch.ok) {
      fetchError = batch.error || fetchError;
      continue;
    }
    for (const m of batch.items) {
      const msg = normalizeCanopiMessage(m, batch.pageId, comm);
      if (msg.id && seenIds.has(msg.id)) continue;
      seenIds.add(msg.id);
      merged.push(msg);
    }
  }

  if (!merged.length && fetchError) {
    return { ok: false as const, posts: [] as CanopiSearchPost[], error: fetchError };
  }

  const allowedKeys = new Set(
    pageIdsToFetch.flatMap((pid) => {
      const key = chapterKey(pid);
      return key ? [key, pid.toLowerCase()] : [pid.toLowerCase()];
    }),
  );
  const filterKey = chapterKey(chapterFilter || null);
  const posts: CanopiSearchPost[] = [];

  for (const m of merged) {
    if (!m.id) continue;
    if (pageIdsToFetch.length) {
      const mKey = chapterKey(m.pageId);
      const mPid = (m.pageId || '').toLowerCase();
      if (!allowedKeys.has(mPid) && !(mKey && allowedKeys.has(mKey))) continue;
    } else if (chapterFilter && chapterKey(m.pageId) !== filterKey && m.pageId !== chapterFilter) {
      continue;
    }
    if (authorNeedle && !(m.authorName || '').toLowerCase().includes(authorNeedle)) continue;
    if (
      needle &&
      !m.content.toLowerCase().includes(needle) &&
      !(m.pageId || '').toLowerCase().includes(needle) &&
      !(m.authorName || '').toLowerCase().includes(needle)
    ) {
      continue;
    }
    posts.push({
      id: m.id,
      content: m.content.slice(0, maxContentLength),
      pageId: m.pageId,
      communityId: m.communityId,
      authorId: m.authorId,
      authorName: m.authorName,
      createdAt: m.createdAt,
      tagType: m.tagType,
      parentId: m.parentId,
      anchorExact: m.anchorExact,
      insertPosition: m.insertPosition,
      rationale: m.rationale,
    });
  }

  posts.sort((a, b) => Date.parse(b.createdAt || '0') - Date.parse(a.createdAt || '0'));
  return { ok: true as const, posts: posts.slice(0, limit) };
}

export async function fetchCanopiMessageById(messageId: string) {
  const id = String(messageId || '').trim();
  if (!id) return { ok: false as const, error: 'message_id_required' };
  const url = `${resolveCanopiApiBase()}/api/messages/${encodeURIComponent(id)}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    return { ok: false as const, error: `Canopi message ${res.status}${errText ? `: ${errText.slice(0, 120)}` : ''}` };
  }
  const json = await res.json().catch(() => ({}));
  const raw = (json?.message ?? json) as Record<string, unknown>;
  const post = normalizeCanopiMessage(raw, String(raw?.pageId ?? raw?.page_id ?? ''), DEFAULT_COMMUNITY_ID);
  if (!post.id) return { ok: false as const, error: 'message_not_found' };
  return { ok: true as const, post };
}
