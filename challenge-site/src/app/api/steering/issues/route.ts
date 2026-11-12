import { passThrough, requireSteeringSession, steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';

/** Stage 2 by issue: what the cross-DP check found, in its groups, with each fix (Gov Hub, anyone signed in). */
export async function GET() {
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth.response;
  return passThrough(await steeringFetch(steeringPaths.issues(), auth.idToken));
}
