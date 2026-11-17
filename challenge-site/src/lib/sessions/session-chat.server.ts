import 'server-only';
import { readSession } from '@/lib/auth-session';
import {
  createCommunityChatMessage,
  listLatestCommunityChatMessages,
  updateCommunityChatMessage,
} from '@/lib/community-chat-store';
import { allowHit } from '@/lib/listening/rate-limit.server';
import type { SessionChatDeps } from '@/lib/sessions/session-chat-core';

/**
 * Real dependencies for the session chat handlers (session-chat-core.ts): the site's session cookie and the
 * Community Chat message table. The in-memory rate limiter is the listening workspace's plain helper; it has no
 * dependency on the DP_LISTENING_WORKSPACE flag.
 */
export const sessionChatDeps: SessionChatDeps = {
  readSession,
  list: (threadKey, limit) => listLatestCommunityChatMessages(threadKey, limit),
  create: ({ threadKey, authorUserId, authorName, body }) =>
    createCommunityChatMessage({ communityThreadId: threadKey, authorUserId, authorName, body, source: 'human' }),
  update: ({ threadKey, messageId, authorUserId, body }) =>
    updateCommunityChatMessage({ messageId, communityThreadId: threadKey, authorUserId, body }),
  allowHit: (key, max, windowMs) => allowHit(key, max, windowMs),
};
