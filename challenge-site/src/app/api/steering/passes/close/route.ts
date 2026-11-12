import { passThrough, requireSteeringSession, steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';

/** Close the open pass (Gov Hub saves its record) and open the next. Steering members only. */
export async function POST(request: Request) {
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth.response;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const text = (k: string, max: number) => (typeof body[k] === 'string' ? (body[k] as string).slice(0, max) : undefined);
  return passThrough(
    await steeringFetch(steeringPaths.closePass(), auth.idToken, {
      method: 'POST',
      body: JSON.stringify({
        pass_key: text('pass_key', 40),
        next_title: text('next_title', 120),
        next_description: text('next_description', 4000),
        note: text('note', 4000),
      }),
    }),
  );
}
