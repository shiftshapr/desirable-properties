import { NextResponse } from 'next/server';
import {
  listPastEventEntries,
  listUpcomingEventEntries,
} from '@/lib/dp-event-series-store';

const ALLOWED_ORIGINS = new Set([
  'https://themetalayer.org',
  'http://themetalayer.org',
  'http://216.238.91.120',
  'https://216.238.91.120',
]);

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin');
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export async function GET(request: Request) {
  const now = new Date();
  const [upcoming, past] = await Promise.all([
    listUpcomingEventEntries(now),
    listPastEventEntries(now),
  ]);

  return NextResponse.json(
    {
      ok: true,
      source: 'desirableproperties.org',
      updatedAt: now.toISOString(),
      upcoming,
      past,
    },
    { headers: corsHeaders(request) },
  );
}
