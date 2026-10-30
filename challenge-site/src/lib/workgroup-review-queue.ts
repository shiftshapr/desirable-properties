import { attachAnchorEvals } from '@/lib/anchor-eval.server';
import { classifyDiscussPost } from '@/lib/discuss-patch';
import { skippedCanopiPostIds } from '@/lib/canopi-filing-skips.server';
import { DP_BOOK_COMMUNITY_IDS, canopiBookPageIdsForDp } from '@/lib/dp-canopi-chapters';
import { searchCanopiPosts } from '@/lib/dp-canopi-search';
import {
  bookDiscussHref,
  bookDiscussPostHref,
  govhubDraftReadHref,
  type GovHubDraftProposal,
} from '@/lib/govhub';
import { loadCanopiFilingReportWithTime } from '@/lib/canopi-filing-report';
import { evalsForItem, listReviewEvals } from '@/lib/workgroup-review-store';
import type { ReviewQueueItem, ReviewSource } from '@/lib/workgroup-review-types';
import { encodedInsertOf } from '@/lib/encoded-insert';
import { sectionLabelFor } from '@/lib/chapter-sections';
import {
  cachedStyleChecks,
  currentStyleCheckModel,
  styleCheckInputHash,
  type StyleCheckInput,
} from '@/lib/style-check.server';

function patchModeOf(raw: string | null | undefined): ReviewQueueItem['patchMode'] {
  const mode = String(raw || 'replace').toLowerCase();
  if (mode === 'editorial_bundle') return 'bundle';
  if (mode === 'dedup_bundle') return 'dedup';
  return mode === 'insert' || mode === 'insert_after' ? 'insert' : 'replace';
}

