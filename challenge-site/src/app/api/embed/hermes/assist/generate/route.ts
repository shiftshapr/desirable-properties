import { NextResponse } from 'next/server';
import {
  embedCanopiUserFromBody,
  verifyEmbedHermesProxy,
} from '@/lib/embed-hermes-proxy-auth';
import {
  buildAssistHermesMessage,
  callHermesForEmbed,
} from '@/lib/embed-hermes-assist';

export async function POST(request: Request) {
  if (!verifyEmbedHermesProxy(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, context, userPrompt } = body as {
      action?: string;
      context?: Record<string, unknown>;
      userPrompt?: string;
    };

    if (!action || !context) {
      return NextResponse.json({ error: 'action and context are required' }, { status: 400 });
    }

    const canopiUser = embedCanopiUserFromBody(body as Record<string, unknown>);
    const { message, dpFocus, surface } = buildAssistHermesMessage({
      action,
      context: context as Parameters<typeof buildAssistHermesMessage>[0]['context'],
      userPrompt,
    });

    const draft = await callHermesForEmbed({
      message,
      surface,
      dpFocus,
      canopiUser,
      skipMemoryRecord: true,
    });

    return NextResponse.json({
      ok: true,
      draft,
      action,
      aiAssisted: true,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Assist generation failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
