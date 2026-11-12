import { passThrough, requireSteeringSession, steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';

type Ctx = { params: Promise<{ finding: string }> };

/** Choose (POST {choice, note?}) or withdraw (DELETE) your choice on a cross-DP finding that needs a steering decision. */
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth.response;
  const { finding } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  return passThrough(
    await steeringFetch(steeringPaths.issueDecision(finding.slice(0, 160)), auth.idToken, {
      method: 'POST',
      body: JSON.stringify({
        choice: typeof body.choice === 'string' ? body.choice.slice(0, 20) : undefined,
        note: typeof body.note === 'string' ? body.note.slice(0, 4000) : undefined,
      }),
    }),
  );
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth.response;
  const { finding } = await params;
  return passThrough(await steeringFetch(steeringPaths.issueDecision(finding.slice(0, 160)), auth.idToken, { method: 'DELETE' }));
}
