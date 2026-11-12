import { readSession } from '@/lib/auth-session';
import { passThrough, steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';

/** Every steering pass (public; the open pass's counts only for a signed-in viewer). */
export async function GET() {
  const session = await readSession();
  return passThrough(await steeringFetch(steeringPaths.passes(), session?.idToken || null));
}
