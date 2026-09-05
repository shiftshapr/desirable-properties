import { NextResponse } from 'next/server';
import {
  activeAstraReleaseId,
  readAstraChapterBundle,
  readAstraReleaseManifest,
} from '@/lib/astra-corpus.server';
import { validateAstraHighlights } from '@/lib/astra-highlights';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ dpKey: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { dpKey: rawKey } = await context.params;
  const dpKey = String(rawKey || '').trim().toLowerCase();
  if (!/^dp\d{2}$/.test(dpKey)) {
    return NextResponse.json({ error: 'Invalid chapter key' }, { status: 400 });
  }

  try {
    const releaseId = activeAstraReleaseId();
    const releaseManifest = readAstraReleaseManifest(releaseId);
    const indexEntry = releaseManifest.chapters.find((entry) => entry.dpKey === dpKey);
    if (!indexEntry || indexEntry.status !== 'available') {
      return NextResponse.json({ error: 'Chapter not yet available' }, { status: 404 });
    }

    const bundle = readAstraChapterBundle(dpKey, releaseId);
    if (!bundle) {
      return NextResponse.json({ error: 'Chapter files missing' }, { status: 404 });
    }

    const highlightErrors = validateAstraHighlights(bundle.markdown, bundle.manifest.changes);
    if (highlightErrors.length > 0) {
      return NextResponse.json(
        { error: 'Chapter highlight validation failed', details: highlightErrors },
        { status: 500 },
      );
    }

    return NextResponse.json(bundle);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Chapter unavailable';
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
