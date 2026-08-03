import { NextResponse } from 'next/server';
import { getActiveSiteModals, publicModalPayload } from '@/lib/dp-site-modals-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const site = searchParams.get('site') || 'all';
  const signedIn = searchParams.get('signedIn') === '1';

  const modals = await getActiveSiteModals(site, signedIn);
  return NextResponse.json({
    ok: true,
    modals: modals.map(publicModalPayload),
  });
}
