import { choicesError, govHubChannelsPayload, parseChoices } from '@/lib/phone-optin/phone-core';
import { phoneBadRequest, proxyGovHubPhone, readPhoneMutation } from '@/lib/phone-optin/phone-proxy.server';

/** PUT { alerts, channels, announcements, agree }: change alert choices for the confirmed number. */
export const dynamic = 'force-dynamic';

export async function PUT(request: Request) {
  const { body, error } = await readPhoneMutation(request);
  if (error) return error;
  const choices = parseChoices(body);
  const problem = choicesError(choices);
  if (problem) return phoneBadRequest(problem);
  return proxyGovHubPhone('/channels', 'PUT', govHubChannelsPayload(choices));
}
