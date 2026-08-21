import { NextResponse } from 'next/server';
import { proxyGovHubJson } from '@/lib/govhub-proxy';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = (url.searchParams.get('q') || '').trim();
  if (q.length < 2) {
    return NextResponse.json({ users: [], count: 0 });
  }

  const params = new URLSearchParams({ q });
  return proxyGovHubJson(`/api/users/search/?${params.toString()}`, {
    requireAuth: true,
  });
}
