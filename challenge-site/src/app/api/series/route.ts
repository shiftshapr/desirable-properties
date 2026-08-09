import { NextResponse } from 'next/server';
import { listEventSeries } from '@/lib/dp-event-series-store';

export async function GET() {
  const series = await listEventSeries(true);
  return NextResponse.json({ ok: true, series, count: series.length });
}
