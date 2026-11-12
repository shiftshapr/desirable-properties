import { passThrough, requireSteeringSession, steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';

/**
 * Close the open stage (Gov Hub saves its record) and open the next. Steering members only.
 * defer_remaining defers any proposals still open to 1.1 as part of closing.
 */
export async function POST(request: Request) {
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth.response;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const text = (k: string, max: number) => (typeof body[k] === 'string' ? (body[k] as string).slice(0, max) : undefined);
  return passThrough(
    await steeringFetch(steeringPaths.closeStage(), auth.idToken, {
      method: 'POST',
      body: JSON.stringify({
        stage_key: text('stage_key', 40),
        note: text('note', 4000),
        defer_remaining: body.defer_remaining === true,
      }),
    }),
  );
}
