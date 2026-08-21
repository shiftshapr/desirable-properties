import type { WorkgroupRosterMember } from '@/lib/workgroup-collab-api';

export type WorkgroupShareRecipient = {
  member: WorkgroupRosterMember | null;
  queryHint: string;
};

export function recipientTokenFromWorkgroupShare(recipient: WorkgroupShareRecipient): string {
  if (recipient.member) return recipient.member.user_id;
  return recipient.queryHint.trim();
}

export function recipientLabelFromWorkgroupShare(recipient: WorkgroupShareRecipient): string {
  if (recipient.member) return recipient.member.user_name;
  return recipient.queryHint.trim();
}
