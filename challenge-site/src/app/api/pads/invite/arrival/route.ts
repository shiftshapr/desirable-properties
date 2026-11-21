import { NextResponse } from 'next/server';
import { clientIpFromHeaders } from '@/lib/ack-request';
import { allowHit } from '@/lib/listening/rate-limit.server';
import { parsePadRef, parseRef } from '@/lib/pads/pad-invite-core';
import { countArrival } from '@/lib/pads/pad-invite.server';

/** Counts one arrival from an invite link ({kind, key, ref}). Counts per pad, channel and day only. */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const pad = parsePadRef(body);
  const channel = parseRef(body.ref);
  if (!pad || !channel) return NextResponse.json({ ok: false }, { status: 400 });
  if (!allowHit(`pad-invite-arrival:${clientIpFromHeaders(request.headers)}`, 20, 60_000)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }
  await countArrival(pad.kind, pad.key.toLowerCase(), channel).catch(() => undefined);
  return NextResponse.json({ ok: true });
}
