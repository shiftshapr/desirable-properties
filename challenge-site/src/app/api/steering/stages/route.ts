import { readSession } from '@/lib/auth-session';
import { passThrough, steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';

/** Every steering stage (public; the open stage's counts only for a signed-in viewer). */
export async function GET() {
  const session = await readSession();
  return passThrough(await steeringFetch(steeringPaths.stages(), session?.idToken || null));
}
