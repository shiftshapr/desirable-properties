import { NextResponse } from 'next/server';
import {
  embedCanopiUserFromBody,
  verifyEmbedHermesProxy,
} from '@/lib/embed-hermes-proxy-auth';
import {
  buildAgentHermesMessage,
  callHermesForEmbed,
} from '@/lib/embed-hermes-assist';

export async function POST(request: Request) {
  if (!verifyEmbedHermesProxy(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { message, context, pageContent } = body as {
      message?: string;
      context?: Record<string, unknown>;
      pageContent?: {
        title?: string;
        url?: string;
        content?: { full?: string; chunks?: string[] };
        metadata?: Record<string, unknown>;
      };
    };

    if (!message || !String(message).trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const canopiUser = embedCanopiUserFromBody(body as Record<string, unknown>);
    const { message: hermesMessage, dpFocus, surface } = buildAgentHermesMessage({
      message: String(message),
      context,
      pageContent,
    });

    const response = await callHermesForEmbed({
      message: hermesMessage,
      surface,
      dpFocus,
      canopiUser,
      skipMemoryRecord: false,
    });

    return NextResponse.json({
      response,
      context: {
        pageTitle: context?.pageTitle || pageContent?.title || 'Current Page',
        hasContext: Boolean(pageContent?.content?.full || context?.relevantContent),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Agent request failed';
    return NextResponse.json({ error: 'Failed to get AI response', details: msg }, { status: 502 });
  }
}
