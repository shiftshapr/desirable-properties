import type { ActivityDiff, ActivityFeedItem } from '@/lib/activity-feed-types';
import { ensureDpSchema, isDpDatabaseConfigured } from '@/lib/dp-db';
import { dpIdToAstraKey } from '@/lib/astra-utils';
import { fetchWorkgroupActivityEvents } from '@/lib/workgroup-activity-event-store';
import { workgroupActivityHref } from '@/lib/workgroup-links';
import { summarizeMarkdownEdit } from '@/lib/workgroup-chapter-edit-types';

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
    revoked_at: Date | null;
    created_at: Date;
    markdown: string;
  },
  baseMarkdown: string,
  workgroupSlug: string,
): ActivityFeedItem[] {
  const items: ActivityFeedItem[] = [];
  const dpLabel = row.dp_key.toUpperCase();
  const editHref = editTabHref(workgroupSlug, '#read-chapter');

  items.push({
    id: `member-edit-${row.id}`,
    createdAt: new Date(row.created_at).toISOString(),
    text: `${row.author_name} proposed a chapter edit on ${dpLabel}`,
    href: editHref,
    kind: 'member_edit',
    badge: 'Edit',
    resolved: row.status === 'revoked',
    status: row.status,
    source: 'govhub',
    diff: row.rationale
      ? { mode: 'comment', removed: null, added: row.rationale }
      : {
          mode: 'patch',
          removed: null,
          added: summarizeMarkdownEdit(baseMarkdown, row.markdown),
        },
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
      kind = 'member_edit';
      badge = 'Edit';
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
    ? `SELECT id, dp_key, author_name, rationale, status, revoked_at, created_at, markdown
       FROM workgroup_chapter_edit
       WHERE workgroup_id = $1 AND dp_key = $2
       ORDER BY created_at DESC
       LIMIT $3`
    : `SELECT id, dp_key, author_name, rationale, status, revoked_at, created_at, markdown
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
    revoked_at: Date | null;
    created_at: Date;
    markdown: string;
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
