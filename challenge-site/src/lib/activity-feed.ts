import { maskActivityFeedItems } from '@/lib/public-payload';
import { publicDisplayName } from '@/lib/public-display-name';
import { canopiPageIdsForDp } from '@/lib/dp-canopi-chapters';
import { classifyDiscussPost, discussPatchActivityText } from '@/lib/discuss-patch';
import { searchCanopiPosts } from '@/lib/dp-canopi-search';
import {
  eventMatchesWorkgroup,
  fetchDraftProposals,
  fetchLayerActivityEvents,
  bookDiscussHref,
  fetchChallengeActivity,
  formatActivityEventPublic,
  govhubUrl,
  type GovHubDraftProposal,
  type LayerActivityEvent,
} from '@/lib/govhub';
import { workgroupActivityHref } from '@/lib/workgroup-links';

export type ActivityFeedKind =
  | 'govhub'
  | 'workgroup_message'
  | 'workgroup_invite'
  | 'workgroup_member'
  | 'canopi'
  | 'canopi_patch'
  | 'canopi_insert'
  | 'govhub_proposal';

export type ActivityDiff = {
  removed?: string | null;
  added?: string | null;
  mode?: 'replace' | 'insert' | 'patch' | 'comment';
};

export type ActivityFeedItem = {
  id: string;
  createdAt: string;
  text: string;
  href: string;
  kind: ActivityFeedKind;
  /** Optional badge for discuss patch/insert (or other typed events). */
  badge?: string | null;
  /** Resolved = accepted/declined/etc. Gov Hub patches; non-pending proposals. */
  resolved?: boolean;
  status?: string | null;
  diff?: ActivityDiff | null;
  source?: 'govhub' | 'canopi';
};

const WORKGROUP_EVENT_TYPES = [
  'workgroup_message_posted',
  'workgroup_invite_sent',
  'workgroup_invite_accepted',
  'workgroup_member_joined',
  'workgroup_member_left',
];

const DRAFT_EVENT_TYPES = [
  'dp_proposal_submitted',
  'dp_proposal_accepted',
  'dp_proposal_declined',
  'draft_created',
  'draft_revision_approved',
  'draft_published_as_rfc',
  'draft_comment_added',
];

const RESOLVED_EVENT_TYPES = new Set([
  'dp_proposal_accepted',
  'dp_proposal_declined',
  'draft_revision_approved',
  'draft_published_as_rfc',
]);

function inferKind(text: string, href: string): ActivityFeedKind {
  if (href.startsWith('/workgroups/')) {
    if (text.includes('invited') || text.includes('invitation')) return 'workgroup_invite';
    if (text.includes('posted')) return 'workgroup_message';
    if (/\bjoined\b|\bleft\b/.test(text)) return 'workgroup_member';
  }
  return 'govhub';
}

function kindForWorkgroupEvent(eventType: string): ActivityFeedKind {
  if (eventType === 'workgroup_message_posted') return 'workgroup_message';
  if (
    eventType === 'workgroup_invite_sent' ||
    eventType === 'workgroup_invite_accepted'
  ) {
    return 'workgroup_invite';
  }
  if (
    eventType === 'workgroup_member_joined' ||
    eventType === 'workgroup_member_left'
  ) {
    return 'workgroup_member';
  }
  return 'govhub';
}

async function fetchCanopiDiscussItems(limit: number): Promise<ActivityFeedItem[]> {
  // Sample intro + a few early chapters only – full 23-chapter scan is too slow for SSR.
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
        ? bookDiscussHref({ pageId: p.pageId })
        : bookDiscussHref(),
      kind,
      badge: classified.badge,
      resolved: false,
      source: 'canopi' as const,
    };
  });
}

