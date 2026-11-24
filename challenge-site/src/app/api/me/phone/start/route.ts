import {
  MSG_PHONE_REQUIRED,
  choicesError,
  govHubStartPayload,
  normalizePhoneInput,
  parseChoices,
} from '@/lib/phone-optin/phone-core';
import { phoneBadRequest, proxyGovHubPhone, readPhoneMutation } from '@/lib/phone-optin/phone-proxy.server';

/** POST { phone, alerts, channels, announcements, agree }: Gov Hub checks the number and texts a one-time code. */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { body, error } = await readPhoneMutation(request);
  if (error) return error;
  const phone = normalizePhoneInput(body.phone);
  if (!phone) return phoneBadRequest(MSG_PHONE_REQUIRED);
  const choices = parseChoices(body);
  const problem = choicesError(choices);
  if (problem) return phoneBadRequest(problem);
  return proxyGovHubPhone('/start', 'POST', govHubStartPayload(phone, choices));
}
