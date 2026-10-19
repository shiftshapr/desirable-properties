/**
 * Open proposals per DP, for the /workgroups cards: Gov Hub proposals still pending a
 * co-editor decision, plus book Discuss patches/inserts not yet filed to Gov Hub (the same
 * items the Review tab lists as "Canopi only"). Cached for 5 minutes per process.
 */
import { classifyDiscussPost } from '@/lib/discuss-patch';
import { DP_BOOK_COMMUNITY_IDS, canopiBookPageIdsForDp } from '@/lib/dp-canopi-chapters';
import { searchCanopiPosts } from '@/lib/dp-canopi-search';
import { fetchDraftProposalsFresh } from '@/lib/workgroup-review-govhub';

const TTL_MS = 5 * 60_000;
let cached: { at: number; counts: Map<string, number> } | null = null;
let inflight: Promise<Map<string, number>> | null = null;

async function openForDp(dpId: string, draftRef: string | null): Promise<number> {
  const [proposals, canopi] = await Promise.all([
    draftRef ? fetchDraftProposalsFresh(draftRef) : Promise.resolve([]),
    searchCanopiPosts({
      pageIds: canopiBookPageIdsForDp(dpId),
      communityIds: DP_BOOK_COMMUNITY_IDS,
      limit: 200,
      maxContentLength: 4000,
    }),
  ]);
  const filed = new Set(
    proposals
      .filter((p) => String(p.source_channel || '').toLowerCase() === 'canopi' && p.external_id)
      .map((p) => String(p.external_id)),
  );
  const pending = proposals.filter((p) => String(p.status || '').toLowerCase() === 'pending').length;
  const unfiled = (canopi.ok ? canopi.posts : []).filter((post) => {
    if (post.parentId || filed.has(post.id)) return false;
    const kind = classifyDiscussPost({ body: post.content, tagType: post.tagType }).kind;
    return kind === 'patch' || kind === 'insert';
  }).length;
  return pending + unfiled;
}

/** DP id ("DP4") → open proposal count. DPs whose lookup fails are left out. */
export async function openProposalCountsByDp(
  dps: Array<{ dp: string; draft_ref: string | null }>,
): Promise<Map<string, number>> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.counts;
  if (inflight) return inflight;
  inflight = (async () => {
    const counts = new Map<string, number>();
    await Promise.all(
      dps.map(async ({ dp, draft_ref }) => {
        try {
          counts.set(dp, await openForDp(dp, draft_ref));
        } catch {
          /* leave this DP out */
        }
      }),
    );
    cached = { at: Date.now(), counts };
    return counts;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
