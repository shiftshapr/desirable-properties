import { passThrough, requireSteeringSession, steeringFetch, steeringPaths } from '@/lib/dp-steering-govhub.server';

/** Import an analysis run (run.json) from the steering page. {run, apply}. Without apply: a dry run. */
export async function POST(request: Request) {
  const auth = await requireSteeringSession();
  if ('response' in auth) return auth.response;
  const body = (await request.json().catch(() => null)) as { run?: unknown; apply?: unknown } | null;
  if (!body || typeof body.run !== 'object' || body.run === null) {
    return Response.json({ error: 'Upload a run.json file.', code: 'bad_run' }, { status: 400 });
  }
  return passThrough(
    await steeringFetch(steeringPaths.importRun(), auth.idToken, {
      method: 'POST',
      body: JSON.stringify({ run: body.run, apply: body.apply === true }),
    }),
  );
}
