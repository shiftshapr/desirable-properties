import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { readSessionFromCookieValue, SESSION_COOKIE } from '@/lib/auth-session';
import {
  buildBroadcastAudience,
  getBroadcastArchiveEntry,
  isWorkgroupParticipant,
  renderArchiveForViewer,
} from '@/lib/dp-broadcast-store';

type RouteContext = { params: Promise<{ id: string }> };

async function requireArchiveViewer() {
  const cookieStore = await cookies();
  const session = await readSessionFromCookieValue(cookieStore.get(SESSION_COOKIE)?.value);
  if (!session?.userId) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { ok: false, error: 'auth_required', message: 'Sign in to view the archive.' },
        { status: 401 },
      ),
    };
  }

  const isMember = await isWorkgroupParticipant(session.userId);
  if (!isMember) {
    return {
      ok: false as const,
      response: NextResponse.json(
        {
          ok: false,
          error: 'forbidden',
          message: 'Workgroup membership is required to view the archive.',
        },
        { status: 403 },
      ),
    };
  }

  const audience = await buildBroadcastAudience();
  const viewer =
    audience.find((row) => row.userId === session.userId) ||
    ({
      key: session.userId,
      userId: session.userId,
      userName: session.displayName || session.username || 'Participant',
      email: session.email || null,
      workgroups: [],
      workgroupIds: [],
      joinedAt: null,
    } as const);

  return { ok: true as const, viewer };
}

export async function GET(_request: Request, context: RouteContext) {
  const auth = await requireArchiveViewer();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const entry = await getBroadcastArchiveEntry(id);
  if (!entry) {
    return NextResponse.json(
      { ok: false, error: 'not_found', message: 'Update not found.' },
      { status: 404 },
    );
  }

  const rendered = renderArchiveForViewer(entry, auth.viewer);
  return NextResponse.json({
    ok: true,
    entry: {
      id: entry.id,
      sentAt: entry.sentAt,
      subject: rendered.subject,
      html: rendered.html,
    },
  });
}
