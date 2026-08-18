import { isSharedHermesWorkgroupMessage } from '@/lib/workgroup-hermes-share';
import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';

/** Approved positions that may share any visible workgroup chat message. */
export const WORKGROUP_SHARE_FACILITATOR_POSITIONS = new Set([
  'chair',
  'co_lead',
  'facilitator',
]);

export type WorkgroupShareRole = 'watcher' | 'controller';

export type WorkgroupShareRestrictions = {
  canInitiateShare: boolean;
  canShareMessage: boolean;
  canGrantControl: boolean;
  defaultRole: WorkgroupShareRole;
  allowPublicLink: false;
  anchorMode: 'from_share_point';
};

export function isWorkgroupShareFacilitator(positions: string[]): boolean {
  return positions.some((p) => WORKGROUP_SHARE_FACILITATOR_POSITIONS.has(p));
}

export function canMemberShareMessage(
  message: Pick<WorkgroupMessage, 'author_user_id' | 'body'>,
  sharerUserId: string,
  positions: string[],
): boolean {
  if (isWorkgroupShareFacilitator(positions)) return true;
  if (message.author_user_id === sharerUserId) return true;
  return isSharedHermesWorkgroupMessage(message.body);
}

export function canGrantWorkgroupShareControl(
  message: Pick<WorkgroupMessage, 'author_user_id'>,
  sharerUserId: string,
  positions: string[],
): boolean {
  if (isWorkgroupShareFacilitator(positions)) return true;
  return message.author_user_id === sharerUserId;
}

export function resolveWorkgroupShareRestrictions(
  opts: {
    isMember: boolean;
    message: Pick<WorkgroupMessage, 'author_user_id' | 'body'>;
    sharerUserId: string;
    positions: string[];
  },
): WorkgroupShareRestrictions {
  const canShareMessage = opts.isMember
    && canMemberShareMessage(opts.message, opts.sharerUserId, opts.positions);
  const canGrantControl = canGrantWorkgroupShareControl(
    opts.message,
    opts.sharerUserId,
    opts.positions,
  );

  return {
    canInitiateShare: opts.isMember,
    canShareMessage,
    canGrantControl,
    defaultRole: 'watcher',
    allowPublicLink: false,
    anchorMode: 'from_share_point',
  };
}
