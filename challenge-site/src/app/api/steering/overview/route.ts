import { passThrough, requireSteeringSession, steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';

/** Every DP and front-matter document with its progress in the open pass (Gov Hub, anyone signed in). */
export async function GET() {
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth.response;
  return passThrough(await steeringFetch(steeringPaths.overview(), auth.idToken));
}
