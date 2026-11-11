import { NextResponse } from 'next/server';
import { normalizeMl } from '@/lib/dp-steering';
import { requireSteeringSession } from '@/lib/dp-steering-govhub.server';
import {
  listSteeringNotes,
  MAX_NOTE,
  postSteeringNote,
  removeSteeringNote,
  viewerIsSteering,
} from '@/lib/steering-notes.server';

const NO_STORE = { 'Cache-Control': 'no-store' };

/** The signed-in viewer, if Gov Hub has them on the steering committee. */
async function steeringViewer() {
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth;
  if (!(await viewerIsSteering(auth.idToken))) {
    return { response: NextResponse.json({ error: 'Only steering committee members can read these notes.' }, { status: 403 }) };
  }
  return auth;
}

export async function GET() {
  const v = await steeringViewer();
  if ('response' in v) return v.response;
  try {
    return NextResponse.json({ ok: true, notes: await listSteeringNotes(v.userId) }, { headers: NO_STORE });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not load notes' }, { status: 500 });
  }
}

/** Post a note: { body, ml? } (ml is the document it was written from). */
export async function POST(request: Request) {
  const v = await steeringViewer();
  if ('response' in v) return v.response;
  const data = (await request.json().catch(() => ({}))) as { body?: string; ml?: string };
  const body = String(data.body || '').trim();
  if (!body) return NextResponse.json({ error: 'Write a note first.' }, { status: 400 });
  if (body.length > MAX_NOTE) return NextResponse.json({ error: `Keep a note under ${MAX_NOTE} characters.` }, { status: 400 });
  try {
    const note = await postSteeringNote({ userId: v.userId, userName: v.name, mlNumber: normalizeMl(data.ml), body });
    return NextResponse.json({ ok: true, note }, { headers: NO_STORE });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Could not post' }, { status: 500 });
  }
}

/** Remove one of your own notes: ?id=<note id>. */
export async function DELETE(request: Request) {
  const v = await steeringViewer();
  if ('response' in v) return v.response;
  const id = new URL(request.url).searchParams.get('id')?.trim();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const ok = await removeSteeringNote(id, v.userId).catch(() => false);
  return ok
    ? NextResponse.json({ ok: true }, { headers: NO_STORE })
    : NextResponse.json({ error: 'That note is not yours, or it is already removed.' }, { status: 404 });
}
