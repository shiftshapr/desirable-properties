import { NextResponse } from 'next/server';
import { verifySvixWebhook } from '@/lib/svix-verify';

export async function POST(request: Request) {
  const secret = String(process.env.RESEND_WEBHOOK_SECRET || '').trim();
  if (!secret) {
    return NextResponse.json({ ok: true, ignored: 'webhook_not_configured' });
  }

  const payload = await request.text();
  const verified = verifySvixWebhook(payload, request.headers, secret);
  if (!verified.ok) {
    console.warn('[resend-webhook] verify failed:', verified.error);
    return new NextResponse('Invalid webhook', { status: 400 });
  }

  const event = verified.event;
  const type = String(event.type || '').trim();
  const data = event.data && typeof event.data === 'object' ? (event.data as Record<string, unknown>) : {};
  const resendEmailId = data.email_id || data.emailId || null;

  if (type === 'email.sent' || type === 'email.delivered') {
    console.info('[resend-webhook]', type, {
      resendEmailId,
      from: data.from || null,
      to: data.to || null,
      subject: data.subject || null,
    });
    return NextResponse.json({ ok: true, logged: type });
  }

  if (type !== 'email.opened' && type !== 'email.clicked') {
    return NextResponse.json({ ok: true, ignored: type || 'unknown' });
  }

  const tags = data.tags && typeof data.tags === 'object' ? (data.tags as Record<string, string>) : {};
  const broadcastId = tags.broadcast_id || tags.broadcastId || null;
  const canopiUserId = tags.canopi_user_id || tags.canopiUserId || null;

  console.info('[resend-webhook]', type, {
    broadcastId,
    canopiUserId,
    resendEmailId,
  });

  return NextResponse.json({ ok: true, type, broadcastId, canopiUserId });
}
