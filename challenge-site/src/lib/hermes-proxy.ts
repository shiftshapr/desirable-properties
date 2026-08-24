import { resolveHermesChatSecret } from '@/lib/hermes-chat-secret.server';

export function hermesUpstreamHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const secret = resolveHermesChatSecret();
  if (secret) headers['X-Hermes-Chat-Secret'] = secret;
  return headers;
}
