import { NextResponse } from 'next/server';
import { readSession } from '@/lib/auth-session';
import { getGovHubBaseUrl } from '@/lib/web3auth-config';

export async function GET() {
  const session = await readSession();
  if (!session?.idToken) {
    return NextResponse.json({ welcomes: [], count: 0, authenticated: false });
  }

  try {
    const res = await fetch(`${getGovHubBaseUrl()}/api/me/dp-welcome/`, {
      headers: { Authorization: `Bearer ${session.idToken}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return NextResponse.json({ welcomes: [], count: 0, authenticated: true });
    }
    const data = (await res.json()) as { welcomes?: unknown[]; count?: number };
    return NextResponse.json({
      authenticated: true,
      welcomes: data.welcomes ?? [],
      count: data.count ?? 0,
    });
  } catch {
    return NextResponse.json({ welcomes: [], count: 0, authenticated: true });
  }
}
