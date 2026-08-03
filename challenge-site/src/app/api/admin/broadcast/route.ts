import { NextResponse } from 'next/server';
import { requireDpAdmin, jsonError } from '@/lib/dp-admin-api';
import {
  buildBroadcastAudience,
  listBroadcastLog,
  sendBroadcast,
  getBroadcastLogEntry,
  previewBroadcastHtml,
} from '@/lib/dp-broadcast-store';

export async function GET(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const view = searchParams.get('view');

  if (view === 'audience') {
    const audience = await buildBroadcastAudience({
      q: searchParams.get('q') || undefined,
      workgroup: searchParams.get('workgroup') || undefined,
    });
    return NextResponse.json({ ok: true, audience, count: audience.length });
  }

  if (view === 'log') {
    const limit = Number(searchParams.get('limit') || 50);
    const offset = Number(searchParams.get('offset') || 0);
    const log = await listBroadcastLog(limit, offset);
    return NextResponse.json({ ok: true, ...log });
  }

  const id = searchParams.get('id');
  if (id) {
    const entry = await getBroadcastLogEntry(id);
    if (!entry) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    return NextResponse.json({ ok: true, entry });
  }

  return jsonError('Unknown view.', 400, 'invalid_view');
}

export async function POST(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));

  if (body.action === 'preview') {
    const html = String(body.html || '');
    return NextResponse.json({ ok: true, html: previewBroadcastHtml(html) });
  }

  const result = await sendBroadcast({
    subject: body.subject,
    html: body.html,
    textBody: body.textBody,
    sentBy: auth.email,
    testMode: Boolean(body.testMode),
    testEmail: body.testEmail,
    recipientKeys: Array.isArray(body.recipientKeys) ? body.recipientKeys : undefined,
    audienceFilter: body.audienceFilter,
  });

  if (!result.ok) return jsonError('Broadcast failed.', 400, result.error);
  return NextResponse.json(result);
}
