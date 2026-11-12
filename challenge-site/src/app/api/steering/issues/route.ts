import { passThrough, requireSteeringSession, steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';

/** A review stage's findings in their bundles, with each fix (Gov Hub, anyone signed in). ?stage=<key> picks the stage. */
export async function GET(request: Request) {
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth.response;
  const stage = new URL(request.url).searchParams.get('stage')?.replace(/[^a-z0-9-]/gi, '').slice(0, 40) || undefined;
  return passThrough(await steeringFetch(steeringPaths.issues(stage), auth.idToken));
}
