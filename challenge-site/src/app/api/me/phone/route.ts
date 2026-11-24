import { phoneRouteDisabled, proxyGovHubPhone, readPhoneMutation } from '@/lib/phone-optin/phone-proxy.server';

/** GET: the signed-in person's phone status (number masked to the last 4 digits). DELETE: remove the number. */
export const dynamic = 'force-dynamic';

export async function GET() {
  const off = phoneRouteDisabled();
  if (off) return off;
  return proxyGovHubPhone('', 'GET');
}

export async function DELETE(request: Request) {
  const { error } = await readPhoneMutation(request);
  if (error) return error;
  return proxyGovHubPhone('', 'DELETE', {});
}
