import { NextResponse } from 'next/server';
import {
  activeAstraReleaseId,
  isAstraReleaseDocName,
  readAstraReleaseDoc,
} from '@/lib/astra-corpus.server';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ name: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { name: rawName } = await context.params;
  const name = String(rawName || '').trim().toLowerCase();

  if (!isAstraReleaseDocName(name)) {
    return NextResponse.json({ error: 'Invalid document name' }, { status: 400 });
  }

  try {
    const doc = readAstraReleaseDoc(name, activeAstraReleaseId());
    if (doc.contentType === 'json') {
      return NextResponse.json({
        name: doc.name,
        filename: doc.filename,
        contentType: doc.contentType,
        content: JSON.parse(doc.text),
      });
    }
    return NextResponse.json({
      name: doc.name,
      filename: doc.filename,
      contentType: doc.contentType,
      content: doc.text,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Document unavailable';
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
