import { councilApiPaths } from '@/lib/council';
import { councilProxy } from '@/lib/council.server';

export const dynamic = 'force-dynamic';

/** Public: the DP Council (purpose, members, elections). */
export async function GET() {
  return councilProxy(councilApiPaths().council(), { requireAuth: false });
}
