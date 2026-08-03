import { NextResponse } from 'next/server';
import { publicBlueberriesPayload } from '@/lib/dp-blueberries-store';

export async function GET() {
  const payload = await publicBlueberriesPayload();
  return NextResponse.json({ ok: true, ...payload });
}
