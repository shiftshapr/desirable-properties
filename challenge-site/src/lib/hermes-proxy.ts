import { getHermesChatSecret } from '@/lib/web3auth-config';

export function hermesUpstreamHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const secret = getHermesChatSecret();
  if (secret) headers['X-Hermes-Chat-Secret'] = secret;
  return headers;
}
