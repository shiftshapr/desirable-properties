import { passThrough, requireSteeringSession, steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';

type Ctx = { params: Promise<{ finding: string }> };

/** Comment on a cross-DP finding. {body} */
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth.response;
  const { finding } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return passThrough(
    await steeringFetch(steeringPaths.issueComments(finding.slice(0, 160)), auth.idToken, {
      method: 'POST',
      body: JSON.stringify({ body: typeof body.body === 'string' ? body.body.slice(0, 4000) : undefined }),
    }),
  );
}
