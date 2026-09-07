import type { ActivityDiff, ActivityFeedItem } from '@/lib/activity-feed-types';
import { ensureDpSchema, isDpDatabaseConfigured } from '@/lib/dp-db';
import { dpIdToAstraKey } from '@/lib/astra-utils';
import { fetchWorkgroupActivityEvents } from '@/lib/workgroup-activity-event-store';
import { workgroupActivityHref } from '@/lib/workgroup-links';
import { editSummaryText, isLegacyFullChapterEdit, type WorkgroupChapterEdit } from '@/lib/workgroup-chapter-edit-types';

function dpKeyFromChangeId(changeId: string): string | null {
  const match = String(changeId || '').trim().match(/^(dp\d{2})-/i);
  return match ? match[1]!.toLowerCase() : null;
}

function editTabHref(workgroupSlug: string, anchor?: string): string {
  const base = `${workgroupActivityHref(workgroupSlug)}?tab=edit`;
  return anchor ? `${base}${anchor}` : base;
}

function chapterEditToItems(
  row: {
    id: string;
    dp_key: string;
    author_name: string;
    rationale: string | null;
    status: string;
    base_markdown: string | null;
    revoked_at: Date | null;
    created_at: Date;
    markdown: string | null;
    patch_mode: string | null;
    original_text: string | null;
    proposed_text: string | null;
  },
  baseMarkdown: string,
  workgroupSlug: string,
): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = [];
  const dpLabel = row.dp_key.toUpperCase();
  const editHref = editTabHref(workgroupSlug, '#read-chapter');
  const compareBase = row.base_markdown || baseMarkdown;
  const editLike: WorkgroupChapterEdit = {
    id: row.id,
    workgroupId: '',
    dpKey: row.dp_key,
    astraReleaseId: '',
    markdown: row.markdown,
    baseMarkdown: row.base_markdown,
    patchMode: row.patch_mode === 'insert' ? 'insert' : row.patch_mode === 'replace' ? 'replace' : null,
    originalText: row.original_text,
    proposedText: row.proposed_text,
    anchorHash: null,
    rationale: row.rationale,
    authorUserId: '',
    authorName: row.author_name,
    status: row.status as WorkgroupChapterEdit['status'],
    reviewedBy: null,
    reviewedAt: null,
    revokedBy: null,
    revokedAt: null,
    createdAt: new Date(row.created_at).toISOString(),
  };
  const patchLabel = editLike.patchMode === 'insert' ? 'passage insert' : editLike.patchMode === 'replace' ? 'patch' : 'chapter edit';
  const diff: ActivityDiff | null = row.rationale
    ? { mode: 'comment', removed: null, added: row.rationale }
    : isLegacyFullChapterEdit(editLike) && editLike.markdown
      ? {
          mode: 'patch',
          removed: null,
          added: editSummaryText(editLike, compareBase),
        }
      : editLike.originalText && editLike.proposedText
        ? {
            mode: editLike.patchMode === 'insert' ? 'insert' : 'patch',
            removed: editLike.originalText.slice(0, 120),
            added: editLike.proposedText.slice(0, 120),
          }
        : {
            mode: 'patch',
            removed: null,
            added: editSummaryText(editLike, compareBase),
          };

  if (row.status === 'pending') {
    items.push({
      id: `member-edit-pending-${row.id}`,
      createdAt: new Date(row.created_at).toISOString(),
      text: `${row.author_name} suggested a ${patchLabel} on ${dpLabel} (awaiting coordinator approval)`,
      href: editTabHref(workgroupSlug, '#pending-suggestions'),
      kind: 'member_edit_pending',
      badge: 'Pending',
      resolved: false,
      status: 'pending',
      source: 'govhub',
      diff,
    });
    return items;
  }

  if (row.status === 'rejected') {
    items.push({
      id: `member-edit-rejected-${row.id}`,
      createdAt: new Date(row.created_at).toISOString(),
      text: `${row.author_name}'s chapter edit on ${dpLabel} was rejected`,
      href: editTabHref(workgroupSlug, '#propose-edit'),
      kind: 'member_edit_rejected',
      badge: 'Rejected',
      resolved: true,
      status: 'rejected',
      source: 'govhub',
      diff,
    });
    return items;
  }

  items.push({
    id: `member-edit-${row.id}`,
    createdAt: new Date(row.created_at).toISOString(),
    text:
      row.status === 'active'
        ? `${row.author_name}'s chapter edit on ${dpLabel} is approved and live`
        : `${row.author_name} proposed a chapter edit on ${dpLabel}`,
    href: editHref,
    kind: 'member_edit',
    badge: row.status === 'active' ? 'Approved' : 'Edit',
    resolved: row.status !== 'pending',
    status: row.status,
    source: 'govhub',
    diff,
  });

  if (row.status === 'revoked' && row.revoked_at) {
    items.push({
      id: `member-edit-revoked-${row.id}`,
      createdAt: new Date(row.revoked_at).toISOString(),
      text: `Member chapter edit by ${row.author_name} on ${dpLabel} was revoked`,
      href: editTabHref(workgroupSlug, '#propose-edit'),
      kind: 'member_edit_revoked',
      badge: 'Revoked',
      resolved: true,
      status: 'revoked',
      source: 'govhub',
    });
  }

  return items;
}

