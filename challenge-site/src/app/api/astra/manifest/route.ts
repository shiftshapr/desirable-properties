import { NextResponse } from 'next/server';
import { activeAstraReleaseId, readAstraReleaseManifest } from '@/lib/astra-corpus.server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const manifest = readAstraReleaseManifest(activeAstraReleaseId());
    return NextResponse.json(manifest);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Manifest unavailable';
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
