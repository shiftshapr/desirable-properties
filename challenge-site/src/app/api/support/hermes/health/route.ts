import { NextResponse } from 'next/server';
import { hermesAuthorized } from '@/lib/support-hermes-auth';

export async function GET(request: Request) {
  if (!hermesAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const checkedAt = new Date().toISOString();
  const base = String(process.env.DP_PUBLIC_BASE || 'https://desirableproperties.org').replace(/\/$/, '');
  let dpSiteOk = false;
  try {
    const res = await fetch(`${base}/support`, { signal: AbortSignal.timeout(8000) });
    dpSiteOk = res.ok;
  } catch {
    dpSiteOk = false;
  }

  const ok = dpSiteOk;
  return NextResponse.json({
    ok,
    checkedAt,
    likelyPlatformOutage: !dpSiteOk,
    failedServices: dpSiteOk ? [] : ['dpSite'],
    services: {
      dpSite: { reachable: dpSiteOk, url: base },
    },
  });
}