function revocationToItem(
  row: { change_id: string; revoked_by: string; revoked_at: Date },
  workgroupSlug: string,
): ActivityFeedItem {
  const dpKey = dpKeyFromChangeId(row.change_id);
  const dpLabel = dpKey ? dpKey.toUpperCase() : 'chapter';
  return {
    id: `astra-revoke-${row.change_id}`,
    createdAt: new Date(row.revoked_at).toISOString(),
    text: `Astra patch ${row.change_id} on ${dpLabel} was revoked`,
    href: editTabHref(workgroupSlug, '#astra-patches'),
    kind: 'astra_revoke',
    badge: 'Revoked',
    resolved: true,
    status: 'revoked',
    source: 'govhub',
    diff: {
      mode: 'comment',
      removed: null,
      added: `Revoked by coordinator (${row.revoked_by.slice(0, 8)}…)`,
    },
  };
}

function loggedEventToItem(
  event: Awaited<ReturnType<typeof fetchWorkgroupActivityEvents>>[number],
  workgroupSlug: string,
): ActivityFeedItem | null {
  const detail = event.detail || {};
  const href =
    typeof detail.href === 'string' && detail.href
      ? detail.href
      : event.eventType === 'download'
        ? String(detail.resourceHref || '#')
        : editTabHref(workgroupSlug);

  let kind: ActivityFeedItem['kind'] = 'govhub';
  let badge: string | null = null;

  switch (event.eventType) {
    case 'member_chapter_edit':
    case 'member_chapter_edit_submitted':
      kind = 'member_edit_pending';
      badge = 'Pending';
      break;
    case 'member_chapter_edit_approved':
      kind = 'member_edit';
      badge = 'Approved';
      break;
    case 'member_chapter_edit_rejected':
      kind = 'member_edit_rejected';
      badge = 'Rejected';
      break;
    case 'member_chapter_edit_revoked':
      kind = 'member_edit_revoked';
      badge = 'Revoked';
      break;
    case 'member_chapter_edit_restored':
      kind = 'member_edit';
      badge = 'Restored';
      break;
    case 'astra_patch_revoked':
      kind = 'astra_revoke';
      badge = 'Revoked';
      break;
    case 'astra_patch_restored':
      kind = 'astra_restore';
      badge = 'Restored';
      break;
    case 'download':
      kind = 'download';
      badge = 'Download';
      break;
    default:
      break;
  }

  const diff: ActivityDiff | null =
    typeof detail.rationale === 'string' && detail.rationale
      ? { mode: 'comment', removed: null, added: detail.rationale }
      : null;

  return {
    id: `local-event-${event.id}`,
    createdAt: event.createdAt,
    text: event.summary,
    href,
    kind,
    badge,
    resolved: event.eventType.includes('revoked'),
    status: event.eventType,
    source: 'govhub',
    diff,
  };
}

export async function fetchLocalWorkgroupActivity(opts: {
  workgroupId: string;
  workgroupSlug: string;
  dpId?: string | null;
  baseMarkdownByDpKey?: Record<string, string>;
  limit?: number;
}): Promise<ActivityFeedItem[]> {
  if (!isDpDatabaseConfigured()) return [];

  const pool = await ensureDpSchema();
  if (!pool) return [];

  const wgId = String(opts.workgroupId || '').trim();
  const dpKeyFilter = opts.dpId ? dpIdToAstraKey(opts.dpId) : null;
  const limit = Math.min(40, Math.max(5, opts.limit ?? 25));
  const items: ActivityFeedItem[] = [];

  const editQuery = dpKeyFilter
    ? `SELECT id, dp_key, author_name, rationale, status, base_markdown, revoked_at, created_at,
              markdown, patch_mode, original_text, proposed_text
       FROM workgroup_chapter_edit
       WHERE workgroup_id = $1 AND dp_key = $2
       ORDER BY created_at DESC
       LIMIT $3`
    : `SELECT id, dp_key, author_name, rationale, status, base_markdown, revoked_at, created_at,
              markdown, patch_mode, original_text, proposed_text
       FROM workgroup_chapter_edit
       WHERE workgroup_id = $1
       ORDER BY created_at DESC
       LIMIT $2`;

  const editParams = dpKeyFilter ? [wgId, dpKeyFilter, limit] : [wgId, limit];
  const editRes = await pool.query<{
    id: string;
    dp_key: string;
    author_name: string;
    rationale: string | null;
    status: string;
    base_markdown: string | null;
    revoked_at: Date | null;
    created_at: Date;
    markdown: string | null;
    patch_mode: string | null;
    original_text: string | null;
    proposed_text: string | null;
  }>(editQuery, editParams);

  for (const row of editRes.rows) {
    const baseMarkdown = opts.baseMarkdownByDpKey?.[row.dp_key] || '';
    items.push(...chapterEditToItems(row, baseMarkdown, opts.workgroupSlug));
  }

  const revokeRes = await pool.query<{
    change_id: string;
    revoked_by: string;
    revoked_at: Date;
  }>(
    `SELECT change_id, revoked_by, revoked_at
     FROM astra_change_revocation
     WHERE workgroup_id = $1
     ORDER BY revoked_at DESC
     LIMIT $2`,
    [wgId, limit],
  );

  for (const row of revokeRes.rows) {
    if (dpKeyFilter) {
      const changeDp = dpKeyFromChangeId(row.change_id);
      if (changeDp && changeDp !== dpKeyFilter) continue;
    }
    items.push(revocationToItem(row, opts.workgroupSlug));
  }

  const logged = await fetchWorkgroupActivityEvents(wgId, { dpKey: dpKeyFilter, limit });
  for (const event of logged) {
    const item = loggedEventToItem(event, opts.workgroupSlug);
    if (item) items.push(item);
  }

  return items;
}
