import { NextResponse } from 'next/server';
import { getCanopiApiBase } from '@/lib/canopi-api';

/** Same-origin proxy for Canopi `/v1/auth/refresh-embed` (metaweb-book pattern). */
export async function POST(request: Request) {
  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const userId = String(body.userId || body.user_id || '').trim();
  const embedToken = String(body.embedToken || body.token || '').trim();
  const authHeader = String(request.headers.get('authorization') || '').trim();

  const upstreamHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    upstreamHeaders.Authorization = authHeader;
  }

  const upstreamBody: Record<string, string> = {};
  if (embedToken) upstreamBody.embedToken = embedToken;
  if (userId) upstreamBody.userId = userId;

  try {
    const upstream = await fetch(`${getCanopiApiBase()}/v1/auth/refresh-embed`, {
      method: 'POST',
      headers: upstreamHeaders,
      body: JSON.stringify(upstreamBody),
      signal: AbortSignal.timeout(15000),
    });
    const json = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return NextResponse.json(json, { status: upstream.status });
    }
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: 'refresh_embed_failed',
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 502 },
    );
  }
}
