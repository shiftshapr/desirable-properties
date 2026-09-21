import { NextResponse } from 'next/server';
import { readAstraChapterBundle } from '@/lib/astra-corpus.server';
import {
  fetchWorkgroupChapterEdits,
  isWorkgroupChapterEditDbConfigured,
} from '@/lib/workgroup-chapter-edit-store';

type RouteContext = { params: Promise<{ id: string }> };

function parseDpKey(raw: string | null): string | null {
  const key = String(raw || '').trim().toLowerCase();
  return /^dp\d{2}$/.test(key) ? key : null;
}

const EDIT_TAB_RETIRED = {
  error:
    'Workgroup Edit-tab suggestions are retired. Propose PATCH or INSERT on book Discuss or a Gov Hub draft.',
};

export async function GET(request: Request, ctx: RouteContext) {
  const { id: workgroupId } = await ctx.params;
  if (!workgroupId?.trim()) {
    return NextResponse.json({ error: 'workgroup id required' }, { status: 400 });
  }

  const url = new URL(request.url);
  const dpKey = parseDpKey(url.searchParams.get('dpKey'));
  if (!dpKey) {
    return NextResponse.json({ error: 'dpKey required (e.g. dp01)' }, { status: 400 });
  }

  if (!isWorkgroupChapterEditDbConfigured()) {
    const bundle = readAstraChapterBundle(dpKey);
    const baseMarkdown = bundle?.markdown || '';
    return NextResponse.json({
      edits: [],
      effectiveMarkdown: baseMarkdown,
      baseMarkdown,
      hasMemberEdits: false,
      pendingCount: 0,
    });
  }

  const bundle = readAstraChapterBundle(dpKey);
  const baseMarkdown = bundle?.markdown || '';
  const list = await fetchWorkgroupChapterEdits(workgroupId, dpKey, baseMarkdown);
  return NextResponse.json(list, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST() {
  return NextResponse.json(EDIT_TAB_RETIRED, { status: 410 });
}

export async function PATCH() {
  return NextResponse.json(EDIT_TAB_RETIRED, { status: 410 });
}
