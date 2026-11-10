import { passThrough, requireSteeringSession, steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';

/** Every DP and front-matter document with its steering progress (Gov Hub, steering only). */
export async function GET() {
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth.response;
  return passThrough(await steeringFetch(steeringPaths.overview(), auth.idToken));
}
