import { NextResponse } from 'next/server';
import { landingPadsEnabled } from '@/lib/landing-pads/flag';
import { resolvePadLookup } from '@/lib/hermes-onboard/pad-lookup-server';

export async function GET(request: Request) {
  if (!landingPadsEnabled()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const { searchParams } = new URL(request.url);
  const input = searchParams.get('input')?.trim() ?? '';
  const result = resolvePadLookup(input);
  return NextResponse.json(result);
}
