import { MSG_CODE_REQUIRED, normalizeCode } from '@/lib/phone-optin/phone-core';
import { phoneBadRequest, proxyGovHubPhone, readPhoneMutation } from '@/lib/phone-optin/phone-proxy.server';

/** POST { code }: Gov Hub checks the code and stores the confirmed number. */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { body, error } = await readPhoneMutation(request);
  if (error) return error;
  const code = normalizeCode(body.code);
  if (!code) return phoneBadRequest(MSG_CODE_REQUIRED);
  return proxyGovHubPhone('/confirm', 'POST', { code });
}
