import { discussPatchActivityText } from '@/lib/discuss-patch';
import { searchCanopiPosts } from '@/lib/dp-canopi-search';
import { fetchChallengeActivity, govhubUrl } from '@/lib/govhub';

export type ActivityFeedKind =
  | 'govhub'
  | 'workgroup_message'
  | 'workgroup_invite'
  | 'canopi'
  | 'canopi_patch'
  | 'canopi_insert';

export type ActivityFeedItem = {
  id: string;
  createdAt: string;
  text: string;
  href: string;
  kind: ActivityFeedKind;
  /** Optional badge for discuss patch/insert (or other typed events). */
  badge?: string | null;
};

function inferKind(text: string, href: string): ActivityFeedKind {
  if (href.startsWith('/workgroups/')) {
    if (text.includes('invited') || text.includes('invitation')) return 'workgroup_invite';
    if (text.includes('posted')) return 'workgroup_message';
  }
  return 'govhub';
}

async function fetchCanopiDiscussItems(limit: number): Promise<ActivityFeedItem[]> {
  // Sample intro + a few early chapters only — full 23-chapter scan is too slow for SSR.
  const samplePages = ['intro', 'dp01', 'dp02', 'dp03', 'dp04', 'dp05'];
  const batches = await Promise.all(
    samplePages.map((pageId) => searchCanopiPosts({ pageId, limit: Math.min(limit, 8) })),
  );
  const posts = batches.flatMap((b) => (b.ok ? b.posts : []));
  posts.sort((a, b) => Date.parse(b.createdAt || '0') - Date.parse(a.createdAt || '0'));

  return posts.slice(0, limit).map((p) => {
    const classified = discussPatchActivityText({
      authorName: p.authorName,
      pageId: p.pageId,
      body: p.content,
    });
    const kind: ActivityFeedKind =
      classified.kind === 'patch'
        ? 'canopi_patch'
        : classified.kind === 'insert'
          ? 'canopi_insert'
          : 'canopi';
    return {
      id: `canopi-${p.id}`,
      createdAt: p.createdAt as string,
      text: classified.text,
      href: p.pageId
        ? `https://book.desirableproperties.org/viewer/${encodeURIComponent(p.pageId)}`
        : 'https://book.desirableproperties.org/',
      kind,
      badge: classified.badge,
    };
  });
}

/** Merge Gov Hub layer activity (incl. WG chat/invite) + Canopi discuss posts. */
export async function fetchUnifiedActivity(limit = 24): Promise<ActivityFeedItem[]> {
  const [govhub, canopi] = await Promise.all([
    fetchChallengeActivity(limit),
    fetchCanopiDiscussItems(Math.min(12, limit)),
  ]);

  const merged: ActivityFeedItem[] = [
    ...govhub.map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      text: item.text,
      href: item.href.startsWith('http') || item.href.startsWith('/')
        ? item.href
        : govhubUrl(item.href),
      kind: inferKind(item.text, item.href),
    })),
    ...canopi,
  ];

  merged.sort((a, b) => Date.parse(b.createdAt || '0') - Date.parse(a.createdAt || '0'));

  const seen = new Set<string>();
  const out: ActivityFeedItem[] = [];
  for (const item of merged) {
    if (!item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}
