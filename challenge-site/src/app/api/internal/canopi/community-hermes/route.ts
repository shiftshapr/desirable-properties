import { timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { createHermesCommunityThread } from '@/lib/embed-hermes-community';

function internalSecretOk(request: Request): boolean {
  const expected =
    process.env.CANOPI_DP_INTERNAL_SECRET?.trim() ||
    process.env.METAWEB_OPS_SECRET?.trim() ||
    '';
  if (!expected) return false;
  const auth = String(request.headers.get('authorization') || '').trim();
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token || token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return token === expected;
  }
}

/** Server-to-server: Canopi creates Community Hermes Neo4j group thread for a Canopi user. */
export async function POST(request: Request) {
  if (!internalSecretOk(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const canopiUserId = String(body.canopiUserId || body.userId || '').trim();
    const email = body.email ? String(body.email).trim().toLowerCase() : null;
    const groupTitle = String(body.groupTitle || body.name || 'Community Chat').trim().slice(0, 120);
    const surface = String(body.surface || 'desirableproperties.org/embed/community').slice(0, 80);
    const boundPageUrl = body.boundPageUrl ? String(body.boundPageUrl).trim() : null;
    const displayName = body.displayName ? String(body.displayName).trim() : null;

    const verifierId = email && email.includes('@') ? email : canopiUserId;
    if (!verifierId) {
      return NextResponse.json({ error: 'verifier_required' }, { status: 400 });
    }

    const thread = await createHermesCommunityThread({
      verifierId,
      displayName,
      canopiUserId: canopiUserId || null,
      groupTitle,
      surface: boundPageUrl
        ? String(boundPageUrl).replace(/^https?:\/\//, '').slice(0, 80)
        : surface,
      boundPageUrl,
    });

    return NextResponse.json({ ok: true, thread });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'create_failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
