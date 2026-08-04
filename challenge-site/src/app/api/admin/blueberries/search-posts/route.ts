import { NextResponse } from 'next/server';
import { requireDpAdmin, jsonError } from '@/lib/dp-admin-api';
import { searchCanopiPosts } from '@/lib/dp-canopi-search';

export async function POST(request: Request) {
  const auth = await requireDpAdmin();
  if (!auth.ok) return auth.response;

  const body = await request.json().catch(() => ({}));
  const result = await searchCanopiPosts({
    pageId: body.pageId != null ? String(body.pageId) : undefined,
    q: body.q != null ? String(body.q) : body.search != null ? String(body.search) : undefined,
    authorName: body.authorName != null ? String(body.authorName) : body.author != null ? String(body.author) : undefined,
    communityId: body.communityId != null ? String(body.communityId) : undefined,
    limit: body.limit != null ? Number(body.limit) : undefined,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error, posts: [] }, { status: 502 });
  }
  return NextResponse.json({ ok: true, posts: result.posts });
}
