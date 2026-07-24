import { NextResponse } from 'next/server';

const HERMES_CHAT_URL = (process.env.HERMES_CHAT_URL || 'http://127.0.0.1:8790').replace(/\/$/, '');
const HERMES_CHAT_SECRET = process.env.HERMES_CHAT_SECRET || process.env.METAWEB_OPS_SECRET || '';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (HERMES_CHAT_SECRET) {
      headers['X-Hermes-Chat-Secret'] = HERMES_CHAT_SECRET;
    }

    const upstream = await fetch(`${HERMES_CHAT_URL}/api/dp/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: body.message,
        history: body.history || [],
        dpFocus: body.dpFocus ?? null,
        surface: body.surface || 'app.themetalayer.org',
        sessionId: body.sessionId || null,
        documents: body.documents || [],
      }),
      signal: AbortSignal.timeout(95000),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error || 'Hermes unavailable' },
        { status: upstream.status },
      );
    }

    return NextResponse.json({
      response: data.response,
      source: data.source || 'hermes',
      agent: 'hermes',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Chat request failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
