import type { WorkgroupMessage } from '@/lib/workgroup-collab-types';

/** Human chat row for Community Chat (same shape as workgroup messages). */
export type CommunityChatMessage = {
  id: string;
  community_thread_id: string;
  author_user_id: string;
  author_name: string;
  body: string;
  source: 'human' | 'deepi_shared';
  created_at: string;
};

export type CommunityMessagesPayload = {
  messages: CommunityChatMessage[];
  is_member: boolean;
  can_post: boolean;
  can_prompt: boolean;
  configured: boolean;
};

export function communityMessageAsWorkgroup(msg: CommunityChatMessage): WorkgroupMessage {
  return {
    id: msg.id,
    workgroup_id: msg.community_thread_id,
    author_user_id: msg.author_user_id,
    author_name: msg.author_name,
    body: msg.body,
    created_at: msg.created_at,
  };
}
