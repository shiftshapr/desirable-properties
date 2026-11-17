import { NextResponse } from 'next/server';
import { govhubAck, isUuid, readViewCookie } from '@/lib/ack-request-access';

type RouteContext = { params: Promise<{ id: string; attachmentId: string }> };

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function text(message: string, status: number) {
  return new NextResponse(message, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store, private' },
  });
}

/**
 * An image attached to one of the viewer's own requests (?size=thumb for the small copy). Gov Hub
 * checks the viewer: the account the request was sent from, or a view token for its email.
 * Signed out with no link: 401; anyone else: 403. Never cached.
 */
export async function GET(request: Request, context: RouteContext) {
  const { id, attachmentId } = await context.params;
  if (!isUuid(id) || !isUuid(attachmentId)) return text('Not found.', 404);
  const thumb = new URL(request.url).searchParams.get('size') === 'thumb';
  let res: Response;
  try {
    res = await govhubAck(`${id}/attachments/${attachmentId}/${thumb ? '?size=thumb' : ''}`, {
      withSession: true,
      viewToken: readViewCookie(request),
      timeoutMs: 20000,
    });
  } catch {
    return text('We could not load this image just now.', 504);
  }
  const type = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!res.ok || !IMAGE_TYPES.has(type)) {
    const status = [401, 403, 404].includes(res.status) ? res.status : 502;
    const message =
      status === 401 ? 'Sign in, or open the link we emailed you, to see this image.'
        : status === 403 ? 'This image is for the person who sent the request and the reviewers.'
          : status === 404 ? 'Not found.' : 'We could not load this image just now.';
    return text(message, status);
  }
  return new NextResponse(res.body, {
    status: 200,
    headers: {
      'Content-Type': type,
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Referrer-Policy': 'no-referrer',
    },
  });
}
