import { passThrough, requireSteeringSession, steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';

/**
 * Open the next stage alongside the open one, so what the open stage accepts is reviewed there as it
 * is accepted. Gov Hub allows it only for Stage 2 while Stage 1 is open. Steering members only.
 */
export async function POST(request: Request) {
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth.response;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return passThrough(
    await steeringFetch(steeringPaths.openNextStage(), auth.idToken, {
      method: 'POST',
      body: JSON.stringify({ stage_key: typeof body.stage_key === 'string' ? body.stage_key.slice(0, 40) : undefined }),
    }),
  );
}