/** Gov Hub: insert goes above the anchored passage, insert_after below it. */
function govhubInsertPosition(raw: string | null | undefined): ReviewQueueItem['insertPosition'] {
  const mode = String(raw || '').toLowerCase();
  if (mode === 'insert_after') return 'below';
  return mode === 'insert' ? 'above' : null;
}

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
  const govhub = await import('@/lib/workgroup-review-govhub');
  const [proposals, passages] = opts.draftRef
    ? await Promise.all([
        govhub.fetchDraftProposalsFresh(opts.draftRef),
        govhub.fetchChapterPassages(opts.draftRef).catch(() => [] as string[]),
      ])
    : [[], [] as string[]];

  const bookPageIds = canopiBookPageIdsForDp(opts.dpId);
  const canopi = bookPageIds.length
    ? await searchCanopiPosts({
        pageIds: bookPageIds,
        communityIds: DP_BOOK_COMMUNITY_IDS,
        limit: 200,
        maxContentLength: 4000,
      })
    : { ok: true as const, posts: [] };

  const skipped = await skippedCanopiPostIds();
  const canopiPatches = (canopi.ok ? canopi.posts : []).filter((post) => {
    if (post.parentId || skipped.has(post.id)) return false;
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
    const applicability = String(proposal.applicability || 'applies').toLowerCase();
    const anchored = applicability === 'applies';
    items.push({
      key: `govhub:${proposal.id}`,
      sources,
      govhubProposalId: proposal.id,
      canopiMessageId: matchedCanopi?.id || ext || null,
      patchMode: patchModeOf(proposal.patch_mode),
      insertPosition: govhubInsertPosition(proposal.patch_mode) ?? encodedInsertOf(proposal)?.position ?? null,
      insertText: encodedInsertOf(proposal)?.text ?? null,
      edits: (proposal.edits || []).map((e) => ({
        rule: e.rule || null,
        originalText: e.original_text,
        proposedText: e.proposed_text,
        note: e.note ?? null,
      })),
      originalText: proposal.original_text || matchedCanopi?.anchorExact || '',
      section: null,
      proposedText: proposal.proposed_text || '',
      rationale: proposal.rationale || matchedCanopi?.rationale || null,
      authorName: proposal.author_name || matchedCanopi?.authorName || 'Someone',
      authorGovhubUserId: proposal.author_user_id || null,
      createdAt: proposal.created_at || matchedCanopi?.createdAt || '',
      status: proposal.status || 'pending',
      anchorHash: proposal.anchor_hash || null,
      conflictSetId: '',
      conflictCount: 1,
      hrefs: {
        book: channel === 'canopi' && ext
          ? bookDiscussPostHref({ messageId: ext, dpId: opts.dpId, pageId: matchedCanopi?.pageId, communityId: matchedCanopi?.communityId })
          : opts.dpId
            ? bookDiscussHref({ dpId: opts.dpId })
            : null,
        govhub: draftHref,
      },
      evals: { yes: 0, no: 0, mine: null, comments: [] },
      approvals: (proposal.approvals || []).map((a) => ({
        userId: a.user_id,
        userName: a.user_name || 'A co-editor',
        note: a.note || null,
        createdAt: a.created_at || null,
      })),
      revisedBy: proposal.revised_from_id ? proposal.revised_by_name || 'A co-editor' : null,
      decision: pending ? null : { by: proposal.reviewed_by_name || null, note: proposal.review_note || null },
      styleCheckable: false,
      styleCheck: null,
      anchorEval: null,
      canPromote: pending && anchored,
      promoteBlockReason: !pending
        ? `Already ${proposal.status}. Only pending Gov Hub proposals can be promoted into the next revision draft.`
        : anchored
          ? null
          : applicability === 'obsolete'
            ? 'Obsolete: the passage this patch targets is gone from the current text. Drop it, or ask the author to re-propose against the current revision.'
            : `Needs re-anchoring: written against ${proposal.created_on_revision_label || 'an older revision'} and the passage has changed since, so Promote would fail. Ask the author to re-propose on the current text, or Drop it.`,
    });
  }

  const { rows: filing, generatedAt: filedAt } = await loadCanopiFilingReportWithTime();
  const lastRun = filedAt
    ? `The filer last ran ${new Date(filedAt).toISOString().slice(0, 16).replace('T', ' ')} UTC.`
    : 'The filer has not reported yet.';
  const thisDp = opts.dpId ? `DP${String(opts.dpId).replace(/^DP/i, '')}` : null;
  for (const post of canopiPatches) {
    if (usedCanopiIds.has(post.id)) continue;
    const filed = filing.get(post.id);
    const filedElsewhere =
      filed && (filed.status === 'filed' || filed.status === 'already_filed') && filed.home_dp && filed.home_dp !== thisDp;
    const parsed = classifyDiscussPost({ body: post.content, tagType: post.tagType });
    items.push({
      key: `canopi:${post.id}`,
      sources: ['canopi'],
      govhubProposalId: null,
      canopiMessageId: post.id,
      patchMode: parsed.kind === 'insert' ? 'insert' : 'replace',
      insertPosition: parsed.kind === 'insert' ? post.insertPosition || 'above' : null,
      insertText: null,
      edits: [],
      originalText: post.anchorExact || '',
      section: null,
      proposedText: parsed.content,
      rationale: post.rationale,
      authorName: post.authorName || 'Someone',
      authorGovhubUserId: null,
      createdAt: post.createdAt || '',
      status: filedElsewhere ? 'filed_elsewhere' : 'canopi_only',
      anchorHash: null,
      conflictSetId: '',
      conflictCount: 1,
      hrefs: {
        book: bookDiscussPostHref({ messageId: post.id, dpId: opts.dpId, pageId: post.pageId, communityId: post.communityId }),
        govhub: draftHref,
      },
      evals: { yes: 0, no: 0, mine: null, comments: [] },
      approvals: [],
      revisedBy: null,
      decision: null,
      styleCheckable: false,
      styleCheck: null,
      anchorEval: null,
      canPromote: false,
      promoteBlockReason: filedElsewhere
        ? `Posted on this chapter's page, but the passage it targets is in ${filed!.home_dp}. It was filed there (${filed!.draft_ref}); review it on the ${filed!.home_dp} Review tab.`
        : filed?.status === 'blocked' || filed?.status === 'error'
          ? `Not filed to Gov Hub automatically: ${filed.reason || filed.status}.`
          : `Not filed to Gov Hub yet, so it cannot be approved here. ${lastRun}`,
    });
  }

  for (const item of items) {
    if (item.originalText && item.patchMode !== 'bundle' && item.patchMode !== 'dedup') {
      item.section = sectionLabelFor(passages, item.originalText);
    }
  }

  const evals = await listReviewEvals(opts.workgroupId);
  for (const item of items) {
    item.evals = evalsForItem(evals, item.key, opts.viewerUserId);
  }

  await attachStyleChecks(items, opts.dpId);
  await attachAnchorEvals(items).catch(() => undefined);

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

/** Style-check input for a queue item, or null when it is not a checkable patch/insert. */
export function styleCheckInputForItem(item: ReviewQueueItem, dpId: string | null): StyleCheckInput | null {
  const open = ['pending', 'canopi_only'].includes(String(item.status).toLowerCase());
  if (!open || item.patchMode === 'bundle' || item.patchMode === 'dedup' || !item.proposedText.trim()) return null;
  return {
    source: 'review',
    dpId,
    mode: item.patchMode === 'insert' ? 'insert' : 'replace',
    originalText: item.originalText,
    proposedText: item.proposedText,
    rationale: item.rationale,
    itemKey: item.key,
  };
}

async function attachStyleChecks(items: ReviewQueueItem[], dpId: string | null): Promise<void> {
  const model = currentStyleCheckModel();
  const hashes = new Map<string, string>();
  for (const item of items) {
    const input = styleCheckInputForItem(item, dpId);
    item.styleCheckable = Boolean(input && model);
    if (input && model) hashes.set(item.key, styleCheckInputHash(input, model));
  }
  if (!hashes.size) return;
  let cached: Awaited<ReturnType<typeof cachedStyleChecks>>;
  try {
    cached = await cachedStyleChecks([...new Set(hashes.values())]);
  } catch {
    return;
  }
  for (const item of items) {
    const hit = cached.get(hashes.get(item.key) || '');
    if (hit?.result) {
      item.styleCheck = {
        id: hit.id,
        createdAt: hit.createdAt,
        model: hit.model,
        helpful: hit.helpful,
        ...hit.result,
      };
    }
  }
}

export function proposalFingerprint(proposal: GovHubDraftProposal): string {
  return `${proposal.source_channel || ''}:${proposal.external_id || proposal.id}`;
}
