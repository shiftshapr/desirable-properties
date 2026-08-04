import { NextResponse } from 'next/server';
import { readBroadcastImage } from '@/lib/dp-broadcast-images';

type RouteContext = { params: Promise<{ fileId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { fileId } = await context.params;
  const result = readBroadcastImage(fileId);
  if (!result.ok) {
    return new NextResponse(null, { status: result.status || 404 });
  }

  const headers = new Headers({
    'Content-Type': result.mime,
    'Cache-Control': 'public, max-age=31536000, immutable',
  });
  if (result.etag) headers.set('ETag', result.etag);

  return new NextResponse(result.bytes, { status: 200, headers });
}
