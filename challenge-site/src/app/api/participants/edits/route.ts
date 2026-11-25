import { NextResponse } from 'next/server';
import { clientIpFromHeaders } from '@/lib/ack-request';
import { PARTICIPANT_EDIT_ORIGINS, readParticipantEdit } from '@/lib/participant-edits';
import { createParticipantEdit, participantEditAddressKey } from '@/lib/participant-edits-store.server';

// The participants page lives on another site (themetalayer.org), so its form posts across origins.
function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin');
  if (!origin || !PARTICIPANT_EDIT_ORIGINS.has(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  const headers = corsHeaders(request);
  const fail = (error: string, message: string, status = 400) =>
    NextResponse.json({ ok: false, error, message }, { status, headers });

  const raw = await request.text().catch(() => '');
  if (raw.length > 20_000) return fail('too_large', 'That is too long to send.', 413);
  let body: unknown = {};
  try {
    body = JSON.parse(raw);
  } catch {
    return fail('bad_json', 'The form could not be read.');
  }

  const read = readParticipantEdit(body);
  if (!read.ok) return fail(read.error, read.message);
  if (read.bot) return NextResponse.json({ ok: true }, { headers });

  const result = await createParticipantEdit(read.value, {
    origin: request.headers.get('origin'),
    addressKey: participantEditAddressKey(clientIpFromHeaders(request.headers)),
  });
  if (!result.ok) {
    return result.error === 'too_many'
      ? fail('too_many', 'Too many submissions for now. Please try again in an hour, or reply by email.', 429)
      : fail('unavailable', 'Edits cannot be saved right now. Please reply by email instead.', 503);
  }
  return NextResponse.json({ ok: true, id: result.id }, { headers });
}
