import type { ActivityFeedItem } from '@/lib/activity-feed-types';

const RESOLVED_EVENT_TYPES = new Set([
  'dp_proposal_accepted',
  'dp_proposal_declined',
  'draft_revision_approved',
  'draft_published_as_rfc',
]);

const COMMENT_PATCH_EVENT_TYPES = new Set([
  'dp_proposal_submitted',
  'dp_proposal_accepted',
  'dp_proposal_declined',
  'draft_comment_added',
  'workgroup_message_posted',
]);

export function isActivityResolved(item: ActivityFeedItem): boolean {
  if (item.resolved === true) return true;
  if (item.kind === 'govhub_proposal') {
    const status = String(item.status || '').toLowerCase();
    return status !== 'pending' && status !== '';
  }
  if (item.status && RESOLVED_EVENT_TYPES.has(item.status)) return true;
  return false;
}

/** Comments & patches filter (client-safe). */
export function isActivityCommentOrPatch(item: ActivityFeedItem): boolean {
  if (
    item.kind === 'canopi'
    || item.kind === 'canopi_patch'
    || item.kind === 'canopi_insert'
    || item.kind === 'govhub_proposal'
    || item.kind === 'workgroup_message'
    || item.kind === 'member_edit'
    || item.kind === 'member_edit_revoked'
    || item.kind === 'astra_revoke'
    || item.kind === 'astra_restore'
  ) {
    return true;
  }
  if (item.status && COMMENT_PATCH_EVENT_TYPES.has(item.status)) return true;
  return false;
}
