import { NextResponse } from 'next/server';
import { optOutEmail } from '@/lib/dp-broadcast-preferences-store';
import { publicBase } from '@/lib/pads/pad-email.server';
import { decodeOptOutToken } from '@/lib/pads/pad-invite-token';
import { padInviteSecret } from '@/lib/pads/pad-invite.server';

/**
 * The opt-out link in every pad invitation (GET from the email, POST for one-click List-Unsubscribe). The token is
 * the address encrypted by this server (pad-invite-token.ts); opting out adds it to dp_broadcast_email_optout, which
 * every Desirable Properties sender checks.
 */
export const dynamic = 'force-dynamic';

function page(ok: boolean): string {
  const title = ok ? 'You will get no more email from Desirable Properties' : 'This link did not work';
  const message = ok
    ? 'Your address is on our do-not-email list: no more invitations, updates or announcements. If someone invites you again, the site will not send it.'
    : 'This opt-out link is not valid. Use the support page and we will take your address off by hand.';
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${ok ? 'Opted out' : 'Could not opt out'} – Desirable Properties</title>
<style>body{font-family:system-ui,sans-serif;max-width:520px;margin:48px auto;padding:0 20px;color:#1a2332;line-height:1.5}h1{font-size:1.4rem}a{color:#0369a1}</style>
</head><body><h1>${title}</h1><p>${message}</p><p><a href="${publicBase()}/support">Support</a> · <a href="${publicBase()}/">Desirable Properties</a></p></body></html>`;
}

async function apply(request: Request): Promise<NextResponse> {
  const token = new URL(request.url).searchParams.get('t') || '';
  const email = decodeOptOutToken(token, padInviteSecret());
  const ok = email ? (await optOutEmail(email, { source: 'pad_invite' }).catch(() => ({ ok: false }))).ok : false;
  return new NextResponse(page(ok), {
    status: ok ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}

export const GET = apply;
export const POST = apply;
