import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';

export async function requireSeriesAuth() {
  const session = await readSession();
  if (!session?.userId) {
    return {
      ok: false as const,
      response: NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 }),
    };
  }
  return { ok: true as const, session };
}