/** Merge Gov Hub layer activity (incl. WG chat/invite) + Canopi discuss posts. */
export async function fetchUnifiedActivity(limit = 24): Promise<ActivityFeedItem[]> {
  let govhub: Awaited<ReturnType<typeof fetchChallengeActivity>> = [];
  let canopi: ActivityFeedItem[] = [];
  try {
    [govhub, canopi] = await Promise.all([
      fetchChallengeActivity(limit),
      fetchCanopiDiscussItems(Math.min(12, limit)),
    ]);
  } catch {
    /* upstream timeout – render page without live activity */
  }

  const merged: ActivityFeedItem[] = [
    ...govhub.map((item) => ({
      id: item.id,
      createdAt: item.createdAt,
      text: item.text,
      href: item.href.startsWith('http') || item.href.startsWith('/')
        ? item.href
        : govhubUrl(item.href),
      kind: inferKind(item.text, item.href),
      source: 'govhub' as const,
      resolved: false,
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
  return maskActivityFeedItems(out);
}

function draftViewerHref(draftRef: string | null | undefined): string {
  const ref = String(draftRef || '').trim();
  if (!ref) return govhubUrl('/doc/all/?collection=desirable-properties');
  return govhubUrl(`/doc/draft/${encodeURIComponent(ref)}/read/`);
}

function proposalToFeedItem(
  proposal: GovHubDraftProposal,
  draftRef: string,
): ActivityFeedItem {
  const status = String(proposal.status || 'pending').toLowerCase();
  const mode = String(proposal.patch_mode || 'replace').toLowerCase() === 'insert'
    ? 'insert'
    : 'replace';
  const who = publicDisplayName(proposal.author_name, { fallback: 'Someone' });
  // Non-pending proposals count as resolved (accepted, declined, incorporated, …).
  const resolved = status !== 'pending';
  const badge = mode === 'insert' ? 'Insert' : 'Patch';
  const statusLabel =
    status === 'pending'
      ? 'pending'
      : String(proposal.status_label || status).toLowerCase();
  const text =
    mode === 'insert'
      ? `${who} proposed an insert on the draft (${statusLabel})`
      : `${who} proposed a patch on the draft (${statusLabel})`;

  return {
    id: `proposal-${proposal.id}`,
    createdAt: proposal.created_at || proposal.reviewed_at || '',
    text,
    href: draftViewerHref(draftRef),
    kind: 'govhub_proposal',
    badge,
    resolved,
    status,
    source: 'govhub',
    diff: {
      mode,
      removed: mode === 'insert' ? null : proposal.original_text || null,
      added: proposal.proposed_text || null,
    },
  };
}

function eventToWorkgroupFeedItem(
  event: LayerActivityEvent,
  workgroupSlug: string,
): ActivityFeedItem | null {
  const base = formatActivityEventPublic(event);
  if (!base) return null;
  const payload = event.payload ?? {};
  const kind = kindForWorkgroupEvent(event.event_type);
  let text = base.text;
  let diff: ActivityDiff | null = null;

  if (event.event_type === 'workgroup_message_posted') {
    const preview = String(payload.body_preview || '').trim();
    if (preview) {
      text = `${text}: ${preview.slice(0, 160)}${preview.length > 160 ? '…' : ''}`;
    }
  }

  if (event.event_type === 'draft_comment_added') {
    const preview = String(payload.preview || payload.body_preview || '').trim();
    if (preview) {
      diff = { mode: 'comment', removed: null, added: preview };
    }
  }

  const href = base.href.startsWith('http')
    ? base.href
    : base.href.startsWith('/workgroups/')
      ? base.href
      : workgroupActivityHref(workgroupSlug);

  return {
    id: `gh-event-${event.id}`,
    createdAt: base.createdAt,
    text,
    href,
    kind,
    badge: null,
    resolved: RESOLVED_EVENT_TYPES.has(event.event_type),
    status: event.event_type,
    source: 'govhub',
    diff,
  };
}

async function fetchCanopiItemsForDp(
  dpId: string | null,
  limit: number,
): Promise<ActivityFeedItem[]> {
  const pageIds = canopiPageIdsForDp(dpId);
  if (!pageIds.length) return [];

  const result = await searchCanopiPosts({
    pageIds,
    limit,
    maxContentLength: 1200,
  });
  if (!result.ok) return [];

  return result.posts.map((p) => {
    const parsed = classifyDiscussPost({ body: p.content, tagType: p.tagType });
    const classified = discussPatchActivityText({
      authorName: p.authorName,
      pageId: p.pageId,
      body: p.content,
      tagType: p.tagType,
    });
    const kind: ActivityFeedKind =
      classified.kind === 'patch'
        ? 'canopi_patch'
        : classified.kind === 'insert'
          ? 'canopi_insert'
          : 'canopi';

    let diff: ActivityDiff | null = null;
    if (parsed.kind === 'patch') {
      diff = { mode: 'patch', removed: null, added: parsed.content || null };
    } else if (parsed.kind === 'insert') {
      diff = { mode: 'insert', removed: null, added: parsed.content || null };
    }

    return {
      id: `canopi-${p.id}`,
      createdAt: p.createdAt || '',
      text: classified.text,
      href: bookDiscussHref({ dpId, pageId: p.pageId }),
      kind,
      badge: classified.badge,
      // Canopi Discuss has no accept/decline workflow yet – patches stay open.
      resolved: false,
      status: parsed.kind,
      source: 'canopi' as const,
      diff,
    };
  });
}

export type WorkgroupDpActivityOpts = {
  workgroupId: string;
  workgroupSlug: string;
  workgroupName?: string | null;
  dpId?: string | null;
  draftRef?: string | null;
  draftLabel?: string | null;
  limit?: number;
};

/**
 * Per-DP / per-workgroup activity: Gov Hub WG events + draft proposals/events + Canopi discuss.
 *
 * Comments & patches filter (see isActivityCommentOrPatch):
 * - Canopi discuss (all + PATCH/INSERT), Gov Hub proposals, workgroup chat
 * - Excludes joins/leaves, invites, generic draft lifecycle noise
 */
export async function fetchWorkgroupDpActivity(
  opts: WorkgroupDpActivityOpts,
): Promise<ActivityFeedItem[]> {
  const limit = Math.min(80, Math.max(8, opts.limit ?? 40));
  const draftRefs = [
    opts.draftRef,
    opts.draftLabel,
  ]
    .map((r) => String(r || '').trim())
    .filter(Boolean);

  // Also accept ML-Draft-NNN tokens from document labels like "DP1 … (ML-Draft-008)".
  const label = String(opts.draftLabel || '');
  const mlMatch = label.match(/\bML-Draft-\d+\b/i);
  if (mlMatch) draftRefs.push(mlMatch[0]);

  const uniqueDraftRefs = [...new Set(draftRefs)];

  const [wgEvents, draftEvents, proposals, canopi] = await Promise.all([
    fetchLayerActivityEvents({ limit: 100, eventTypes: WORKGROUP_EVENT_TYPES }),
    fetchLayerActivityEvents({ limit: 100, eventTypes: DRAFT_EVENT_TYPES }),
    uniqueDraftRefs[0] ? fetchDraftProposals(uniqueDraftRefs[0]) : Promise.resolve([]),
    fetchCanopiItemsForDp(opts.dpId || null, Math.min(30, limit)),
  ]);

  const matchOpts = {
    workgroupId: opts.workgroupId,
    workgroupSlug: opts.workgroupSlug,
    draftRefs: uniqueDraftRefs,
  };

  const items: ActivityFeedItem[] = [];

  for (const event of wgEvents) {
    if (!eventMatchesWorkgroup(event, matchOpts)) continue;
    const item = eventToWorkgroupFeedItem(event, opts.workgroupSlug);
    if (item) items.push(item);
  }

  for (const event of draftEvents) {
    if (!eventMatchesWorkgroup(event, matchOpts)) continue;
    // Prefer rich proposal rows when we already have them.
    if (
      (event.event_type === 'dp_proposal_submitted' ||
        event.event_type === 'dp_proposal_accepted' ||
        event.event_type === 'dp_proposal_declined') &&
      proposals.length
    ) {
      continue;
    }
    const item = eventToWorkgroupFeedItem(event, opts.workgroupSlug);
    if (item) {
      item.href = draftViewerHref(uniqueDraftRefs[0] || null);
      items.push(item);
    }
  }

  const primaryDraft = uniqueDraftRefs[0] || '';
  for (const proposal of proposals) {
    items.push(proposalToFeedItem(proposal, primaryDraft));
  }

  items.push(...canopi);

  items.sort((a, b) => Date.parse(b.createdAt || '0') - Date.parse(a.createdAt || '0'));

  const seen = new Set<string>();
  const out: ActivityFeedItem[] = [];
  for (const item of items) {
    if (!item.id || seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
    if (out.length >= limit) break;
  }
  return maskActivityFeedItems(out);
}

export function isActivityResolved(item: ActivityFeedItem): boolean {
  if (item.resolved === true) return true;
  if (item.kind === 'govhub_proposal') {
    const status = String(item.status || '').toLowerCase();
    return status !== 'pending' && status !== '';
  }
  if (item.status && RESOLVED_EVENT_TYPES.has(item.status)) return true;
  return false;
}

/** Draft / discuss comment & patch kinds for the Comments & patches filter. */
const COMMENT_PATCH_EVENT_TYPES = new Set([
  'dp_proposal_submitted',
  'dp_proposal_accepted',
  'dp_proposal_declined',
  'draft_comment_added',
  'workgroup_message_posted',
]);

/**
 * Comments & patches filter:
 * - Canopi discuss (comments + PATCH/INSERT)
 * - Gov Hub draft proposals / patch items
 * - Workgroup chat messages
 * Excludes: joins/leaves, invites, generic draft lifecycle noise (created/approved/published).
 */
export function isActivityCommentOrPatch(item: ActivityFeedItem): boolean {
  if (
    item.kind === 'canopi'
    || item.kind === 'canopi_patch'
    || item.kind === 'canopi_insert'
    || item.kind === 'govhub_proposal'
    || item.kind === 'workgroup_message'
  ) {
    return true;
  }
  if (item.status && COMMENT_PATCH_EVENT_TYPES.has(item.status)) return true;
  return false;
}
