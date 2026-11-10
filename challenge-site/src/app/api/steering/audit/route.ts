import { NextResponse } from 'next/server';
import { passThrough, requireSteeringSession, steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';

/** The full steering record (runs, analyses, batches, votes, outcomes) as a JSON download. */
export async function GET() {
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth.response;
  const result = await steeringFetch(steeringPaths.audit(), auth.idToken);
  if (!result.ok) return passThrough(result);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  return new NextResponse(JSON.stringify(result.data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="dp-steering-audit-${stamp}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
