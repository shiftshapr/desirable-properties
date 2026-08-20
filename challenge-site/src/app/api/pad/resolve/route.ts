import { NextResponse } from 'next/server';
import { resolvePadLookup } from '@/lib/hermes-onboard/pad-lookup';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get('input')?.trim() ?? '';
  const result = resolvePadLookup(input);
  return NextResponse.json(result);
}
