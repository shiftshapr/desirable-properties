import { classifyDiscussPost } from '@/lib/discuss-patch';
import { canopiBookPageIdsForDp } from '@/lib/dp-canopi-chapters';
import { searchCanopiPosts } from '@/lib/dp-canopi-search';
import {
  bookDiscussHref,
  govhubDraftReadHref,
  type GovHubDraftProposal,
} from '@/lib/govhub';
import { evalsForItem, listReviewEvals } from '@/lib/workgroup-review-store';
import type { ReviewQueueItem, ReviewSource } from '@/lib/workgroup-review-types';

function normalizeAnchor(text: string): string {
  return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 240);
}

function conflictKey(item: Pick<ReviewQueueItem, 'anchorHash' | 'originalText' | 'key'>): string {
  if (item.anchorHash) return item.anchorHash;
  const orig = normalizeAnchor(item.originalText);
  if (orig) return `text:${orig}`;
  return `solo:${item.key}`;
}

export async function buildWorkgroupReviewQueue(opts: {
  workgroupId: string;
  dpId: string | null;
  draftRef: string | null;
  documentHref?: string | null;
  viewerUserId?: string | null;
}): Promise<ReviewQueueItem[]> {
  const draftHref = govhubDraftReadHref(opts.documentHref || null);
  const proposals = opts.draftRef
    ? await import('@/lib/workgroup-review-govhub').then((mod) =>
        mod.fetchDraftProposalsFresh(opts.draftRef!),
      )
    : [];

  const bookPageIds = canopiBookPageIdsForDp(opts.dpId);
  const canopi = bookPageIds.length
    ? await searchCanopiPosts({
        pageIds: bookPageIds,
        limit: 40,
        maxContentLength: 2000,
      })
    : { ok: true as const, posts: [] };

  const canopiPatches = (canopi.ok ? canopi.posts : []).filter((post) => {
    const parsed = classifyDiscussPost({ body: post.content, tagType: post.tagType });
    return parsed.kind === 'patch' || parsed.kind === 'insert';
  });

  const usedCanopiIds = new Set<string>();
  const items: ReviewQueueItem[] = [];

  for (const proposal of proposals) {
    const ext = String(proposal.external_id || '').trim();
    const channel = String(proposal.source_channel || '').toLowerCase();
    const matchedCanopi =
      channel === 'canopi' && ext
        ? canopiPatches.find((post) => post.id === ext)
        : undefined;
    if (matchedCanopi) usedCanopiIds.add(matchedCanopi.id);

    const sources: ReviewSource[] = ['govhub'];
    if (matchedCanopi) sources.push('canopi');

    const pending = String(proposal.status || 'pending').toLowerCase() === 'pending';
    items.push({
      key: `govhub:${proposal.id}`,
      sources,
      govhubProposalId: proposal.id,
      canopiMessageId: matchedCanopi?.id || ext || null,
      patchMode: String(proposal.patch_mode || 'replace').toLowerCase() === 'insert' ? 'insert' : 'replace',
      originalText: proposal.original_text || '',
      proposedText: proposal.proposed_text || '',
      rationale: proposal.rationale || null,
      authorName: proposal.author_name || matchedCanopi?.authorName || 'Someone',
      createdAt: proposal.created_at || matchedCanopi?.createdAt || '',
      status: proposal.status || 'pending',
      anchorHash: proposal.anchor_hash || null,
      conflictSetId: '',
      conflictCount: 1,
      hrefs: {
        book: matchedCanopi
          ? bookDiscussHref({ dpId: opts.dpId, pageId: matchedCanopi.pageId })
          : opts.dpId
            ? bookDiscussHref({ dpId: opts.dpId })
            : null,
        govhub: draftHref,
      },
      evals: { yes: 0, no: 0, mine: null, comments: [] },
      canPromote: pending,
      promoteBlockReason: pending
        ? null
        : `Already ${proposal.status}. Only pending Gov Hub proposals can be promoted into the next revision draft.`,
    });
  }

  for (const post of canopiPatches) {
    if (usedCanopiIds.has(post.id)) continue;
    const parsed = classifyDiscussPost({ body: post.content, tagType: post.tagType });
    items.push({
      key: `canopi:${post.id}`,
      sources: ['canopi'],
      govhubProposalId: null,
      canopiMessageId: post.id,
      patchMode: parsed.kind === 'insert' ? 'insert' : 'replace',
      originalText: '',
      proposedText: parsed.content,
      rationale: null,
      authorName: post.authorName || 'Someone',
      createdAt: post.createdAt || '',
      status: 'canopi_only',
      anchorHash: null,
      conflictSetId: '',
      conflictCount: 1,
      hrefs: {
        book: bookDiscussHref({ dpId: opts.dpId, pageId: post.pageId }),
        govhub: draftHref,
      },
      evals: { yes: 0, no: 0, mine: null, comments: [] },
      canPromote: false,
      promoteBlockReason:
        'This book Discuss patch is not a Gov Hub proposal yet, so it cannot be promoted into the revision draft. File or sync it as a Gov Hub patch first.',
    });
  }

  const evals = await listReviewEvals(opts.workgroupId);
  for (const item of items) {
    item.evals = evalsForItem(evals, item.key, opts.viewerUserId);
  }

  const groups = new Map<string, ReviewQueueItem[]>();
  for (const item of items) {
    const key = conflictKey(item);
    item.conflictSetId = key;
    const list = groups.get(key) || [];
    list.push(item);
    groups.set(key, list);
  }
  for (const group of groups.values()) {
    const pending = group.filter((item) => String(item.status).toLowerCase() === 'pending');
    const count = pending.length > 1 ? pending.length : 1;
    for (const item of group) item.conflictCount = pending.length > 1 ? count : 1;
  }

  items.sort((a, b) => {
    if (b.conflictCount !== a.conflictCount) return b.conflictCount - a.conflictCount;
    return Date.parse(b.createdAt || '0') - Date.parse(a.createdAt || '0');
  });
  return items;
}

export function proposalFingerprint(proposal: GovHubDraftProposal): string {
  return `${proposal.source_channel || ''}:${proposal.external_id || proposal.id}`;
}
