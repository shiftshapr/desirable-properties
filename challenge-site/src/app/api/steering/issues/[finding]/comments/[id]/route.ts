import { passThrough, requireSteeringSession, steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';

type Ctx = { params: Promise<{ finding: string; id: string }> };

/** Remove your own comment on a cross-DP finding. */
export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth.response;
  const { finding, id } = await params;
  return passThrough(
    await steeringFetch(steeringPaths.issueComment(finding.slice(0, 160), id.slice(0, 40)), auth.idToken, { method: 'DELETE' }),
  );
}
