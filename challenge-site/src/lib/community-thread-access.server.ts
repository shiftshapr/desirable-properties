import type { HermesSession } from '@/lib/auth-session';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';
import { normalizeHermesThreadId } from '@/lib/hermes-community-collab';

export type CommunityThreadAccess = {
  roles: string[];
  canPrompt: boolean;
  isOwner: boolean;
  canRead: boolean;
  canPost: boolean;
};

export async function fetchCommunityThreadAccessServer(
  rawThreadId: string,
  session: HermesSession,
): Promise<CommunityThreadAccess | null> {
  const threadId = normalizeHermesThreadId(rawThreadId);
  if (!threadId) return null;

  const upstream = await fetch(
    `${getHermesChatUrl()}/api/hermes/threads/${encodeURIComponent(threadId)}/access?verifierId=${encodeURIComponent(session.verifierId)}`,
    { headers: hermesUpstreamHeaders(), signal: AbortSignal.timeout(15000) },
  );
  if (!upstream.ok) return null;

  const data = await upstream.json().catch(() => ({})) as {
    access?: {
      roles?: string[];
      canPrompt?: boolean;
      isOwner?: boolean;
    };
    roles?: string[];
    canPrompt?: boolean;
    isOwner?: boolean;
  };
  const accessPayload = data.access ?? data;
  const roles = Array.isArray(accessPayload.roles) ? accessPayload.roles : [];
  const isOwner = Boolean(accessPayload.isOwner) || roles.includes('owner');
  const canPrompt = Boolean(accessPayload.canPrompt);
  const canRead = isOwner || roles.length > 0;
  const canPost = isOwner || canPrompt;

  return {
    roles,
    canPrompt,
    isOwner,
    canRead,
    canPost,
  };
}
