import type { HermesSession } from '@/lib/auth-session';
import {
  createCommunityChatMessage,
  listCommunityChatMessages,
  type CommunityChatMessage,
} from '@/lib/community-chat-store';
import { fetchCommunityThreadAccessServer } from '@/lib/community-thread-access.server';
import { normalizeHermesThreadId } from '@/lib/hermes-community-collab';

export type CommunityMessagesPayload = {
  messages: CommunityChatMessage[];
  is_member: boolean;
  can_post: boolean;
  can_prompt: boolean;
  configured: boolean;
};

export async function fetchCommunityMessagesServer(
  rawThreadId: string,
  opts: { session: HermesSession | null; full?: boolean },
): Promise<CommunityMessagesPayload> {
  const threadId = normalizeHermesThreadId(rawThreadId);
  if (!threadId || !opts.session) {
    return {
      messages: [],
      is_member: false,
      can_post: false,
      can_prompt: false,
      configured: false,
    };
  }

  const access = await fetchCommunityThreadAccessServer(threadId, opts.session);
  if (!access?.canRead) {
    return {
      messages: [],
      is_member: false,
      can_post: false,
      can_prompt: false,
      configured: true,
    };
  }

  const messages = await listCommunityChatMessages(threadId);
  const isMember = access.isOwner || access.roles.includes('member') || access.canPrompt;

  return {
    messages: opts.full ? messages : messages.slice(-20),
    is_member: isMember,
    can_post: access.canPost,
    can_prompt: access.canPrompt,
    configured: true,
  };
}

export async function postCommunityMessageServer(
  rawThreadId: string,
  body: string,
  session: HermesSession,
): Promise<{ message: CommunityChatMessage } | { error: string; status: number }> {
  const threadId = normalizeHermesThreadId(rawThreadId);
  const trimmed = body.trim();
  if (!threadId) {
    return { error: 'thread id required', status: 400 };
  }
  if (!trimmed) {
    return { error: 'Message body required', status: 400 };
  }

  const access = await fetchCommunityThreadAccessServer(threadId, session);
  if (!access?.canRead) {
    return { error: 'Access denied', status: 403 };
  }
  if (!access.canPost) {
    return { error: 'Member invite required to post', status: 403 };
  }

  const authorName = session.displayName?.trim()
    || session.username?.trim()
    || session.email?.trim()
    || 'Member';

  const message = await createCommunityChatMessage({
    communityThreadId: threadId,
    authorUserId: session.userId,
    authorName,
    body: trimmed,
    source: 'human',
  });

  return { message };
}
