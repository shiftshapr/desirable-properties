import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { DP_COMMUNITY_AI_ERRORS, DP_COMMUNITY_AI_REALM } from '@/lib/dp-community-ai';
import { hermesUpstreamHeaders } from '@/lib/hermes-proxy';
import { getHermesChatUrl } from '@/lib/web3auth-config';

function chatUpstreamSignal(clientSignal: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(180000);
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any([clientSignal, timeout]);
  }
  return clientSignal;
}

/** Upper bound on page context (characters); a meeting transcript is about 90 000. */
const CONTEXT_MAX_CHARS = 400_000;

type PageContext = { title: string; text: string };

function pageContext(raw: unknown): PageContext | null {
  if (!raw || typeof raw !== 'object') return null;
  const { title, text } = raw as { title?: unknown; text?: unknown };
  if (typeof title !== 'string' || typeof text !== 'string' || !text.trim()) return null;
  return { title: title.slice(0, 200), text: text.slice(0, CONTEXT_MAX_CHARS) };
}

function contextDocument(c: PageContext): { name: string; contentBase64: string } {
  const slug = c.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'page';
  return {
    name: `page-context-${slug}.md`,
    contentBase64: Buffer.from(`# ${c.title}\n\n${c.text}`, 'utf8').toString('base64'),
  };
}

export async function POST(request: Request) {
  try {
    const session = await readSession();
    if (!session) {
      return NextResponse.json({ error: 'Sign in required to send messages' }, { status: 401 });
    }

    const body = await request.json();
    const context = pageContext(body.context);

    const headers = hermesUpstreamHeaders();
    const upstream = await fetch(`${getHermesChatUrl()}/api/dp/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message: body.message,
        history: body.history || [],
        dpFocus: body.dpFocus ?? null,
        realm: body.realm || DP_COMMUNITY_AI_REALM,
        surface: body.surface || 'desirableproperties.org/agent',
        sessionId: body.sessionId || null,
        threadId: body.threadId || null,
        verifierId: session.verifierId,
        displayName: session.displayName || null,
        govHubUserId: session.userId,
        // Page context (session pages, proposal pads): passed as `context` and as a Markdown document, which
        // Hermes already reads, so it works whether or not the upstream knows the `context` field.
        context,
        // Hermes takes at most 3 documents per message (HERMES_DOC_MAX_COUNT); the viewer's own uploads come first.
        documents:
          context && (body.documents || []).length < 3
            ? [...(body.documents || []), contextDocument(context)]
            : body.documents || [],
        skipMemoryRecord: Boolean(body.skipMemoryRecord),
      }),
      signal: chatUpstreamSignal(request.signal),
    });

    const raw = await upstream.text();
    let data: { error?: string; response?: string } = {};
    if (raw) {
      try {
        data = JSON.parse(raw);
      } catch {
        return NextResponse.json(
          { error: upstream.ok ? DP_COMMUNITY_AI_ERRORS.invalid_response : DP_COMMUNITY_AI_ERRORS.unavailable },
          { status: upstream.ok ? 502 : upstream.status || 502 },
        );
      }
    }
    if (!upstream.ok) {
      return NextResponse.json(
        { error: data.error || DP_COMMUNITY_AI_ERRORS.unavailable },
        { status: upstream.status },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
      if (err.name === 'AbortError' && !/timeout/i.test(err.message)) {
        return NextResponse.json({ error: 'Aborted' }, { status: 499 });
      }
      return NextResponse.json(
        { error: 'Deepi timed out. Send the message again.' },
        { status: 504 },
      );
    }
    const message = err instanceof Error ? err.message : 'Chat request failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
