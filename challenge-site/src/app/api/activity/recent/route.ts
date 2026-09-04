import { NextResponse } from 'next/server';
import { fetchUnifiedActivity } from '@/lib/activity-feed';

export async function GET() {
  const items = await fetchUnifiedActivity(8);
  // Public-safe copy; unified feed masks email-like actor names before respond.
  return NextResponse.json(
    { items },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    },
  );
}
