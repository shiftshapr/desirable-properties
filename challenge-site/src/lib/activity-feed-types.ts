export type ActivityFeedKind =
  | 'govhub'
  | 'workgroup_message'
  | 'workgroup_invite'
  | 'workgroup_member'
  | 'canopi'
  | 'canopi_patch'
  | 'canopi_insert'
  | 'govhub_proposal'
  | 'member_edit'
  | 'member_edit_revoked'
  | 'astra_revoke'
  | 'astra_restore'
  | 'download';

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
  badge?: string | null;
  resolved?: boolean;
  status?: string | null;
  diff?: ActivityDiff | null;
  source?: 'govhub' | 'canopi';
};
