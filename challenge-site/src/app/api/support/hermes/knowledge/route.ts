import { NextResponse } from 'next/server';
import { hermesAuthorized } from '@/lib/support-hermes-auth';
import { readSupportKnowledgeBundle } from '@/lib/support-knowledge';
import { dpPublicBase } from '@/lib/support-store';

export async function GET(request: Request) {
  if (!hermesAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const { runbooks, agentPrompt } = readSupportKnowledgeBundle();
  return NextResponse.json({
    ok: true,
    baseUrl: dpPublicBase(),
    agentPrompt,
    ...runbooks,
  });
}
